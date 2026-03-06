"""
独立脚本：读取本地 JSON 数据 → Zhipu OCR → Qwen 结构化 → BigQuery 入库
不依赖 MediaCrawler 内部模块，可直接运行。

用法：
    python process_local_data.py
    python process_local_data.py --dry-run   # 只 OCR+LLM, 不写入 BigQuery
    python process_local_data.py --limit 5   # 只处理前5条
"""

import os
import sys
import json
import base64
import asyncio
import time
import argparse
import logging
from pathlib import Path
from typing import Optional

import httpx
from zhipuai import ZhipuAI
from google.oauth2 import service_account
from google.cloud import bigquery

# ─────────────────────── 配置区 ──────────────────────── #
BASE_DIR = Path(__file__).resolve().parent

DATA_JSON     = BASE_DIR / "MediaCrawler" / "data" / "xhs" / "json" / "creator_contents_2026-03-05.json"
IMAGES_DIR    = BASE_DIR / "MediaCrawler" / "data" / "xhs" / "images"
PROGRESS_FILE = BASE_DIR / "data" / "processed_corpus_ids.txt"
FAILED_FILE   = BASE_DIR / "data" / "failed_corpus_ids.txt"

ZHIPU_API_KEY      = "aa934c3e68d6488f9c2ba01140a7d4fe.RoH3UTBlKIJU509d"
DASHSCOPE_API_KEY  = "sk-e3f51358bd25481996c313991aa7af3c"
QWEN_API_URL       = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
QWEN_MODEL         = "qwen-plus"   # 结构化生成用 qwen-plus 节省额度

BQ_KEY_PATH    = str(BASE_DIR / "sturdy-lore-480006-e6-72d725e6eec7.json")
BQ_PROJECT_ID  = "sturdy-lore-480006-e6"
BQ_DATASET_ID  = "corpus_data"
BQ_TABLE_ID    = "xhs_structured_corpus"
BQ_TABLE_REF   = f"{BQ_PROJECT_ID}.{BQ_DATASET_ID}.{BQ_TABLE_ID}"
# ─────────────────────────────────────────────────────── #

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("pipeline")


# ════════════════════════════════════════════════════════
#  重试装饰器（指数退避，无需额外依赖）
# ════════════════════════════════════════════════════════
def retry(max_attempts=3, base_delay=2.0, exceptions=(Exception,)):
    """简单同步重试装饰器。"""
    def decorator(fn):
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return fn(*args, **kwargs)
                except exceptions as e:
                    last_exc = e
                    wait = base_delay * (2 ** (attempt - 1))
                    log.warning(f"[retry] {fn.__name__} attempt {attempt}/{max_attempts} failed: {e}. Wait {wait:.1f}s...")
                    time.sleep(wait)
            raise last_exc
        return wrapper
    return decorator


def async_retry(max_attempts=3, base_delay=2.0, exceptions=(Exception,)):
    """简单异步重试装饰器。"""
    def decorator(fn):
        async def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return await fn(*args, **kwargs)
                except exceptions as e:
                    last_exc = e
                    wait = base_delay * (2 ** (attempt - 1))
                    log.warning(f"[retry] {fn.__name__} attempt {attempt}/{max_attempts} failed: {e}. Wait {wait:.1f}s...")
                    await asyncio.sleep(wait)
            raise last_exc
        return wrapper
    return decorator


# ════════════════════════════════════════════════════════
#  Zhipu GLM-4v OCR
# ════════════════════════════════════════════════════════
zhipu_client = ZhipuAI(api_key=ZHIPU_API_KEY)


@async_retry(max_attempts=3, base_delay=3.0)
async def ocr_image(image_path: str) -> str:
    """使用智谱 GLM-4v-plus 提取图片文字与场景描述。"""
    loop = asyncio.get_event_loop()

    def _call():
        with open(image_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode("utf-8")

        # 判断文件扩展名来决定 mime type
        ext = Path(image_path).suffix.lower().lstrip(".")
        mime_map = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp"}
        mime = mime_map.get(ext, "jpeg")

        resp = zhipu_client.chat.completions.create(
            model="glm-4v-plus",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text",
                     "text": "请提取图片中的所有文字，并简洁描述图片展示的场景与对话语境（1-2句话即可）。"},
                    {"type": "image_url",
                     "image_url": {"url": f"data:image/{mime};base64,{img_b64}"}}
                ]
            }],
        )
        return resp.choices[0].message.content

    # 在线程池中执行同步 SDK 调用，避免阻塞事件循环
    return await loop.run_in_executor(None, _call)


async def ocr_all_images(image_dir: Path) -> list[str]:
    """对某个帖子目录下的所有图片并行 OCR。"""
    if not image_dir.exists():
        return []

    img_files = [
        str(p) for p in sorted(image_dir.iterdir())
        if p.is_file() and p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")
    ]
    if not img_files:
        return []

    log.info(f"  OCR: {len(img_files)} images in {image_dir.name}")
    tasks = [ocr_image(p) for p in img_files]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    texts = []
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            log.warning(f"  OCR failed for image {i}: {r}")
            texts.append("")
        else:
            texts.append(r or "")
    return texts


# ════════════════════════════════════════════════════════
#  Qwen 结构化（HTTP OpenAI 兼容模式）
# ════════════════════════════════════════════════════════
QWEN_SYSTEM_PROMPT = """你是一个专业的英语教育专家和语料库构建者。
你以 API 方式工作，只接收输入，并输出结构化 JSON 数据，不要有任何多余解释。"""

QWEN_USER_TEMPLATE = """请根据以下小红书帖子内容，生成一条高质量的职场英语学习语料库条目。

【帖子标题】：{title}
【帖子正文】：{desc}
【图片OCR及场景描述】：{ocr_text}

要求：严格按以下 JSON 格式输出，不加任何 Markdown 代码块标记。
如内容不足，请结合"职场英语"或"高情商职场沟通"场景合理补全。

{{
  "id": "{note_id}",
  "category": "类别（如：High EQ Communication / Cross-functional Collaboration / Meeting & Presentation 等）",
  "task_description": "任务描述（英文，1句话）",
  "mood_suggestion": "语气建议（英文，如：Professional and empathetic）",
  "keywords_pool": ["关键词1（英文）", "关键词2（英文）", "关键词3（英文）"],
  "tags": ["标签1（中文）", "标签2（中文）"],
  "level": "难度等级，只能是以下之一：beginner / intermediate / advanced",
  "example": {{
    "title": "场景标题（中文，10字以内）",
    "scenario": "场景背景描述（英文，1句话）",
    "messages": [
      {{"role": "ai", "english": "AI发言", "chinese": "中文翻译"}},
      {{"role": "user", "userPrompt": "这是用户需要说的话对应的中文翻译（不是指令）",
        "reference": {{"answer": "推荐英文回答", "keyPhrases": ["短语1","短语2"]}} }},
      {{"role": "ai", "english": "AI发言", "chinese": "中文翻译"}},
      {{"role": "user", "userPrompt": "中文翻译",
        "reference": {{"answer": "推荐英文回答", "keyPhrases": ["短语1","短语2"]}} }}
    ]
  }}
}}"""


@async_retry(max_attempts=3, base_delay=5.0)
async def structure_with_qwen(note_id: str, title: str, desc: str, ocr_texts: list[str]) -> Optional[dict]:
    """调用 Qwen-Plus HTTP API 生成结构化语料条目。"""
    ocr_combined = "\n---\n".join([t for t in ocr_texts if t.strip()]) or "（无图片内容）"

    user_msg = QWEN_USER_TEMPLATE.format(
        title=title or "",
        desc=desc or "",
        ocr_text=ocr_combined,
        note_id=note_id,
    )

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            QWEN_API_URL,
            headers={
                "Authorization": f"Bearer {DASHSCOPE_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": QWEN_MODEL,
                "messages": [
                    {"role": "system", "content": QWEN_SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0.7,
                "response_format": {"type": "json_object"},
            },
        )

    if resp.status_code != 200:
        raise RuntimeError(f"Qwen API error {resp.status_code}: {resp.text[:200]}")

    content = resp.json()["choices"][0]["message"]["content"]
    # 清理可能的 markdown 代码块
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    return json.loads(content)


# ════════════════════════════════════════════════════════
#  BigQuery
# ════════════════════════════════════════════════════════
def get_bq_client():
    creds = service_account.Credentials.from_service_account_file(BQ_KEY_PATH)
    return bigquery.Client(credentials=creds, project=BQ_PROJECT_ID)


def ensure_bq_table(bq: bigquery.Client):
    """确保 BQ dataset 和 table 存在，不存在则创建。"""
    dataset = bigquery.Dataset(f"{BQ_PROJECT_ID}.{BQ_DATASET_ID}")
    dataset.location = "US"
    try:
        bq.create_dataset(dataset, exists_ok=True)
        log.info(f"BQ dataset ready: {BQ_DATASET_ID}")
    except Exception as e:
        log.warning(f"BQ dataset init warning: {e}")

    schema = [
        bigquery.SchemaField("id",               "STRING",  mode="REQUIRED"),
        bigquery.SchemaField("category",          "STRING"),
        bigquery.SchemaField("task_description",  "STRING"),
        bigquery.SchemaField("mood_suggestion",   "STRING"),
        bigquery.SchemaField("keywords_pool",     "STRING",  mode="REPEATED"),
        bigquery.SchemaField("tags",              "STRING",  mode="REPEATED"),
        bigquery.SchemaField("level",             "STRING"),
        bigquery.SchemaField("example_json",      "JSON"),
    ]
    table = bigquery.Table(BQ_TABLE_REF, schema=schema)
    try:
        bq.create_table(table, exists_ok=True)
        log.info(f"BQ table ready: {BQ_TABLE_REF}")
    except Exception as e:
        log.warning(f"BQ table init warning: {e}")


@retry(max_attempts=3, base_delay=5.0)
def upload_to_bq(bq: bigquery.Client, items: list[dict]):
    """批量上传到 BigQuery，去重（按 id 跳过已存在条目处理在调用方完成）。"""
    rows = []
    for item in items:
        rows.append({
            "id":               str(item.get("id", "")),
            "category":         str(item.get("category", "")),
            "task_description": str(item.get("task_description", "")),
            "mood_suggestion":  str(item.get("mood_suggestion", "")),
            "keywords_pool":    item.get("keywords_pool", []),
            "tags":             item.get("tags", []),
            "level":            str(item.get("level", "intermediate")),
            "example_json":     json.dumps(item.get("example", {}), ensure_ascii=False),
        })

    job_cfg = bigquery.LoadJobConfig(write_disposition="WRITE_APPEND")
    job = bq.load_table_from_json(rows, BQ_TABLE_REF, job_config=job_cfg)
    job.result()  # 等待完成
    log.info(f"BQ upload done: {len(rows)} rows")


# ════════════════════════════════════════════════════════
#  进度管理
# ════════════════════════════════════════════════════════
def load_processed_ids() -> set:
    PROGRESS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not PROGRESS_FILE.exists():
        return set()
    return set(l.strip() for l in PROGRESS_FILE.read_text("utf-8").splitlines() if l.strip())


def save_processed_id(note_id: str):
    with open(PROGRESS_FILE, "a", encoding="utf-8") as f:
        f.write(note_id + "\n")


def save_failed_id(note_id: str):
    FAILED_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(FAILED_FILE, "a", encoding="utf-8") as f:
        f.write(note_id + "\n")


# ════════════════════════════════════════════════════════
#  主流程
# ════════════════════════════════════════════════════════
async def process_note(note: dict, bq_client: Optional[bigquery.Client], dry_run: bool) -> bool:
    note_id = note["note_id"]
    title   = note.get("title", "")
    desc    = note.get("desc", "")
    log.info(f"▶ [{note_id}] {title[:40]}")

    # 1. OCR
    image_dir = IMAGES_DIR / note_id
    ocr_texts = await ocr_all_images(image_dir)
    if not ocr_texts:
        log.info(f"  No images, using text only.")

    # 2. Qwen 结构化
    try:
        item = await structure_with_qwen(note_id, title, desc, ocr_texts)
    except Exception as e:
        log.error(f"  Qwen failed: {e}")
        return False

    if not item:
        log.error(f"  Qwen returned empty result")
        return False

    # 保证 id 与 note_id 一致
    item["id"] = note_id

    log.info(f"  ✓ Structured: [{item.get('level','?')}] {item.get('category','?')}")

    # 3. 写入 BigQuery
    if not dry_run and bq_client:
        try:
            upload_to_bq(bq_client, [item])
        except Exception as e:
            log.error(f"  BQ upload failed: {e}")
            return False
    elif dry_run:
        # dry-run 模式：把结果打印/保存到本地文件
        out_dir = BASE_DIR / "data" / "dry_run_output"
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / f"{note_id}.json"
        out_file.write_text(json.dumps(item, ensure_ascii=False, indent=2), encoding="utf-8")
        log.info(f"  [DRY-RUN] Saved to {out_file}")

    return True


async def main(dry_run: bool = False, limit: Optional[int] = None):
    log.info("=" * 60)
    log.info("XHS Corpus Pipeline — Local Data Mode")
    log.info(f"DRY-RUN: {dry_run} | LIMIT: {limit or 'all'}")
    log.info("=" * 60)

    # 读取 JSON 数据
    if not DATA_JSON.exists():
        log.error(f"Data file not found: {DATA_JSON}")
        sys.exit(1)

    notes = json.loads(DATA_JSON.read_text(encoding="utf-8"))
    log.info(f"Total notes in JSON: {len(notes)}")

    # 过滤已处理
    processed_ids = load_processed_ids()
    log.info(f"Already processed: {len(processed_ids)}")

    todo = [n for n in notes if n["note_id"] not in processed_ids]
    log.info(f"Pending: {len(todo)}")

    if limit:
        todo = todo[:limit]
        log.info(f"Limited to: {len(todo)}")

    if not todo:
        log.info("Nothing to do. All notes are already processed!")
        return

    # 初始化 BigQuery
    bq_client = None
    if not dry_run:
        try:
            bq_client = get_bq_client()
            ensure_bq_table(bq_client)
        except Exception as e:
            log.error(f"BigQuery init failed: {e}")
            log.error("Tip: check BQ_KEY_PATH and internet connection.")
            sys.exit(1)

    # 逐条处理
    success_count = 0
    fail_count = 0

    for i, note in enumerate(todo, 1):
        note_id = note["note_id"]
        log.info(f"\n[{i}/{len(todo)}] Processing {note_id}...")

        ok = await process_note(note, bq_client, dry_run)

        if ok:
            save_processed_id(note_id)
            success_count += 1
        else:
            save_failed_id(note_id)
            fail_count += 1

        # 每处理完一条稍等，避免触发 API 频率限制
        if i < len(todo):
            await asyncio.sleep(1.5)

    log.info("\n" + "=" * 60)
    log.info(f"Pipeline finished: ✓ {success_count} success, ✗ {fail_count} failed")
    if fail_count > 0:
        log.info(f"Failed IDs saved to: {FAILED_FILE}")
    log.info("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="XHS Corpus Local Processing Pipeline")
    parser.add_argument("--dry-run", action="store_true",
                        help="OCR + LLM 但不写 BigQuery，结果保存到 data/dry_run_output/")
    parser.add_argument("--limit", type=int, default=None,
                        help="只处理前 N 条（用于测试）")
    args = parser.parse_args()

    asyncio.run(main(dry_run=args.dry_run, limit=args.limit))

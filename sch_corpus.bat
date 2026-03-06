@echo off
setlocal

:: ==========================================
:: MediaCrawler Corpus Pipeline Batch Script
:: ==========================================
:: This script automatically triggers the crawling, processing, and uploading 
:: of Xiaohongshu notes to Google BigQuery.
:: 
:: Setup Instructions for Windows Task Scheduler:
:: 1. Open "Task Scheduler" (任务计划程序).
:: 2. Click "Create Task..." (创建任务) on the right panel.
:: 3. General (常规): Name it "Daily Corpus Sync", check "Run with highest privileges".
:: 4. Triggers (触发器): Click "New...", set it to "Daily" (每天) at a preferred time (e.g., 2:00 AM).
:: 5. Actions (操作): Click "New...", Action="Start a program". 
::    Program/script: Browse to this `sch_corpus.bat` file.
::    Start in (起始于): VERY IMPORTANT - Set this to the project root directory path,
::    e.g., c:\Users\86188\Desktop\vibe coding
:: 6. Save the task.

echo [INFO] Starting MediaCrawler Corpus Pipeline...
echo [INFO] Current Directory: %CD%
echo [INFO] Timestamp: %date% %time%

:: Specify the path to your Python executable if it's not in the global PATH,
:: or if you are using a virtual environment (like conda).
:: Example: set PYTHON_CMD=C:\Users\86188\miniconda3\envs\myenv\python.exe
:: Since the user ran pip install successfully before, we'll try the default 'python' which is likely aliased to the correct pip env.
set PYTHON_CMD=python

:: Run the pipeline
%PYTHON_CMD% MediaCrawler\tools\corpus_pipeline.py

set EXIT_CODE=%ERRORLEVEL%
if %EXIT_CODE% EQU 0 (
    echo [SUCCESS] Pipeline execution completed successfully.
) else (
    echo [ERROR] Pipeline execution failed with exit code %EXIT_CODE%.
)

:: Optional: Log the output by piping in Task Scheduler or uncommenting the line below:
:: %PYTHON_CMD% MediaCrawler\tools\corpus_pipeline.py >> pipeline_auto.log 2>&1

endlocal
exit /b %EXIT_CODE%

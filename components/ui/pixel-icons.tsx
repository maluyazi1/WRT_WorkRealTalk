import { cn } from '@/lib/utils'

/*
  像素风图标集
  规则：
  1. 40×40 主图标用于卡片；32×32 用于按钮/导航；20×20 用于小标签
  2. 全部用矩形/方块拼，无曲线、无渐变、无圆角
  3. 颜色：难度图标用固定 pixel 色；UI 图标用 currentColor，由父级 class 控制
*/

function wrap(node: React.ReactNode, className?: string, size = 40) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      {node}
    </svg>
  )
}

export function PixelIconSeedling({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="10" y="28" width="20" height="8" fill="#3E2723" />
      <rect x="18" y="16" width="4" height="12" fill="#4A9C6D" />
      <rect x="10" y="12" width="8" height="8" fill="#4A9C6D" />
      <rect x="22" y="12" width="8" height="8" fill="#4A9C6D" />
      <rect x="12" y="8" width="4" height="4" fill="#4A9C6D" />
      <rect x="24" y="8" width="4" height="4" fill="#4A9C6D" />
    </>,
    className,
    40,
  )
}

export function PixelIconRocket({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="14" y="8" width="12" height="24" fill="#4C7AC8" />
      <rect x="10" y="16" width="4" height="10" fill="#4C7AC8" />
      <rect x="26" y="16" width="4" height="10" fill="#4C7AC8" />
      <rect x="16" y="12" width="8" height="8" fill="#FFF8E7" />
      <rect x="12" y="32" width="4" height="4" fill="#E6A23C" />
      <rect x="24" y="32" width="4" height="4" fill="#E6A23C" />
    </>,
    className,
    40,
  )
}

export function PixelIconLightning({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="16" y="4" width="8" height="8" fill="#F0E040" />
      <rect x="8" y="12" width="12" height="8" fill="#F0E040" />
      <rect x="16" y="20" width="8" height="8" fill="#F0E040" />
      <rect x="8" y="28" width="12" height="8" fill="#F0E040" />
    </>,
    className,
    40,
  )
}

export function PixelIconMic({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="12" y="8" width="16" height="16" fill="#C84C4C" />
      <rect x="8" y="12" width="4" height="12" fill="#C84C4C" />
      <rect x="28" y="12" width="4" height="12" fill="#C84C4C" />
      <rect x="18" y="24" width="4" height="8" fill="#2C1810" />
      <rect x="12" y="32" width="16" height="4" fill="#2C1810" />
    </>,
    className,
    40,
  )
}

export function PixelIconMessageSquare({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="4" y="4" width="24" height="20" fill="currentColor" />
      <rect x="4" y="20" width="10" height="8" fill="currentColor" />
    </>,
    className,
    32,
  )
}

export function PixelIconSparkles({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="12" y="2" width="8" height="28" fill="currentColor" />
      <rect x="2" y="12" width="28" height="8" fill="currentColor" />
    </>,
    className,
    32,
  )
}

export function PixelIconTrendingUp({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="4" y="20" width="8" height="8" fill="currentColor" />
      <rect x="12" y="12" width="8" height="16" fill="currentColor" />
      <rect x="20" y="4" width="8" height="24" fill="currentColor" />
    </>,
    className,
    32,
  )
}

export function PixelIconBookOpen({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="4" y="4" width="10" height="24" fill="currentColor" />
      <rect x="18" y="4" width="10" height="24" fill="currentColor" />
      <rect x="14" y="6" width="4" height="20" fill="currentColor" />
    </>,
    className,
    32,
  )
}

export function PixelIconMenu({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="2" y="4" width="20" height="4" fill="currentColor" />
      <rect x="2" y="10" width="20" height="4" fill="currentColor" />
      <rect x="2" y="16" width="20" height="4" fill="currentColor" />
    </>,
    className,
    24,
  )
}

export function PixelIconHome({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="8" y="2" width="4" height="4" fill="currentColor" />
      <rect x="4" y="6" width="12" height="4" fill="currentColor" />
      <rect x="2" y="10" width="16" height="8" fill="currentColor" />
    </>,
    className,
    20,
  )
}

export function PixelIconEye({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="4" y="8" width="12" height="4" fill="currentColor" />
      <rect x="8" y="4" width="4" height="12" fill="currentColor" />
    </>,
    className,
    20,
  )
}

export function PixelIconEdit({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="4" y="16" width="12" height="4" fill="currentColor" />
      <rect x="14" y="6" width="4" height="12" fill="currentColor" />
    </>,
    className,
    20,
  )
}

export function PixelIconCheck({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="4" y="12" width="4" height="4" fill="currentColor" />
      <rect x="8" y="8" width="4" height="4" fill="currentColor" />
      <rect x="12" y="4" width="4" height="4" fill="currentColor" />
      <rect x="16" y="8" width="4" height="4" fill="currentColor" />
    </>,
    className,
    24,
  )
}

export function PixelIconX({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="4" y="4" width="4" height="4" fill="currentColor" />
      <rect x="12" y="4" width="4" height="4" fill="currentColor" />
      <rect x="8" y="8" width="4" height="4" fill="currentColor" />
      <rect x="4" y="12" width="4" height="4" fill="currentColor" />
      <rect x="12" y="12" width="4" height="4" fill="currentColor" />
    </>,
    className,
    20,
  )
}

export function PixelIconSearch({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="4" y="2" width="12" height="4" fill="currentColor" />
      <rect x="2" y="6" width="4" height="8" fill="currentColor" />
      <rect x="14" y="6" width="4" height="8" fill="currentColor" />
      <rect x="4" y="14" width="12" height="4" fill="currentColor" />
      <rect x="18" y="18" width="4" height="4" fill="currentColor" />
      <rect x="22" y="22" width="4" height="4" fill="currentColor" />
    </>,
    className,
    28,
  )
}

export function PixelIconVolume({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="2" y="9" width="6" height="6" fill="currentColor" />
      <rect x="8" y="5" width="6" height="14" fill="currentColor" />
      <rect x="16" y="7" width="4" height="10" fill="currentColor" />
    </>,
    className,
    24,
  )
}

export function PixelIconTrash({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="9" y="2" width="6" height="4" fill="currentColor" />
      <rect x="2" y="6" width="20" height="4" fill="currentColor" />
      <rect x="4" y="10" width="16" height="12" fill="currentColor" />
    </>,
    className,
    24,
  )
}

export function PixelIconArrowLeft({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="2" y="10" width="6" height="4" fill="currentColor" />
      <rect x="8" y="6" width="4" height="12" fill="currentColor" />
      <rect x="12" y="10" width="10" height="4" fill="currentColor" />
    </>,
    className,
    24,
  )
}

export function PixelIconLayers({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="2" y="4" width="20" height="4" fill="currentColor" />
      <rect x="4" y="10" width="16" height="4" fill="currentColor" />
      <rect x="6" y="16" width="12" height="4" fill="currentColor" />
    </>,
    className,
    24,
  )
}

export function PixelIconCalendar({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="6" y="2" width="4" height="4" fill="currentColor" />
      <rect x="14" y="2" width="4" height="4" fill="currentColor" />
      <rect x="2" y="6" width="20" height="4" fill="currentColor" />
      <rect x="4" y="12" width="4" height="4" fill="currentColor" />
      <rect x="10" y="12" width="4" height="4" fill="currentColor" />
      <rect x="16" y="12" width="4" height="4" fill="currentColor" />
      <rect x="4" y="18" width="4" height="4" fill="currentColor" />
      <rect x="10" y="18" width="4" height="4" fill="currentColor" />
    </>,
    className,
    24,
  )
}

export function PixelIconSend({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="2" y="10" width="12" height="4" fill="currentColor" />
      <rect x="14" y="4" width="4" height="16" fill="currentColor" />
    </>,
    className,
    24,
  )
}

export function PixelIconChevronDown({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="2" y="6" width="16" height="4" fill="currentColor" />
      <rect x="4" y="10" width="12" height="4" fill="currentColor" />
      <rect x="6" y="14" width="8" height="4" fill="currentColor" />
    </>,
    className,
    20,
  )
}

export function PixelIconChevronUp({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="6" y="6" width="8" height="4" fill="currentColor" />
      <rect x="4" y="10" width="12" height="4" fill="currentColor" />
      <rect x="2" y="14" width="16" height="4" fill="currentColor" />
    </>,
    className,
    20,
  )
}

export function PixelIconStar({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="10" y="2" width="4" height="20" fill="currentColor" />
      <rect x="2" y="10" width="20" height="4" fill="currentColor" />
      <rect x="4" y="4" width="4" height="4" fill="currentColor" />
      <rect x="16" y="4" width="4" height="4" fill="currentColor" />
      <rect x="4" y="16" width="4" height="4" fill="currentColor" />
      <rect x="16" y="16" width="4" height="4" fill="currentColor" />
    </>,
    className,
    24,
  )
}

export function PixelIconInfo({ className }: { className?: string }) {
  return wrap(
    <>
      <rect x="10" y="2" width="4" height="4" fill="currentColor" />
      <rect x="10" y="8" width="4" height="14" fill="currentColor" />
    </>,
    className,
    24,
  )
}

export function PixelIconSquare({ className }: { className?: string }) {
  return wrap(
    <rect x="4" y="4" width="12" height="12" fill="currentColor" />,
    className,
    20,
  )
}

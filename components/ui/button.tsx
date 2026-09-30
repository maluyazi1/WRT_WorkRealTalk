import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    // px-btn 提供位移与投影（含 hover 弹起 / active 挤压拉伸 / 移动端降档）
    'px-btn',
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    // 直角 + 粗轮廓线；移动端降到 3px，小屏上 4px 边框太吃宽度
    'border-[3px] md:border-4 border-pixel-ink',
    'text-sm font-semibold',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:bg-pixel-ink-dim disabled:text-pixel-paper',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        // 按钮文字多为中文，刻意不套像素字体——Press Start 2P 无中文字形，
        // 会让中文回退到不可控的等宽字体，牺牲可读性
        default: 'bg-pixel-primary text-white hover:bg-[#d65c5c]',
        destructive: 'bg-pixel-primary text-white hover:bg-[#a83a3a]',
        outline:
          'bg-pixel-paper text-pixel-ink hover:bg-pixel-highlight',
        secondary: 'bg-pixel-bg text-pixel-ink hover:bg-pixel-highlight',
        ghost: 'bg-transparent text-pixel-ink hover:bg-pixel-highlight',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        // 触控目标 ≥ 44px
        default: 'h-11 px-5 py-3',
        sm: 'h-9 px-3',
        lg: 'h-12 px-8 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }

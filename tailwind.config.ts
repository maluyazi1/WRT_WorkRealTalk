import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        /* ===== 像素复古风命名色（hex 直出，供工具类与插画使用） ===== */
        pixel: {
          bg: '#F0E6D2',
          paper: '#FFF8E7',
          ink: '#2C1810',
          'ink-dim': '#6B5E51',
          primary: '#C84C4C',
          success: '#4A9C6D',
          warn: '#E6A23C',
          accent: '#4C7AC8',
          highlight: '#F0E040',
          shadow: '#3E2723',
        },
      },
      fontFamily: {
        /* 中文正文走系统无衬线，保证长文本可读 */
        sans: ['var(--font-cn)'],
        cn: ['var(--font-cn)'],
        /* 像素字体只用于短标签 */
        pixel: ['var(--font-pixel)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        /* 像素风无圆角；full 保留给头像等圆形语义 */
        none: '0',
        sm: '0',
        DEFAULT: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        /* ===== 像素风动画（steps() 模拟逐帧） ===== */
        'px-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        'px-pop': {
          '0%': { transform: 'scale(0) rotate(-12deg)' },
          '70%': { transform: 'scale(1.15) rotate(4deg)' },
          '100%': { transform: 'scale(1) rotate(0)' },
        },
        'px-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        },
        'px-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'px-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        },
        'px-bar': {
          '0%, 100%': { transform: 'scaleY(0.25)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'px-rise': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '70%': { transform: 'translateY(-3px)', opacity: '1' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'px-stamp': {
          '0%': { transform: 'scale(2.2) rotate(-12deg)', opacity: '0' },
          '60%': { transform: 'scale(0.9) rotate(4deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0)', opacity: '1' },
        },
        'px-burst': {
          '0%': { transform: 'translate(0, 0) scale(1)', opacity: '1' },
          '100%': {
            transform: 'translate(var(--tx), var(--ty)) scale(0)',
            opacity: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'px-float': 'px-float 2.4s steps(4) infinite',
        'px-pop': 'px-pop 0.32s steps(3) both',
        'px-shake': 'px-shake 0.36s steps(2) 2',
        'px-blink': 'px-blink 0.8s steps(2) infinite',
        'px-pulse': 'px-pulse 1.2s steps(2) infinite',
        'px-bar': 'px-bar 0.9s steps(3) infinite',
        'px-rise': 'px-rise 0.28s steps(3) both',
        'px-stamp': 'px-stamp 0.32s steps(3) both',
        'px-burst': 'px-burst 0.4s steps(5) forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config

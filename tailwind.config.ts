
import type {Config} from 'tailwindcss';
import typography from '@tailwindcss/typography';


export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Inter', 'sans-serif'],
        headline: ['Inter', 'sans-serif'],
        code: ['monospace', 'monospace'], 
      },
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
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
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
         'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse': { 
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'bubble-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'pulse': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite', 
        'bubble-pulse': 'bubble-pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      typography: ({ theme }: { theme: (path: string) => string }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.foreground'),
            '--tw-prose-headings': theme('colors.primary.DEFAULT'),
            '--tw-prose-lead': theme('colors.foreground'),
            '--tw-prose-links': theme('colors.accent.DEFAULT'),
            '--tw-prose-bold': theme('colors.foreground'),
            '--tw-prose-counters': theme('colors.muted.foreground'),
            '--tw-prose-bullets': theme('colors.muted.foreground'),
            '--tw-prose-hr': theme('colors.border'),
            '--tw-prose-quotes': theme('colors.muted.foreground'),
            '--tw-prose-quote-borders': theme('colors.muted.DEFAULT'),
            '--tw-prose-captions': theme('colors.muted.foreground'),
            '--tw-prose-code': theme('colors.foreground'), // For inline code text color
            '--tw-prose-pre-code': 'inherit', // Let VSCodeCodeBlock handle this
            '--tw-prose-pre-bg': 'transparent', // Let VSCodeCodeBlock handle this
            '--tw-prose-th-borders': theme('colors.border'),
            '--tw-prose-td-borders': theme('colors.border'),
            '--tw-prose-invert-body': theme('colors.foreground'),
            '--tw-prose-invert-headings': theme('colors.primary.DEFAULT'),
            '--tw-prose-invert-lead': theme('colors.foreground'),
            '--tw-prose-invert-links': theme('colors.accent.DEFAULT'),
            '--tw-prose-invert-bold': theme('colors.foreground'),
            '--tw-prose-invert-counters': theme('colors.muted.foreground'),
            '--tw-prose-invert-bullets': theme('colors.muted.foreground'),
            '--tw-prose-invert-hr': theme('colors.border'),
            '--tw-prose-invert-quotes': theme('colors.muted.foreground'),
            '--tw-prose-invert-quote-borders': theme('colors.muted.DEFAULT'),
            '--tw-prose-invert-captions': theme('colors.muted.foreground'),
            '--tw-prose-invert-code': theme('colors.foreground'),
            '--tw-prose-invert-pre-code': 'inherit',
            '--tw-prose-invert-pre-bg': 'transparent',
            '--tw-prose-invert-th-borders': theme('colors.border'),
            '--tw-prose-invert-td-borders': theme('colors.border'),
            p: { marginTop: '0.5em', marginBottom: '0.5em' },
            li: { marginTop: '0.1em', marginBottom: '0.1em' },
            'ul > li::before': { backgroundColor: theme('colors.muted.foreground') },
            'ol > li::before': { color: theme('colors.muted.foreground') },
          },
        },
      }),
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    typography,
  ],
} satisfies Config;


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
        DEFAULT: { // Corresponds to 'prose' or 'prose-base'
          css: {
            '--tw-prose-font-family': '"Times New Roman", Times, serif',
            '--tw-prose-body': theme('colors.foreground'),
            '--tw-prose-headings': theme('colors.primary.DEFAULT'),
            '--tw-prose-links': theme('colors.accent.DEFAULT'), 
            '--tw-prose-bold': theme('colors.foreground'),
            '--tw-prose-counters': theme('colors.muted.foreground'),
            '--tw-prose-bullets': theme('colors.muted.foreground'),
            '--tw-prose-hr': theme('colors.border'),
            '--tw-prose-quotes': theme('colors.muted.foreground'),
            '--tw-prose-quote-borders': theme('colors.muted.DEFAULT'),
            '--tw-prose-captions': theme('colors.muted.foreground'),
            '--tw-prose-code': theme('colors.foreground'), 
            '--tw-prose-pre-code': 'inherit', 
            '--tw-prose-pre-bg': 'transparent', 
            '--tw-prose-th-borders': theme('colors.border'),
            '--tw-prose-td-borders': theme('colors.border'),

            color: 'var(--tw-prose-body)',
            fontFamily: 'var(--tw-prose-font-family)',
            fontSize: '1rem', // 12pt (16px)
            lineHeight: '1.5',
            textAlign: 'justify',

            p: {
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              textAlign: 'justify',
              marginTop: '0.75em',
              marginBottom: '0.75em',
            },

            'h1, h2, h3, h4, h5, h6': {
              fontFamily: 'inherit',
              color: 'var(--tw-prose-headings)',
              fontWeight: '600',
              fontSize: '1em', // All headings 12pt (1em of 1rem)
              lineHeight: '1.5',
              textAlign: 'left',
              marginTop: '1.2em',
              marginBottom: '0.6em',
            },
            h1: {
              textAlign: 'center',
              // fontSize: '1.25em', // Optional: slightly larger H1 while keeping base 12pt
            },

            'ul, ol': {
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              textAlign: 'justify',
              marginTop: '0.75em',
              marginBottom: '0.75em',
              paddingLeft: '1.6em',
            },
            li: {
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              textAlign: 'justify',
              marginTop: '0.25em',
              marginBottom: '0.25em',
            },
            'ul > li::before': {
              backgroundColor: 'var(--tw-prose-bullets)',
            },
            'ol > li::before': {
              color: 'var(--tw-prose-counters)',
              fontFamily: 'inherit',
              fontSize: 'inherit',
            },

            blockquote: {
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              textAlign: 'justify',
              fontStyle: 'italic',
              color: 'var(--tw-prose-quotes)',
              borderLeftColor: 'var(--tw-prose-quote-borders)',
              borderLeftWidth: '0.25em',
              paddingLeft: '1em',
              marginLeft: '0',
              marginRight: '0',
              marginTop: '1em',
              marginBottom: '1em',
            },

            code: { // Inline code
              fontFamily: 'var(--tw-prose-font-family)', 
              color: 'var(--tw-prose-code)',
              fontSize: '0.9em', 
              lineHeight: '1.3', 
              fontWeight: '400',
              backgroundColor: theme('colors.muted'),
              padding: '0.1em 0.3em',
              borderRadius: '0.2em',
              wordBreak: 'break-all',
            },
            'pre code': { // Code inside VSCodeCodeBlock
              fontFamily: 'var(--tw-prose-font-family) !important', 
              fontSize: '0.9em !important',       
              lineHeight: '1.4 !important',       
              color: 'inherit', 
              backgroundColor: 'transparent', 
              padding: '0',
            },
            pre: { // Wrapper for VSCodeCodeBlock
              fontFamily: 'var(--tw-prose-font-family) !important', 
              fontSize: '0.9em !important',
              lineHeight: '1.4 !important',
              marginTop: '1em',
              marginBottom: '1em',
              borderRadius: theme('borderRadius.md'),
            },

            a: {
              fontFamily: 'inherit',
              color: 'var(--tw-prose-links)',
              textDecoration: 'underline',
              fontWeight: '400',
            },
            strong: {
              fontFamily: 'inherit',
              color: 'var(--tw-prose-bold)',
              fontWeight: '700',
            },
            em: {
              fontFamily: 'inherit',
              fontStyle: 'italic',
              color: 'inherit',
            },
            hr: {
              borderColor: 'var(--tw-prose-hr)',
              marginTop: '2em',
              marginBottom: '2em',
            },
            img: {
              marginTop: '1.5em',
              marginBottom: '1.5em',
            },
            table: {
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              textAlign: 'left',
              width: '100%',
              marginTop: '1.5em',
              marginBottom: '1.5em',
            },
            thead: {
              fontFamily: 'inherit',
              borderBottomWidth: '1px',
              borderBottomColor: 'var(--tw-prose-th-borders)',
            },
            'thead th': {
              fontFamily: 'inherit',
              color: 'var(--tw-prose-headings)',
              fontWeight: '600',
              padding: '0.5em',
              textAlign: 'left',
            },
            'tbody tr': {
              fontFamily: 'inherit',
              borderBottomWidth: '1px',
              borderBottomColor: 'var(--tw-prose-td-borders)',
            },
            'tbody tr:last-child': {
              borderBottomWidth: '0',
            },
            'tbody td': {
              fontFamily: 'inherit',
              padding: '0.5em',
            },

            // Invert variants for dark mode
            '--tw-prose-invert-font-family': 'var(--tw-prose-font-family)',
            '--tw-prose-invert-body': theme('colors.foreground'),
            '--tw-prose-invert-headings': theme('colors.primary.DEFAULT'),
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
          }
        }
      }),
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    typography,
  ],
} satisfies Config;

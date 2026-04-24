# Technology Stack

**Analysis Date:** 2026-04-24

## Languages

**Primary:**
- TypeScript 5.7.2 - Application code, configuration, type definitions
- JavaScript (ES2017) - Configuration files, build scripts

**Secondary:**
- SQL (PostgreSQL) - Supabase database migrations and stored procedures
- HTML/CSS - Rendered by Next.js + React

## Runtime

**Environment:**
- Node.js 22-slim (Docker) - Production runtime
- Node.js 22 (recommended locally, see `.nvmrc`)

**Package Manager:**
- npm - Primary (uses package-lock.json)
- Bun - Supported (bun.lock present for alternate installations)

## Frameworks

**Core:**
- Next.js 16.2.1 - Full-stack React framework with App Router
- React 19.2.4 - UI library and component system
- React DOM 19.2.4 - Server/client rendering

**UI & Styling:**
- TailwindCSS 4.2.2 - Utility-first CSS framework
- @tailwindcss/postcss 4.2.2 - PostCSS integration for Tailwind
- shadcn/ui (via Radix UI) - Component library
- Radix UI (26+ packages) - Accessible headless components

**Data Management:**
- TanStack React Query 5.95.2 - Server state management (queries, mutations)
- TanStack React Form 1.28.5 - Form state and validation
- TanStack React Table 8.21.3 - Data table component and logic
- Zustand 5.0.12 - Client state management

**Form & Validation:**
- Zod 4.3.6 - Schema validation
- React Hook Form (via TanStack Form) - Form state management
- @radix-ui/react-form extensions - Accessible form controls

**Utilities:**
- nuqs 2.8.9 - URL search params management
- date-fns 4.1.0 - Date formatting and manipulation
- uuid 11.1.0 - UUID generation
- clsx 2.1.1 - Conditional CSS class names
- tailwind-merge 3.5.0 - Merge TailwindCSS classes
- match-sorter 8.2.0 - Fuzzy search/sorting
- sort-by 1.2.0 - Array sorting utility

**UI Components:**
- cmdk 1.1.1 - Command palette component
- input-otp 1.4.2 - OTP input component
- react-day-picker 9.14.0 - Date picker component
- react-dropzone 14.4.1 - File upload
- react-resizable-panels 2.1.9 - Resizable panel layouts
- react-responsive 10.0.1 - Responsive design helper
- recharts 2.15.4 - Charting library
- vaul 1.1.2 - Drawer component

**Icons & Visual:**
- @tabler/icons-react 3.40.0 - Icon library (400+ icons)
- @radix-ui/react-icons 1.3.2 - Radix icon set
- motion 11.18.2 - Animation library
- sharp 0.33.5 - Image processing

**Other Utilities:**
- sonner 1.7.4 - Toast notifications
- kbar 0.1.0-beta.48 - Command menu
- next-themes 0.4.6 - Theme switching (light/dark)
- nextjs-toploader 3.9.17 - Page loading progress bar
- class-variance-authority 0.7.1 - Component variant patterns

## Key Dependencies

**Critical:**
- @supabase/ssr 0.10.0 - Supabase server-side rendering utilities for auth
- @supabase/supabase-js 2.101.1 - Supabase client library (auth, DB, storage)
- jose 6.2.2 - JWT signing/verification for demo tokens

**Monitoring & Error Tracking:**
- @sentry/nextjs 10.45.0 - Error tracking and performance monitoring

**Development:**
- oxlint 1.57.0 - Fast linter (Rust-based)
- oxfmt 0.42.0 - Code formatter
- husky 9.1.7 - Git hooks
- lint-staged 15.5.2 - Run linters on staged files
- @playwright/test 1.59.1 - E2E testing framework

**Testing:**
- @faker-js/faker 9.9.0 - Fake data generation

## Configuration

**Environment:**
- Environment variables in `.env` (secrets, API keys, URLs)
- Build-time env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, etc.
- Runtime secrets: `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_JWT_SECRET`, `UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_REDIS_REST_URL`, `SENTRY_AUTH_TOKEN`, `TURNSTILE_SECRET`

**Build:**
- `tsconfig.json` - TypeScript configuration (ES2017, strict mode, path aliases)
- `next.config.ts` - Next.js configuration (images, Sentry plugin, standalone build)
- `tailwind.config.js` - Not present; using default TailwindCSS v4 configuration
- `postcss.config.js` - PostCSS configuration with @tailwindcss/postcss plugin
- `.oxlintrc.json` - Linting rules
- `.oxfmtrc.json` - Formatter rules
- `components.json` - shadcn/ui configuration

**TypeScript Paths:**
- `@/*` → `./src/*` - Absolute imports for source code

## Platform Requirements

**Development:**
- Node.js 22 (recommended, see `.nvmrc`)
- npm or Bun package manager
- Git for version control
- Husky for pre-commit hooks

**Production:**
- Docker container (multi-stage build)
- Node.js 22-slim runtime
- Vercel (platform preference, uses Vercel edge functions and deployment)
- Environment variables configured via deployment platform

**External Dependencies:**
- Supabase project (PostgreSQL + Auth + Storage)
- Upstash Redis instance (demo token state, revocation, spend tracking)
- Sentry (error tracking - optional, disableable via `NEXT_PUBLIC_SENTRY_DISABLED`)
- terenure-proyect (remote demo app, JWT token verification)

---

*Stack analysis: 2026-04-24*

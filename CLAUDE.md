# CLAUDE.md

This is a Next.js 16 + shadcn/ui admin dashboard starter kit.

## Key References

- **[AGENTS.md](./AGENTS.md)** — Full project overview, tech stack, structure, conventions, data fetching patterns, deployment
- **[docs/forms.md](./docs/forms.md)** — Form system: TanStack Form + Zod, composable fields, validation, multi-step, sheet/dialog forms
- **[docs/themes.md](./docs/themes.md)** — Theme system: OKLCH colors, adding themes, font config
- **[docs/nav-rbac.md](./docs/nav-rbac.md)** — Navigation RBAC: role-based access control with Supabase Auth

## Critical Conventions

- **React Query** for all data fetching — `void prefetchQuery()` on server + `useSuspenseQuery` on client (standard TanStack pattern), `useMutation` for forms, `HydrationBoundary` + `dehydrate` for hydration, `<Suspense fallback>` for streaming
- **API layer** per feature — `api/types.ts` → `api/service.ts` → `api/queries.ts`; queries use key factories (`entityKeys.all/list/detail`); components import from service and queries, never from mock APIs directly
- **nuqs** for URL search params — `searchParamsCache` on server, `useQueryStates` on client, use `getSortingStateParser` for sort (same parser as `useDataTable`)
- **Icons** — only import from `@/components/icons`, never from `@tabler/icons-react` directly
- **Forms** — use `useAppForm` + `useFormFields<T>()` from `@/components/ui/tanstack-form`
- **Page headers** — use `PageContainer` props (`pageTitle`, `pageDescription`, `pageHeaderAction`), never import `<Heading>` manually
- **Formatting** — single quotes, JSX single quotes, no trailing comma, 2-space indent

## Color Scheme

Extracted from brand design reference (`sample-design.html`).

| Token | Hex | Role |
|---|---|---|
| `brand-teal` | `#1a5c6b` | Primary dark color — headings, main UI surfaces, nav background |
| `brand-sage` | `#78F995` | Green accent — highlights, CTA buttons, active states, progress indicators |
| `brand-beige` | `#EEEADF` | Lightest background — page background, light section fills |
| `brand-cream` | `#F5F0E8` | Mid-light — card backgrounds, secondary surfaces, hover states |

### Tailwind config (`tailwind.config.js`)

```js
colors: {
  'brand-teal':  '#1a5c6b',
  'brand-sage':  '#78F995',
  'brand-beige': '#EEEADF',
  'brand-cream': '#F5F0E8',
}
```

### Usage rules

- Page background: `brand-beige`
- Name entry screen: white card on `brand-beige` page, `NameEntryView` component
- Dark card screens (Idle, Conversation, Recording, Conversation ResultsView): `brand-teal` background via `DarkCard` wrapper, cream/white text
- Conversation ResultsView: dark teal card for polished intro, light cards for summary + collapsible details
- Light card screens (RecordingResultsView): `brand-cream` outer card, `bg-white` inner cards
- Primary CTA buttons: `bg-brand-sage text-brand-teal font-black uppercase` with `shadow-[0_20px_40px_rgba(120,249,149,0.3)]`
- Secondary/stop buttons on dark: `bg-white text-brand-teal font-black uppercase`
- Accent highlights (progress bar, colour-coded transcript — strong): `brand-sage`
- Transcript colour-coding:
  - Strong (B2-level): `brand-sage` left border or underline
  - Weak (vague/informal): amber `#F59E0B` left border
  - Missing/unclear: rose `#F43F5E` left border

---

## UI Principles

- Warm and coaching in tone — not a test, not clinical
- Rounded corners throughout (`rounded-[2rem]` mobile, `rounded-[3rem]` desktop) — consistent with brand reference
- Large readable text for the transcript and quote
- Single column layout, mobile-friendly
- Clear visual separation between the four states: name entry / idle / in conversation / results
- No emojis in the UI

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Emerflows Teach Admin**

Internal admin section of the Emerflows English Course platform that lets administrators
review learner work across cohorts. Admins browse cohorts, drill into individual learners,
and inspect each submission — listening to speaking recordings, reading auto-classified
transcripts, and reviewing AI-generated coaching tips, conversational Q&A pairs, and
exercise summaries that the learner-facing app already produced and stored in Supabase.

**Core Value:** An admin can open any learner's submission for any module and see everything the learner
produced (audio, transcript, AI coaching) plus mark it reviewed — without leaving the
dashboard or running SQL.

### Constraints

- **Tech stack**: Next.js 16 App Router + shadcn/ui + Tailwind 4 + TanStack React Query
  5 — Existing convention; documented in `CLAUDE.md` and codebase map
- **Data layer**: Supabase via `@supabase/ssr` with admin role enforced server-side —
  Established RBAC pattern from `docs/nav-rbac.md`
- **UI**: Use components from `src/components/ui/*` and the brand palette
  (`brand-teal`, `brand-sage`, `brand-beige`, `brand-cream`); icons only via
  `@/components/icons` — Project conventions in `CLAUDE.md`
- **Storage access**: Recordings bucket is private — must use signed URLs with short
  TTL; never expose service-role key to client
- **RLS**: All public tables have RLS enabled — admin reads must be policy-backed,
  not bypassed via service role from the client
- **Forms**: TanStack Form + Zod via `useAppForm` for any mutations — Project
  convention in `docs/forms.md`
- **Tests**: Playwright for critical flows (cohort → learner → submission viewer);
  existing harness lives at repo root
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.7.2 - Application code, configuration, type definitions
- JavaScript (ES2017) - Configuration files, build scripts
- SQL (PostgreSQL) - Supabase database migrations and stored procedures
- HTML/CSS - Rendered by Next.js + React
## Runtime
- Node.js 22-slim (Docker) - Production runtime
- Node.js 22 (recommended locally, see `.nvmrc`)
- npm - Primary (uses package-lock.json)
- Bun - Supported (bun.lock present for alternate installations)
## Frameworks
- Next.js 16.2.1 - Full-stack React framework with App Router
- React 19.2.4 - UI library and component system
- React DOM 19.2.4 - Server/client rendering
- TailwindCSS 4.2.2 - Utility-first CSS framework
- @tailwindcss/postcss 4.2.2 - PostCSS integration for Tailwind
- shadcn/ui (via Radix UI) - Component library
- Radix UI (26+ packages) - Accessible headless components
- TanStack React Query 5.95.2 - Server state management (queries, mutations)
- TanStack React Form 1.28.5 - Form state and validation
- TanStack React Table 8.21.3 - Data table component and logic
- Zustand 5.0.12 - Client state management
- Zod 4.3.6 - Schema validation
- React Hook Form (via TanStack Form) - Form state management
- @radix-ui/react-form extensions - Accessible form controls
- nuqs 2.8.9 - URL search params management
- date-fns 4.1.0 - Date formatting and manipulation
- uuid 11.1.0 - UUID generation
- clsx 2.1.1 - Conditional CSS class names
- tailwind-merge 3.5.0 - Merge TailwindCSS classes
- match-sorter 8.2.0 - Fuzzy search/sorting
- sort-by 1.2.0 - Array sorting utility
- cmdk 1.1.1 - Command palette component
- input-otp 1.4.2 - OTP input component
- react-day-picker 9.14.0 - Date picker component
- react-dropzone 14.4.1 - File upload
- react-resizable-panels 2.1.9 - Resizable panel layouts
- react-responsive 10.0.1 - Responsive design helper
- recharts 2.15.4 - Charting library
- vaul 1.1.2 - Drawer component
- @tabler/icons-react 3.40.0 - Icon library (400+ icons)
- @radix-ui/react-icons 1.3.2 - Radix icon set
- motion 11.18.2 - Animation library
- sharp 0.33.5 - Image processing
- sonner 1.7.4 - Toast notifications
- kbar 0.1.0-beta.48 - Command menu
- next-themes 0.4.6 - Theme switching (light/dark)
- nextjs-toploader 3.9.17 - Page loading progress bar
- class-variance-authority 0.7.1 - Component variant patterns
## Key Dependencies
- @supabase/ssr 0.10.0 - Supabase server-side rendering utilities for auth
- @supabase/supabase-js 2.101.1 - Supabase client library (auth, DB, storage)
- jose 6.2.2 - JWT signing/verification for demo tokens
- @sentry/nextjs 10.45.0 - Error tracking and performance monitoring
- oxlint 1.57.0 - Fast linter (Rust-based)
- oxfmt 0.42.0 - Code formatter
- husky 9.1.7 - Git hooks
- lint-staged 15.5.2 - Run linters on staged files
- @playwright/test 1.59.1 - E2E testing framework
- @faker-js/faker 9.9.0 - Fake data generation
## Configuration
- Environment variables in `.env` (secrets, API keys, URLs)
- Build-time env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, etc.
- Runtime secrets: `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_JWT_SECRET`, `UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_REDIS_REST_URL`, `SENTRY_AUTH_TOKEN`, `TURNSTILE_SECRET`
- `tsconfig.json` - TypeScript configuration (ES2017, strict mode, path aliases)
- `next.config.ts` - Next.js configuration (images, Sentry plugin, standalone build)
- `tailwind.config.js` - Not present; using default TailwindCSS v4 configuration
- `postcss.config.js` - PostCSS configuration with @tailwindcss/postcss plugin
- `.oxlintrc.json` - Linting rules
- `.oxfmtrc.json` - Formatter rules
- `components.json` - shadcn/ui configuration
- `@/*` → `./src/*` - Absolute imports for source code
## Platform Requirements
- Node.js 22 (recommended, see `.nvmrc`)
- npm or Bun package manager
- Git for version control
- Husky for pre-commit hooks
- Docker container (multi-stage build)
- Node.js 22-slim runtime
- Vercel (platform preference, uses Vercel edge functions and deployment)
- Environment variables configured via deployment platform
- Supabase project (PostgreSQL + Auth + Storage)
- Upstash Redis instance (demo token state, revocation, spend tracking)
- Sentry (error tracking - optional, disableable via `NEXT_PUBLIC_SENTRY_DISABLED`)
- terenure-proyect (remote demo app, JWT token verification)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Components: PascalCase (`ProductListing.tsx`, `DemoMintSheet.tsx`)
- Utilities/services: kebab-case with suffix (`api-client.ts`, `search-params.ts`, `demo-jwt.ts`)
- Hooks: camelCase with `use` prefix (`useAuth.ts`, `useNavigation.ts`)
- API layer files: fixed pattern `types.ts` → `service.ts` → `queries.ts` → `mutations.ts`
- Constants: kebab-case (`product-options.ts`, `mock-api.ts`)
- Schemas: kebab-case with feature prefix (`product.ts` inside `features/products/schemas/`)
- camelCase for all functions (`getProducts()`, `mintToken()`, `listTokens()`)
- Export public functions explicitly; prefix private functions with underscore or nest inside closures
- React hooks: `useFormFields<T>()`, `useSuspenseQuery()` (TanStack patterns)
- Service functions: `getProducts()`, `createProduct()`, `updateProduct()`, `deleteProduct()` (CRUD pattern)
- camelCase for all variables and constants
- React state: `const [isLoading, setIsLoading] = useState(false)`
- Query key factories: `const demoKeys = { all: ['demos'] as const, tokens: () => [...], spend: () => [...] }`
- PascalCase for interfaces, types, and type aliases: `Product`, `ProductFilters`, `ProductFormValues`
- Suffix response types with `Response`: `ListTokensResponse`, `SpendResponse`, `MintTokenResponse`
- Suffix input types with `Input`: `MintTokenInput`
- Suffix payload types with `Payload`: `ProductMutationPayload`
- Suffix filter types with `Filters`: `ProductFilters`
- React component props: `{ComponentName}Props` interface
## Code Style
- Single quotes for strings: `'hello'` not `"hello"`
- JSX single quotes: `<Button name='submit'>` not `name="submit"`
- No trailing commas: `{ a, b }` not `{ a, b, }`
- 2-space indentation (not tabs)
- Semicolons required: `const x = 5;`
- Arrow functions always have parens: `(x) => x` not `x => x`
- Experimental Tailwind CSS sorting enabled
- Enabled plugins: eslint, typescript, unicorn, oxc, react, nextjs, import, jsx-a11y
- `no-console`: warn (allow `console.warn` and `console.error` only)
- `no-unused-vars`: warn (allow vars/params starting with `_`)
- `no-unused-expressions`: warn
- `@typescript-eslint/no-explicit-any`: warn (avoid `any` in application code)
- `react/react-in-jsx-scope`: off (React 19+ doesn't need import)
- `react-hooks/rules-of-hooks`: error (strict enforcement)
- `react-hooks/exhaustive-deps`: warn
- `jsx-a11y` warnings enabled for accessibility
## Import Organization
- `@/*` maps to `src/` — use exclusively for all imports
- Never use relative imports like `../../../` except for same-feature sibling files
- Barrel files (`index.tsx`) re-export from public modules for cleaner imports
## Icons
- **Import from:** `@/components/icons` (or `src/components/icons.tsx`)
- **Never import from:** `@tabler/icons-react` directly in component files
- The registry (`src/components/icons.tsx`) wraps all @tabler icons and exports them as `Icons.iconName`
## React Query Pattern
| File | Purpose | Example |
|------|---------|---------|
| `types.ts` | Type contracts (responses, filters, payloads) | `ProductFilters`, `ProductsResponse` |
| `service.ts` | Data access layer (fetch, ORM, or mock data) | `getProducts()`, `createProduct()` |
| `queries.ts` | TanStack React Query options + key factories | `productKeys`, `productsQueryOptions()` |
| `mutations.ts` | (Optional) Mutation hooks with `useMutation()` | `useCreateProduct()` |
- Use `useSuspenseQuery()` for data that must be loaded before render
- Use `useQuery()` for optional data
- Use `useMutation()` for form submissions with `invalidateQueries()` on success
## TanStack Form Pattern
| File | Purpose |
|------|---------|
| `schemas/{feature}.ts` | Zod schema + `z.infer<typeof schema>` type |
| `constants/{feature}-options.ts` | Select options, enums, static data |
| `components/{feature}-form.tsx` | Form UI component |
- Use `FormTextField`, `FormSelectField`, `FormCheckboxField`, etc. (composed variants with validation)
- Never use base `TextField` directly in forms (use composed version)
- Field error display is automatic via form context
- Schema validation: `Zod` (`z.object()`, `z.string().min()`, etc.)
- Multi-level: field-level + form-level (cross-field)
- Async validators supported (debounced)
## Page Headers
- `pageTitle`: string — Main heading
- `pageDescription`: (optional) string — Subtitle
- `pageHeaderAction`: (optional) ReactNode — Button/action in header
## Error Handling
- Response types include `success` boolean and optional `error` string
- Route handlers validate input with Zod at boundaries
- Services never throw on external API failures — return error in response object
## Logging
- `console.log()` not allowed in production code (oxlint warns)
- `console.warn()` and `console.error()` allowed (see oxlint config)
- Server-side: use production logger (Sentry via `@sentry/nextjs`)
- Client-side: use Sentry for errors, toast for user messages
- Component render functions (use effects or callbacks)
- Utility functions (return values or throw errors instead)
- API services (let route handlers log)
## Comments
- Complex business logic only (algorithm, data transformation)
- Non-obvious type decisions (why `type` vs `interface`)
- Large blocks marked with ASCII dividers (see `src/components/ui/tanstack-form.tsx`)
- API service files: brief comment describing current backend pattern (mock, server actions, route handlers, external)
- Used in exported utility functions (see `src/lib/api-client.ts`)
- Minimal in React components (props are self-documenting via `interface {Name}Props`)
## TypeScript
- Strict mode enabled
- Explicit return types for exported functions
- Prefer `interface` over `type` for object shapes (but use `type` for unions/intersections)
- `z.infer<typeof schema>` for form values (never manual `type ProductFormValues = {...}`)
- Use `unknown` for external/untrusted input, narrow safely
- Avoid `any` in application code (oxlint warns)
## Module Design
- Named exports preferred over default exports (easier refactoring)
- Barrel files (`index.tsx`) only for public APIs (components, hooks, utils)
- Never export implementation details from barrels
## Data Fetching Patterns
- Use `nuqs` with `searchParamsCache` on server, `useQueryStates` on client
- Share same parser for sort state: `getSortingStateParser` (same parser as `useDataTable`)
- Import mock APIs directly in components
- Call services without going through React Query
- Skip prefetching on server routes (RSC advantage lost)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Server Components (RSC) as default; `'use client'` only where interactivity needed
- Feature-scoped API layers (types → service → queries) to decouple frontend from backend
- React Query (TanStack Query) for all data fetching with server-side prefetch + client-side hydration
- Nuqs for URL-driven table state (pagination, filters, sorting)
- TanStack Form + Zod for form handling with client-side validation
- Supabase Auth for user authentication with RBAC via `profiles` table role field
## Layers
- Purpose: React components (Server + Client) responsible for rendering
- Location: `src/components/` (reusable UI) + `src/features/*/components/` (feature-specific views)
- Contains: shadcn/ui components, layout wrappers, form fields, tables, feature pages
- Depends on: Features (via imports), API queries, hooks
- Used by: App routes and other components
- Purpose: Encapsulate data fetching and mutation contracts
- Location: `src/features/{feature}/api/` (types.ts → service.ts → queries.ts → mutations.ts)
- Pattern:
- Depends on: Mock data, backend API, ORM, or Route Handlers
- Used by: Components via `useSuspenseQuery`, `useMutation`, or server `prefetchQuery`
- Purpose: Prefetch and dehydrate query state on server before client hydration
- Location: `src/features/{feature}/components/{listing-page}.tsx` (Server Component wrapper)
- Pattern:
- Depends on: `src/lib/query-client.ts`, API queries, search params
- Purpose: Interactive UI updates (pagination, filtering, sorting) without server round-trips
- Pattern: `useSuspenseQuery` in Server Component + `<Suspense fallback>` for streaming
- Shallow sync with nuqs: table state changes sync to URL without full page reload
- Pagination/filter changes trigger new query via same `productsQueryOptions(filters)`, hit server handler or mock
- Purpose: API endpoints for mutations, proxies to external backends, or server-only operations
- Location: `src/app/api/{feature}/` (Next.js Route Handlers)
- Current state: Most routes return mock data or forward to mock API layer
- Patterns supported:
- Purpose: Tailwind CSS v4 + theme system with OKLCH color format
- Location: `src/styles/globals.css`, `src/styles/theme.css`, `src/components/themes/`
- Pattern: CSS custom properties for colors, `next-themes` provider for system/light/dark toggle
- Brand colors in `tailwind.config.js`: `brand-teal` (dark), `brand-sage` (accent), `brand-beige` (bg)
- Purpose: Shared helpers, constants, and type definitions
- Location:
## Data Flow
- **URL state**: Pagination, filters, sorting → managed by nuqs (searchParamsCache on server, useQueryStates on client)
- **Server state**: Data from backend → managed by React Query (prefetch + hydration)
- **Local UI state**: Sidebar open/close, theme, modals → managed by Zustand (in-memory) or cookies
- **Auth state**: User + profile → managed via `useAuth()` hook + Supabase session
## Key Abstractions
- Purpose: Self-contained vertical slice with API layer + components
- Examples: `src/features/products/`, `src/features/users/`, `src/features/demos/`
- Pattern:
- Purpose: Generate query keys (cache keys) and query functions
- Location: `src/features/{feature}/api/queries.ts`
- Pattern:
- Used by: Server prefetch + client `useSuspenseQuery`
- Purpose: Bridge server-side prefetch to client hydration without waterfall requests
- Pattern: Server Component wraps client component, dehydrated state passed as prop
- Avoids: Suspense on initial load, N+1 requests, client-side prefetch race conditions
- Purpose: URL source-of-truth for table state (pagination, filters, sorting)
- Server pattern: `searchParamsCache.parse(searchParams)` → read via `searchParamsCache.get(key)`
- Client pattern: `useQueryStates(schema)` → tuple `[value, setValue]` updates URL
- Benefits: Shareable links, back/forward button works, single source of truth
- Purpose: Swappable backend implementation
- Current: Mock data in `src/constants/mock-api.ts`
- Swap path:
## Entry Points
- Location: `src/app/layout.tsx`
- Triggers: Application startup
- Responsibilities:
- Location: `src/app/auth/sign-in/page.tsx`
- Triggers: Unauthenticated user navigation
- Responsibilities: Sign-in form (email/password via Supabase)
- Location: `src/app/page.tsx`
- Triggers: Direct navigation to `/`
- Responsibilities: Check auth state, redirect to `/dashboard/overview` or `/auth/sign-in`
- Location: `src/app/dashboard/layout.tsx`
- Triggers: Authenticated user entering `/dashboard/**`
- Responsibilities:
- Location: `src/app/dashboard/{feature}/page.tsx` (Server Component)
- Triggers: User navigates to feature (e.g., `/dashboard/products`)
- Responsibilities:
- Location: `src/app/api/{feature}/{action}.ts` (Route Handlers)
- Triggers: Frontend mutations or external integrations
- Responsibilities: Validate input, call ORM/service, return JSON response
## Error Handling
## Cross-Cutting Concerns
- No console.log in production code
- Sentry integration for error tracking
- Route handler logging via console (server-side only)
- Input: Zod schemas in `src/features/{feature}/schemas/`
- API responses: TypeScript types in `src/features/{feature}/api/types.ts`
- Forms: TanStack Form + Zod via `useAppForm()` hook
- Supabase Auth session via `createClient()` (client) or `createClient()` (server)
- User + profile loaded in `useAuth()` hook
- Role checked in nav items via `access: { role: 'admin' }` in nav-config.ts
- Server-side: Check session before API route execution or server action
- Navigation: Client-side filtering via `useAuth()` role in `use-nav.ts`
- API: Supabase RLS (Row-Level Security) policies on tables
- Features: Access check in components using `useAuth()` + conditional render
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| find-skills | Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable skill. | `.claude/skills/find-skills/SKILL.md` |
| frontend-design | Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics. | `.claude/skills/frontend-design/SKILL.md` |
| kiranism-shadcn-dashboard | \| Guide for building features, pages, tables, forms, themes, and navigation in this Next.js 16 shadcn dashboard template. Use this skill whenever the user wants to add a new page, create a feature module, build a data table, add a form, configure navigation items, add a theme, set up RBAC access control, or work with the dashboard's patterns and conventions. Also triggers when adding routes under /dashboard, working with Clerk auth/orgs/billing, creating mock APIs, or modifying the sidebar. Even if the user doesn't mention "dashboard" explicitly — if they're adding UI, pages, or features to this project, use this skill. | `.claude/skills/kiranism-shadcn-dashboard/SKILL.md` |
| next-best-practices | Next.js best practices - file conventions, RSC boundaries, data patterns, async APIs, metadata, error handling, route handlers, image/font optimization, bundling | `.claude/skills/next-best-practices/SKILL.md` |
| shadcn | Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, --preset codes, or any project with a components.json file. Also triggers for "shadcn init", "create an app with --preset", or "switch to --preset". | `.claude/skills/shadcn/SKILL.md` |
| skill-creator | Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better triggering accuracy. | `.claude/skills/skill-creator/SKILL.md` |
| vercel-composition-patterns | React composition patterns that scale. Use when refactoring components with boolean prop proliferation, building flexible component libraries, or designing reusable APIs. Triggers on tasks involving compound components, render props, context providers, or component architecture. Includes React 19 API changes. | `.claude/skills/vercel-composition-patterns/SKILL.md` |
| vercel-react-best-practices | React and Next.js performance optimization guidelines from Vercel Engineering. This skill should be used when writing, reviewing, or refactoring React/Next.js code to ensure optimal performance patterns. Triggers on tasks involving React components, Next.js pages, data fetching, bundle optimization, or performance improvements. | `.claude/skills/vercel-react-best-practices/SKILL.md` |
| web-design-guidelines | Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices". | `.claude/skills/web-design-guidelines/SKILL.md` |
| tanstack-form | Headless, performant, and type-safe form state management for TS/JS, React, Vue, Angular, Solid, Lit, and Svelte. | `.agents/skills/tanstack-form/SKILL.md` |
| tanstack-query | TanStack Query v5 data fetching patterns including useSuspenseQuery, useQuery, mutations, cache management, and API service integration. Use when fetching data, managing server state, or working with TanStack Query hooks. | `.agents/skills/tanstack-query/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

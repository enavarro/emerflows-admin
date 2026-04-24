# Architecture

**Analysis Date:** 2026-04-24

## Pattern Overview

**Overall:** Next.js 16 App Router with feature-based module architecture

**Key Characteristics:**
- Server Components (RSC) as default; `'use client'` only where interactivity needed
- Feature-scoped API layers (types → service → queries) to decouple frontend from backend
- React Query (TanStack Query) for all data fetching with server-side prefetch + client-side hydration
- Nuqs for URL-driven table state (pagination, filters, sorting)
- TanStack Form + Zod for form handling with client-side validation
- Supabase Auth for user authentication with RBAC via `profiles` table role field

## Layers

**Presentation Layer:**
- Purpose: React components (Server + Client) responsible for rendering
- Location: `src/components/` (reusable UI) + `src/features/*/components/` (feature-specific views)
- Contains: shadcn/ui components, layout wrappers, form fields, tables, feature pages
- Depends on: Features (via imports), API queries, hooks
- Used by: App routes and other components

**API Layer (per feature):**
- Purpose: Encapsulate data fetching and mutation contracts
- Location: `src/features/{feature}/api/` (types.ts → service.ts → queries.ts → mutations.ts)
- Pattern:
  - `types.ts`: Response/request TypeScript types (source of truth for shape)
  - `service.ts`: Data access functions (swap implementation here when changing backend)
  - `queries.ts`: React Query `queryOptions` + key factories for prefetch/client use
  - `mutations.ts`: React Query `mutationFn` + invalidation patterns
- Depends on: Mock data, backend API, ORM, or Route Handlers
- Used by: Components via `useSuspenseQuery`, `useMutation`, or server `prefetchQuery`

**Server-Side Data Fetching:**
- Purpose: Prefetch and dehydrate query state on server before client hydration
- Location: `src/features/{feature}/components/{listing-page}.tsx` (Server Component wrapper)
- Pattern:
  1. Read URL search params with `searchParamsCache.parse(searchParams)`
  2. Build filter object from search params
  3. Call `getQueryClient()` (server-only singleton)
  4. Invoke `void queryClient.prefetchQuery(queryOptions)`
  5. Wrap client component with `<HydrationBoundary state={dehydrate(queryClient)}>`
  6. Client hydrates with prefetched data, avoids waterfall request
- Depends on: `src/lib/query-client.ts`, API queries, search params

**Client-Side Data Fetching:**
- Purpose: Interactive UI updates (pagination, filtering, sorting) without server round-trips
- Pattern: `useSuspenseQuery` in Server Component + `<Suspense fallback>` for streaming
- Shallow sync with nuqs: table state changes sync to URL without full page reload
- Pagination/filter changes trigger new query via same `productsQueryOptions(filters)`, hit server handler or mock

**Route Handlers & Backend Integration:**
- Purpose: API endpoints for mutations, proxies to external backends, or server-only operations
- Location: `src/app/api/{feature}/` (Next.js Route Handlers)
- Current state: Most routes return mock data or forward to mock API layer
- Patterns supported:
  1. **Direct ORM**: Add `'use server'` to `src/features/*/api/service.ts`, call Prisma/Drizzle
  2. **Route Handlers**: Service calls `apiClient()` → `src/app/api/` handlers → ORM
  3. **BFF**: Route handlers proxy to external backend (Go, Laravel, etc.)
  4. **Supabase**: Direct Supabase client via `@supabase/supabase-js`

**Styling & Theme:**
- Purpose: Tailwind CSS v4 + theme system with OKLCH color format
- Location: `src/styles/globals.css`, `src/styles/theme.css`, `src/components/themes/`
- Pattern: CSS custom properties for colors, `next-themes` provider for system/light/dark toggle
- Brand colors in `tailwind.config.js`: `brand-teal` (dark), `brand-sage` (accent), `brand-beige` (bg)

**Utility & Type Layer:**
- Purpose: Shared helpers, constants, and type definitions
- Location:
  - `src/lib/utils.ts`: `cn()` (class merge), `formatBytes()`, etc.
  - `src/lib/searchparams.ts`: URL search param parsers (via nuqs)
  - `src/lib/query-client.ts`: React Query client singleton
  - `src/types/index.ts`: NavItem, UserRole, etc.
  - `src/constants/`: Mock data, navigation config, filter options

## Data Flow

**Server-side Prefetch → Client Hydration:**

1. User navigates to `/dashboard/products?page=2&sort=name`
2. Next.js calls route handler: `src/app/dashboard/product/page.tsx` (Server Component)
3. Route extracts search params via `searchParamsCache.parse(searchParams)`
4. Route calls `ProductListingPage()` component (also Server Component)
5. Component builds filters object: `{ page: 2, limit: 10, sort: 'name' }`
6. Component gets query client: `getQueryClient()` → creates server-only instance
7. Component prefetches: `void queryClient.prefetchQuery(productsQueryOptions(filters))`
   - This calls `service.getProducts(filters)` → mock data
   - Result cached in query client store
8. Component dehydrates: `dehydrate(queryClient)` → JSON state
9. Component wraps child with: `<HydrationBoundary state={dehydrate(queryClient)}>`
10. HTML shipped to client with dehydrated state embedded
11. Client hydrates: New QueryClientProvider reconstructs state from JSON
12. `<ProductTable />` Client Component calls `useSuspenseQuery(productsQueryOptions(filters))`
13. Query suspends initially (dehydrated data takes priority), resolves instantly from cache
14. Table renders with data, `<Suspense fallback>` never shows (instant hydration)

**Client-side Table Interaction (shallow sync):**

1. User clicks "next page" button in table
2. `useDataTable()` hook (via nuqs) updates URL params: `?page=3`
3. URL change triggers `searchParamsCache.get('page')` re-evaluation (no server call)
4. New filter object `{ page: 3, ... }` flows back to `useSuspenseQuery`
5. React Query detects cache miss for `productKeys.list({ page: 3, ... })`
6. New request fires (to mock or Route Handler)
7. Data arrives, table re-renders

**Form Submission (mutations):**

1. User fills form and clicks submit
2. Form uses `useAppForm()` + Zod schema validation
3. On submit, `useMutation({ mutationFn: createProduct })` fires
4. Mutation calls service: `createProduct(data)` → Route Handler → ORM/mock
5. On success: `invalidateQueries({ queryKey: productKeys.all })` → stale products list
6. React Query background refetch triggers → table data updates
7. Toast notification via `sonner`

**State Management:**

- **URL state**: Pagination, filters, sorting → managed by nuqs (searchParamsCache on server, useQueryStates on client)
- **Server state**: Data from backend → managed by React Query (prefetch + hydration)
- **Local UI state**: Sidebar open/close, theme, modals → managed by Zustand (in-memory) or cookies
- **Auth state**: User + profile → managed via `useAuth()` hook + Supabase session

## Key Abstractions

**Feature Module:**
- Purpose: Self-contained vertical slice with API layer + components
- Examples: `src/features/products/`, `src/features/users/`, `src/features/demos/`
- Pattern:
  ```
  features/products/
  ├── api/
  │   ├── types.ts           # Data contracts
  │   ├── service.ts         # Data access (swap backend here)
  │   ├── queries.ts         # React Query query factories
  │   └── mutations.ts       # React Query mutation factories
  ├── components/
  │   ├── product-listing.tsx        # Server Component: prefetch + HydrationBoundary
  │   ├── product-tables/
  │   │   └── product-table.tsx      # Client Component: useSuspenseQuery + table
  │   └── product-form.tsx           # Form with useMutation
  ├── schemas/
  │   └── product.ts         # Zod validation schemas
  ├── constants/
  │   └── index.ts           # Filter options, defaults
  └── types.ts (optional)    # Feature-specific types
  ```

**Query Options Factory (key factory pattern):**
- Purpose: Generate query keys (cache keys) and query functions
- Location: `src/features/{feature}/api/queries.ts`
- Pattern:
  ```typescript
  export const productKeys = {
    all: ['products'] as const,
    list: (filters) => [...productKeys.all, 'list', filters] as const,
    detail: (id) => [...productKeys.all, 'detail', id] as const
  };

  export const productsQueryOptions = (filters) =>
    queryOptions({
      queryKey: productKeys.list(filters),
      queryFn: () => getProducts(filters)
    });
  ```
- Used by: Server prefetch + client `useSuspenseQuery`

**HydrationBoundary + dehydrate:**
- Purpose: Bridge server-side prefetch to client hydration without waterfall requests
- Pattern: Server Component wraps client component, dehydrated state passed as prop
- Avoids: Suspense on initial load, N+1 requests, client-side prefetch race conditions

**Nuqs Search Params Cache:**
- Purpose: URL source-of-truth for table state (pagination, filters, sorting)
- Server pattern: `searchParamsCache.parse(searchParams)` → read via `searchParamsCache.get(key)`
- Client pattern: `useQueryStates(schema)` → tuple `[value, setValue]` updates URL
- Benefits: Shareable links, back/forward button works, single source of truth

**Service Layer (data access):**
- Purpose: Swappable backend implementation
- Current: Mock data in `src/constants/mock-api.ts`
- Swap path:
  1. Change service function bodies in `src/features/*/api/service.ts`
  2. If using ORM (Prisma): Add `'use server'`, import ORM, replace mock calls
  3. If using Route Handlers: Import `apiClient()`, call `/api/...` endpoints
  4. Types and queries unchanged → zero impact on components

## Entry Points

**Root App:**
- Location: `src/app/layout.tsx`
- Triggers: Application startup
- Responsibilities:
  - Cookie-based theme loading
  - Root providers setup: ThemeProvider, NuqsAdapter, Providers (Query + Auth)
  - Styles & metadata
  - Toaster (sonner notifications)

**Auth Entry:**
- Location: `src/app/auth/sign-in/page.tsx`
- Triggers: Unauthenticated user navigation
- Responsibilities: Sign-in form (email/password via Supabase)

**Public Entry (unauthenticated):**
- Location: `src/app/page.tsx`
- Triggers: Direct navigation to `/`
- Responsibilities: Check auth state, redirect to `/dashboard/overview` or `/auth/sign-in`

**Dashboard Root:**
- Location: `src/app/dashboard/layout.tsx`
- Triggers: Authenticated user entering `/dashboard/**`
- Responsibilities:
  - Sidebar + header layout
  - Sidebar open/close state persisted to cookie
  - Infobar provider
  - KBar (command palette)

**Feature Pages:**
- Location: `src/app/dashboard/{feature}/page.tsx` (Server Component)
- Triggers: User navigates to feature (e.g., `/dashboard/products`)
- Responsibilities:
  - Parse search params via nuqs
  - Prefetch data via React Query
  - Dehydrate + wrap listing component with HydrationBoundary
  - PageContainer wrapper with title + action button

**API Routes:**
- Location: `src/app/api/{feature}/{action}.ts` (Route Handlers)
- Triggers: Frontend mutations or external integrations
- Responsibilities: Validate input, call ORM/service, return JSON response

## Error Handling

**Strategy:** Explicit error handling at every boundary

**Patterns:**

1. **Server-side (Server Components):**
   - Try-catch in data fetching, throw Error or custom AppError
   - Next.js global-error.tsx catches unhandled server errors
   - Sentry integration via `@sentry/nextjs` for logging

2. **Client-side (Client Components):**
   - useMutation error handling: `onError` callback
   - useQuery error fallback: `<Suspense fallback>` + `<ErrorBoundary>`
   - Keyboard shortcuts / event handlers: try-catch, toast error via sonner

3. **API Routes:**
   - Route handlers check auth (Supabase session)
   - Validation via Zod, return 400 with error message
   - Service layer errors propagate as 500 with generic message
   - Error logging to Sentry/console

4. **Form Errors:**
   - TanStack Form tracks field errors via Zod validation
   - Display via `<FieldError>` component
   - Submission errors via `onSubmit` error handling → toast

## Cross-Cutting Concerns

**Logging:** 
- No console.log in production code
- Sentry integration for error tracking
- Route handler logging via console (server-side only)

**Validation:**
- Input: Zod schemas in `src/features/{feature}/schemas/`
- API responses: TypeScript types in `src/features/{feature}/api/types.ts`
- Forms: TanStack Form + Zod via `useAppForm()` hook

**Authentication:**
- Supabase Auth session via `createClient()` (client) or `createClient()` (server)
- User + profile loaded in `useAuth()` hook
- Role checked in nav items via `access: { role: 'admin' }` in nav-config.ts
- Server-side: Check session before API route execution or server action

**Authorization (RBAC):**
- Navigation: Client-side filtering via `useAuth()` role in `use-nav.ts`
- API: Supabase RLS (Row-Level Security) policies on tables
- Features: Access check in components using `useAuth()` + conditional render

---

*Architecture analysis: 2026-04-24*

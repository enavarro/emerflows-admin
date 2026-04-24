# Coding Conventions

**Analysis Date:** 2026-04-24

## Naming Patterns

**Files:**
- Components: PascalCase (`ProductListing.tsx`, `DemoMintSheet.tsx`)
- Utilities/services: kebab-case with suffix (`api-client.ts`, `search-params.ts`, `demo-jwt.ts`)
- Hooks: camelCase with `use` prefix (`useAuth.ts`, `useNavigation.ts`)
- API layer files: fixed pattern `types.ts` → `service.ts` → `queries.ts` → `mutations.ts`
- Constants: kebab-case (`product-options.ts`, `mock-api.ts`)
- Schemas: kebab-case with feature prefix (`product.ts` inside `features/products/schemas/`)

**Functions:**
- camelCase for all functions (`getProducts()`, `mintToken()`, `listTokens()`)
- Export public functions explicitly; prefix private functions with underscore or nest inside closures
- React hooks: `useFormFields<T>()`, `useSuspenseQuery()` (TanStack patterns)
- Service functions: `getProducts()`, `createProduct()`, `updateProduct()`, `deleteProduct()` (CRUD pattern)

**Variables:**
- camelCase for all variables and constants
- React state: `const [isLoading, setIsLoading] = useState(false)`
- Query key factories: `const demoKeys = { all: ['demos'] as const, tokens: () => [...], spend: () => [...] }`

**Types:**
- PascalCase for interfaces, types, and type aliases: `Product`, `ProductFilters`, `ProductFormValues`
- Suffix response types with `Response`: `ListTokensResponse`, `SpendResponse`, `MintTokenResponse`
- Suffix input types with `Input`: `MintTokenInput`
- Suffix payload types with `Payload`: `ProductMutationPayload`
- Suffix filter types with `Filters`: `ProductFilters`
- React component props: `{ComponentName}Props` interface

## Code Style

**Formatting (oxfmt):**
- Single quotes for strings: `'hello'` not `"hello"`
- JSX single quotes: `<Button name='submit'>` not `name="submit"`
- No trailing commas: `{ a, b }` not `{ a, b, }`
- 2-space indentation (not tabs)
- Semicolons required: `const x = 5;`
- Arrow functions always have parens: `(x) => x` not `x => x`
- Experimental Tailwind CSS sorting enabled

**Linting (oxlint):**
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

**Order (top to bottom):**
1. Third-party libraries (`react`, `@tanstack/react-query`, `zod`)
2. shadcn/ui and Radix UI components (`@/components/ui/*`)
3. Project components (`@/components/forms/fields`, `@/components/layout`)
4. Feature API layer (`../api/queries`, `../api/service`, `../api/types`)
5. Constants and utilities (`@/constants/*`, `@/lib/*`)
6. Local relative imports (`./styles`, `./utils`)

**Path aliases:**
- `@/*` maps to `src/` — use exclusively for all imports
- Never use relative imports like `../../../` except for same-feature sibling files
- Barrel files (`index.tsx`) re-export from public modules for cleaner imports

**Example (from src/features/products/components/product-listing.tsx):**
```typescript
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { searchParamsCache } from '@/lib/searchparams';
import { productsQueryOptions } from '../api/queries';
import { ProductTable } from './product-tables';
```

## Icons

**Rule:** Only import icons from the centralized icon registry.
- **Import from:** `@/components/icons` (or `src/components/icons.tsx`)
- **Never import from:** `@tabler/icons-react` directly in component files
- The registry (`src/components/icons.tsx`) wraps all @tabler icons and exports them as `Icons.iconName`

**Usage:**
```typescript
// WRONG: Direct import from @tabler
import { IconPlus } from '@tabler/icons-react';

// CORRECT: Import from registry
import { Icons } from '@/components/icons';
const PlusIcon = Icons.plus;
```

## React Query Pattern

**Architecture:** Feature-based API layer with three files:

| File | Purpose | Example |
|------|---------|---------|
| `types.ts` | Type contracts (responses, filters, payloads) | `ProductFilters`, `ProductsResponse` |
| `service.ts` | Data access layer (fetch, ORM, or mock data) | `getProducts()`, `createProduct()` |
| `queries.ts` | TanStack React Query options + key factories | `productKeys`, `productsQueryOptions()` |
| `mutations.ts` | (Optional) Mutation hooks with `useMutation()` | `useCreateProduct()` |

**Key factories pattern:**
```typescript
export const productKeys = {
  all: ['products'] as const,
  list: (filters: ProductFilters) => [...productKeys.all, 'list', filters] as const,
  detail: (id: number) => [...productKeys.all, 'detail', id] as const
};
```

**Server-side prefetching:**
```typescript
const queryClient = getQueryClient();
void queryClient.prefetchQuery(productsQueryOptions(filters));
return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
```

**Client-side queries:**
- Use `useSuspenseQuery()` for data that must be loaded before render
- Use `useQuery()` for optional data
- Use `useMutation()` for form submissions with `invalidateQueries()` on success

## TanStack Form Pattern

**Architecture:** Schema-driven forms with composable fields:

| File | Purpose |
|------|---------|
| `schemas/{feature}.ts` | Zod schema + `z.infer<typeof schema>` type |
| `constants/{feature}-options.ts` | Select options, enums, static data |
| `components/{feature}-form.tsx` | Form UI component |

**Form hook pattern:**
```typescript
const form = useAppForm({
  defaultValues: { ... } as ProductFormValues,
  validators: { onSubmit: productSchema },
  onSubmit: async (values) => { ... }
});

const { FormTextField, FormSelectField } = useFormFields<ProductFormValues>();
```

**Field components:**
- Use `FormTextField`, `FormSelectField`, `FormCheckboxField`, etc. (composed variants with validation)
- Never use base `TextField` directly in forms (use composed version)
- Field error display is automatic via form context

**Validation:**
- Schema validation: `Zod` (`z.object()`, `z.string().min()`, etc.)
- Multi-level: field-level + form-level (cross-field)
- Async validators supported (debounced)

## Page Headers

**Rule:** Use `PageContainer` props for consistency, never manually import `<Heading>`.

**Pattern:**
```typescript
import { PageContainer } from '@/components/layout/page-container';

export default function DemosPage() {
  return (
    <PageContainer
      pageTitle='Demo Tokens'
      pageDescription='Mint and manage demo JWTs'
      pageHeaderAction={<NewDemoButton />}
    >
      {/* page content */}
    </PageContainer>
  );
}
```

**Props:**
- `pageTitle`: string — Main heading
- `pageDescription`: (optional) string — Subtitle
- `pageHeaderAction`: (optional) ReactNode — Button/action in header

## Error Handling

**Pattern:** Always handle errors explicitly at boundaries.

**Try-catch with type narrowing:**
```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error: unknown) {
  if (error instanceof Error) {
    logger.error('Operation failed', error.message);
    throw new Error(`Failed to load: ${error.message}`);
  }
  throw new Error('Unexpected error');
}
```

**React Query mutation errors:**
```typescript
const { mutate, error } = useMutation({
  mutationFn: createProduct,
  onError: (err) => {
    toast.error(err.message || 'Failed to create');
  }
});
```

**API responses:**
- Response types include `success` boolean and optional `error` string
- Route handlers validate input with Zod at boundaries
- Services never throw on external API failures — return error in response object

## Logging

**Framework:** `console` (warn/error only in oxlint rules).

**Rules:**
- `console.log()` not allowed in production code (oxlint warns)
- `console.warn()` and `console.error()` allowed (see oxlint config)
- Server-side: use production logger (Sentry via `@sentry/nextjs`)
- Client-side: use Sentry for errors, toast for user messages

**No logging statements in:**
- Component render functions (use effects or callbacks)
- Utility functions (return values or throw errors instead)
- API services (let route handlers log)

## Comments

**When to comment:**
- Complex business logic only (algorithm, data transformation)
- Non-obvious type decisions (why `type` vs `interface`)
- Large blocks marked with ASCII dividers (see `src/components/ui/tanstack-form.tsx`)
- API service files: brief comment describing current backend pattern (mock, server actions, route handlers, external)

**JSDoc/TSDoc:**
- Used in exported utility functions (see `src/lib/api-client.ts`)
- Minimal in React components (props are self-documenting via `interface {Name}Props`)

**Example comment block:**
```typescript
// ============================================================
// Product Service — Data Access Layer
// ============================================================
// This is the ONLY file you modify when connecting to your backend.
// Current: Mock (in-memory fake data for demo/prototyping)
// ============================================================
```

## TypeScript

**Type safety rules:**
- Strict mode enabled
- Explicit return types for exported functions
- Prefer `interface` over `type` for object shapes (but use `type` for unions/intersections)
- `z.infer<typeof schema>` for form values (never manual `type ProductFormValues = {...}`)
- Use `unknown` for external/untrusted input, narrow safely
- Avoid `any` in application code (oxlint warns)

**Example:**
```typescript
interface Product {
  id: number;
  name: string;
  price: number;
}

type ProductRole = 'featured' | 'hidden';

export function formatProduct(product: Product): string {
  return `${product.name} — $${product.price}`;
}
```

## Module Design

**Exports:**
- Named exports preferred over default exports (easier refactoring)
- Barrel files (`index.tsx`) only for public APIs (components, hooks, utils)
- Never export implementation details from barrels

**Example (src/components/forms/fields/index.tsx):**
```typescript
export { TextField, FormTextField } from './text-field';
export { SelectField, FormSelectField } from './select-field';
// ... other fields
```

**Feature structure:**
```
features/products/
├── api/
│   ├── types.ts        (export Types, Filters, Responses, Payloads)
│   ├── service.ts      (export async functions)
│   ├── queries.ts      (export queryOptions, keys)
│   └── mutations.ts    (export useMutation hooks)
├── components/
│   ├── product-form.tsx
│   ├── product-listing.tsx
│   └── index.tsx       (re-export public components)
├── schemas/
│   └── product.ts      (export schema + inferred type)
└── constants/
    └── product-options.ts
```

## Data Fetching Patterns

**Server-side (RSC/prefetch):**
```typescript
// pages/dashboard/products.tsx
const queryClient = getQueryClient();
void queryClient.prefetchQuery(productsQueryOptions(filters));
return <HydrationBoundary state={dehydrate(queryClient)}><ProductTable /></HydrationBoundary>;
```

**Client-side:**
```typescript
// components/ProductTable.tsx
const { data } = useSuspenseQuery(productsQueryOptions(filters));
```

**URL params:**
- Use `nuqs` with `searchParamsCache` on server, `useQueryStates` on client
- Share same parser for sort state: `getSortingStateParser` (same parser as `useDataTable`)

**Never:**
- Import mock APIs directly in components
- Call services without going through React Query
- Skip prefetching on server routes (RSC advantage lost)

---

*Convention analysis: 2026-04-24*

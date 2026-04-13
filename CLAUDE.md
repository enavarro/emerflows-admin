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
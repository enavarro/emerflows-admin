---
phase: 01-foundations
plan: 05
type: execute
wave: 3
depends_on: [01-04]
files_modified:
  - src/components/icons.tsx
  - src/config/nav-config.ts
autonomous: false
requirements: [FND-01]
must_haves:
  truths:
    - "Sidebar has a top-level Teach group with one item linking to /dashboard/teach/cohorts"
    - "The Teach nav item is visible only to users whose profile.role = 'admin'"
    - "The Teach nav item uses an icon imported from @/components/icons (not @tabler/icons-react)"
    - "Clicking the Teach item navigates to /dashboard/teach/cohorts (the route gated by Plan 04)"
    - "Educators and unauthenticated users do NOT see the Teach nav entry"
  artifacts:
    - path: "src/components/icons.tsx"
      provides: "Adds 'school' icon export to the central Icons registry"
      contains: "school: IconSchool"
    - path: "src/config/nav-config.ts"
      provides: "Adds Teach group to navGroups with admin-only access guard"
      contains: "/dashboard/teach/cohorts"
  key_links:
    - from: "src/config/nav-config.ts"
      to: "/dashboard/teach/cohorts"
      via: "url field in NavItem"
      pattern: "url: '/dashboard/teach/cohorts'"
    - from: "src/config/nav-config.ts"
      to: "src/components/icons.tsx (school)"
      via: "icon string key"
      pattern: "icon: 'school'"
    - from: "src/config/nav-config.ts"
      to: "PermissionCheck role gate"
      via: "access field"
      pattern: "access: \\{ role: 'admin' \\}"
    - from: "src/hooks/use-nav.ts (useFilteredNavGroups)"
      to: "this nav item"
      via: "client-side role filter"
      pattern: "useFilteredNavGroups"
---

<objective>
Add a top-level `Teach` entry to the sidebar nav that links to `/dashboard/teach/cohorts`
and is visible only to admins. This is the user-facing surface that proves Phase 1
foundations are wired: an admin signs in, sees Teach in the sidebar, clicks it, and
lands on the (currently stubbed, gated) cohorts route. Non-admins do not see the entry
at all (client-side filter via `useFilteredNavGroups`) AND cannot reach the route by
URL (server-side gate from Plan 04).

Purpose: FND-01 — sidebar exposes the entry point for the Teach milestone.
Output: One new icon registration (`school`), one new nav group, and a human-verify
checkpoint that confirms admin-vs-educator visibility in a running browser.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/codebase/CONVENTIONS.md
@CLAUDE.md
@docs/nav-rbac.md
@src/config/nav-config.ts
@src/components/icons.tsx
@src/hooks/use-nav.ts
@src/types/index.ts

<interfaces>
<!-- The executor MUST NOT explore the codebase to discover these. They are the contract. -->

From src/types/index.ts (already exists):
```typescript
export interface PermissionCheck {
  role?: UserRole;  // 'admin' | 'educator'
}

export interface NavItem {
  title: string;
  url: string;
  disabled?: boolean;
  external?: boolean;
  shortcut?: [string, string];
  icon?: keyof typeof Icons;
  label?: string;
  description?: string;
  isActive?: boolean;
  items?: NavItem[];
  access?: PermissionCheck;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}
```

From src/components/icons.tsx (already exists, EXCERPT):
```typescript
import { IconBox, IconUser, ...other tabler icons } from '@tabler/icons-react';
export const Icons = {
  // ... existing entries ...
  product: IconBox,
  user: IconUser,
  // (no 'school' entry yet — this plan adds it)
};
```

From src/hooks/use-nav.ts (already exists, behavioral contract only):
```typescript
// useFilteredNavGroups(groups: NavGroup[]) returns NavGroup[]
// — filters out items whose access.role !== current user's profile.role
// — drops empty groups after filtering
```

From src/config/nav-config.ts (already exists, current shape):
```typescript
export const navGroups: NavGroup[] = [
  { label: 'Overview', items: [/* Dashboard, Product, Users, Demos */] },
  { label: 'Elements', items: [/* Forms, React Query, Icons */] },
  { label: '', items: [/* Account → Profile */] }
];
```

Tabler icon name to use:
- `IconSchool` from `@tabler/icons-react` — semantically matches Teach Admin (graduation/education context).
</interfaces>

<read_first_global>
The executor must read these BEFORE writing any task code:
- `src/components/icons.tsx` — full file, to confirm the alphabetical insertion point for `IconSchool` in the import block and where to add the `school` key in the `Icons` map (the file groups by category, not strictly alphabetical — match the existing structure).
- `src/config/nav-config.ts` — full file, to see the exact existing group/item shape so the new group matches.
- `docs/nav-rbac.md` — to confirm the `access: { role: 'admin' }` pattern is correct.
- `src/hooks/use-nav.ts` — to confirm filtering behavior so the access field has the expected effect.
- `src/types/index.ts` — to confirm `icon?: keyof typeof Icons;` so 'school' must exist in Icons before being referenced.
</read_first_global>

</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add 'school' icon to the central Icons registry</name>
  <files>src/components/icons.tsx</files>
  <read_first>
    - src/components/icons.tsx (full file) — note the import block alphabetical ordering of `IconS*` entries (IconSearch, IconSelector, IconSend, IconSettings, IconShare, IconSlash, IconSparkles, IconStack2, IconStar, IconSun) and the categorized `Icons` map (General, Navigation, Layout, User, Brand, ...).
  </read_first>
  <behavior>
    - After this change, `Icons.school` must be a valid React component (the `IconSchool` from @tabler/icons-react).
    - `keyof typeof Icons` must include the literal `'school'`, so `nav-config.ts` can reference `icon: 'school'` without a TS error.
    - No existing icon entries removed or renamed.
  </behavior>
  <action>
Edit `src/components/icons.tsx`:

Step 1 — Add `IconSchool` to the import block. Insert it alphabetically between
`IconRosetteDiscountCheck` and `IconSearch` (or between `IconSearch` and `IconSelector`,
whichever matches the existing alphabetical ordering — read the file first and pick the
position that matches the surrounding pattern). The import line should look like:

```typescript
  IconSchool,
```

Step 2 — Add the `school` key to the `Icons` constant. Insert it under the `// Misc`
or `// Layout` category — whichever group is most appropriate; if uncertain, place it
under `// Misc` (where `pizza`, `workspace`, `forms`, `slash`, `calendar`,
`galleryVerticalEnd`, `moreHorizontal` already live). The line should be:

```typescript
  school: IconSchool,
```

Constraints:
- Single quotes, 2-space indent, semicolons, no trailing commas (oxfmt config).
- Do NOT change any other entry.
- Do NOT change the `Icon` type alias.
- Do NOT introduce a new icon library — `IconSchool` is part of the existing
  `@tabler/icons-react` package, which is already a project dependency.
  </action>
  <acceptance_criteria>
    - `src/components/icons.tsx` imports `IconSchool` from `@tabler/icons-react`.
    - `Icons.school` is a defined export equal to `IconSchool`.
    - `npx tsc --noEmit -p tsconfig.json` reports zero errors.
    - `oxlint src/components/icons.tsx` reports zero errors.
    - `grep -n "IconSchool" src/components/icons.tsx` returns exactly two lines (the import and the map entry).
    - No other entries in the file were modified (verified by `git diff --stat src/components/icons.tsx` showing only additions).
  </acceptance_criteria>
  <verify>
    <automated>npx tsc --noEmit -p tsconfig.json 2>&amp;1 | grep -E 'icons.tsx' || echo 'OK: icons.tsx clean'</automated>
  </verify>
  <done>'school' icon is registered in the central Icons map; type system knows the key; no other icons disturbed.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add Teach group to navGroups with admin-only access</name>
  <files>src/config/nav-config.ts</files>
  <read_first>
    - src/config/nav-config.ts (full file) — confirm exact NavGroup shape and that no other items currently use `access: { role: 'admin' }`.
    - src/types/index.ts (NavItem.access, PermissionCheck) — confirm `access` field is optional and accepts `{ role: 'admin' }`.
    - src/hooks/use-nav.ts — confirm the filter drops items where access.role does not match the current profile role, and drops empty groups.
  </read_first>
  <behavior>
    - After this change, an admin user sees a new sidebar group `Teach` with one item `Cohorts` linking to `/dashboard/teach/cohorts`.
    - An educator user does NOT see the Teach group (item filtered out, group empty, group dropped).
    - An unauthenticated user does not see Teach (sidebar isn't rendered for them anyway, but the access guard is still set).
    - The keyboard shortcut for Cohorts is `t c` (matches existing two-letter shortcut convention).
  </behavior>
  <action>
Edit `src/config/nav-config.ts`. Add a new NavGroup entry to the `navGroups` array,
inserted AFTER the `'Overview'` group and BEFORE the `'Elements'` group (so the Teach
section is the second group, immediately below Overview, reflecting its primary
importance for admins). The new group MUST be exactly:

```typescript
  {
    label: 'Teach',
    items: [
      {
        title: 'Cohorts',
        url: '/dashboard/teach/cohorts',
        icon: 'school',
        shortcut: ['t', 'c'],
        isActive: false,
        access: { role: 'admin' },
        items: []
      }
    ]
  },
```

Constraints:
- Single quotes, 2-space indent, semicolons on statements, no trailing commas inside
  object literals (oxfmt config). The trailing comma after the closing `}` of the new
  group is required (it's a list separator, not a trailing comma inside an object).
- The `icon: 'school'` value MUST exist in `Icons` (Task 1 of this plan adds it).
  TypeScript will error otherwise via `icon?: keyof typeof Icons`.
- The `access: { role: 'admin' }` field is REQUIRED. Without it, educators would see
  the Teach entry in the sidebar (but Plan 04's server-side gate would still block
  the route — UX still works but is misleading; do not skip the access guard).
- Do NOT modify any existing group or item.
- Do NOT add additional Teach sub-items (Cohort detail, Learner detail, Submissions)
  in this plan — those routes ship in later phases. Only the cohorts entry exists
  now because that's the only route Phase 1 ships (gated stub).

After editing, the file's exported `navGroups` array length goes from 3 to 4. The
order is: Overview → Teach → Elements → '' (Account).
  </action>
  <acceptance_criteria>
    - `src/config/nav-config.ts` exports `navGroups` with 4 groups (was 3).
    - The new group has `label: 'Teach'` and exactly one item: `{ title: 'Cohorts', url: '/dashboard/teach/cohorts', icon: 'school', shortcut: ['t', 'c'], access: { role: 'admin' }, ... }`.
    - The new group is positioned at index 1 (between Overview at 0 and Elements at 2).
    - `npx tsc --noEmit -p tsconfig.json` reports zero errors. The `icon: 'school'` reference resolves because Task 1 already added it.
    - `oxlint src/config/nav-config.ts` reports zero errors.
    - `grep -n "/dashboard/teach/cohorts" src/config/nav-config.ts` returns exactly one line.
    - `grep -n "access: { role: 'admin' }" src/config/nav-config.ts` returns exactly one line.
    - No other navGroups entries were modified (verified by `git diff` showing only additions).
  </acceptance_criteria>
  <verify>
    <automated>npx tsc --noEmit -p tsconfig.json 2>&amp;1 | grep -E 'nav-config' || echo 'OK: nav-config clean'</automated>
  </verify>
  <done>navGroups has the Teach group with admin-only access guard linking to /dashboard/teach/cohorts.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Manual verify — admin sees Teach, educator does not</name>
  <what-built>
    - `Icons.school` registered in `src/components/icons.tsx`.
    - `Teach` nav group added to `src/config/nav-config.ts` with admin-only access.
    - The link target `/dashboard/teach/cohorts` is the gated stub from Plan 04.
  </what-built>
  <how-to-verify>
    1. Run `npm run dev` (or `bun run dev`) and wait for the dev server to be ready.
    2. Open `http://localhost:3000/auth/sign-in` in an incognito/private window.
    3. Sign in as a user whose `profiles.role = 'admin'` (use a known admin account from Supabase).
       - EXPECTED: Sidebar shows a `Teach` group with `Cohorts` item using a school/graduation-cap icon.
       - EXPECTED: Clicking `Cohorts` navigates to `/dashboard/teach/cohorts` and shows the Phase 2 stub heading ("Cohorts").
       - EXPECTED: Pressing `t` then `c` (kbar shortcut) also opens the cohorts route.
    4. Sign out and sign in as a user whose `profiles.role = 'educator'` (or use SQL editor to flip a test user's role for the duration of this verification).
       - EXPECTED: Sidebar does NOT show a `Teach` group at all.
       - EXPECTED: Manually navigating to `http://localhost:3000/dashboard/teach/cohorts` redirects to `/dashboard/overview?denied=teach` (server-side gate from Plan 04).
    5. Sign out completely.
       - EXPECTED: Manually navigating to `http://localhost:3000/dashboard/teach/cohorts` redirects to `/auth/sign-in` (middleware + server gate).
    6. Restore any test-user role changes you made.
  </how-to-verify>
  <files>(no files modified — verification-only checkpoint against the running dev server)</files>
  <action>Run the dev server and execute the three role scenarios in `<how-to-verify>` (admin sees Teach + can navigate; educator does not see it AND is server-redirected on direct URL; unauthenticated user is redirected to sign-in). This is a verification step against changes already shipped in Tasks 1 and 2 — no new code.</action>
  <verify>
    <automated>echo "Manual verification — see how-to-verify steps 1-6. Each role scenario must produce the expected outcome before this checkpoint is approved."</automated>
  </verify>
  <done>All three role scenarios pass: admin sees and reaches Teach; educator does not see it and is denied on direct URL; unauthenticated user is redirected to sign-in. Operator types `approved`.</done>
  <resume-signal>Type "approved" if all three role scenarios behave as expected. If anything diverges, describe the discrepancy (which step, expected vs actual, screenshot if visual) so the executor can fix before continuing.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → React (client) | Untrusted DOM; sidebar is rendered client-side based on session-derived role |
| client `useFilteredNavGroups` → display | Trust is "best-effort UX hide"; not a security boundary on its own |
| browser URL bar → /dashboard/teach/* | Real security boundary — enforced server-side by Plan 04's `requireAdmin()` |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-05-01 | I (Information Disclosure) | Educator sees Teach link in DOM | mitigate | `access: { role: 'admin' }` on the NavItem ensures `useFilteredNavGroups` strips it from the rendered sidebar. The link is never present in the educator's HTML. |
| T-01-05-02 | E (Elevation of Privilege) | Educator types URL directly | mitigate | The nav-level filter is UX, NOT security. The actual gate is Plan 04's server-side `requireAdmin()` — it cannot be bypassed by editing client state or URL. Documented as an explicit defense-in-depth pairing. |
| T-01-05-03 | T (Tampering) | Client mutates `navGroups` constant in DevTools | accept | Tampering only affects the local user's view; cannot grant access to gated routes (server still rejects). Acceptable for a local UX object. |
| T-01-05-04 | S (Spoofing) | Forged role in client state | mitigate | `useFilteredNavGroups` reads role from `useAuth()` which gets it from the live Supabase session via the SSR client. Plan 04's server gate is the authoritative check; a forged client role only changes what the user sees, not what they can fetch. |
| T-01-05-05 | D (Denial of Service) | Adding many nav items | accept | Single new item; no perf concern. |
</threat_model>

<verification>
- File presence: `src/components/icons.tsx` and `src/config/nav-config.ts` both exist (modified, not created).
- `Icons.school` is exported and equals `IconSchool` from `@tabler/icons-react`.
- `navGroups[1].label === 'Teach'`, `navGroups[1].items[0].url === '/dashboard/teach/cohorts'`, `navGroups[1].items[0].access.role === 'admin'`.
- `npx tsc --noEmit` is clean.
- Manual smoke (Task 3) confirms admin-vs-educator visibility in browser.
</verification>

<success_criteria>
1. Sidebar exposes a `Teach` entry linking to `/dashboard/teach/cohorts` for admins.
2. Educators and unauthenticated users do not see the entry.
3. The icon is imported via the central `@/components/icons` registry — no direct
   `@tabler/icons-react` import in `nav-config.ts`.
4. The route target matches Plan 04's gated stub, so the click-through works end to end.
5. Type system (`tsc --noEmit`) and linter (`oxlint`) are clean for both modified files.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundations/01-05-SUMMARY.md` with:
- Diff of `src/components/icons.tsx` (the two added lines).
- Diff of `src/config/nav-config.ts` (the new group block).
- Confirmation of the manual-verify checkpoint outcome (admin saw it, educator did not, unauth was redirected).
- Note any deviation from the action spec (e.g., if `IconSchool` did not exist in the installed version of @tabler/icons-react — unlikely, but flag if so and propose a fallback icon).
</output>

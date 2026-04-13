# Navigation RBAC System

## Overview

Simple role-based navigation filtering using Supabase Auth profiles.

Two roles: `admin` and `educator`. Navigation items can be restricted by role.

## Architecture

### Core Files

1. **`src/hooks/use-nav.ts`** - Filters nav items based on user role from Supabase profile
2. **`src/hooks/use-auth.ts`** - Provides auth state (user + profile with role)
3. **`src/types/index.ts`** - Type definitions with `access` property

### Why Client-Side?

- Navigation visibility is UX only, not security
- `useAuth()` provides the role from the Supabase `profiles` table
- Zero server calls for nav filtering, instant results

**Note**: For actual security (API routes, server actions), use server-side checks via `createClient()` from `@/lib/supabase/server`.

## Usage

### In `nav-config.ts`

```typescript
{
  title: 'Admin Panel',
  url: '/dashboard/admin',
  icon: 'settings',
  access: { role: 'admin' }
}
```

### In Components

```typescript
import { useFilteredNavItems } from '@/hooks/use-nav'

function MyComponent() {
  const filteredItems = useFilteredNavItems(navItems)
  // filteredItems is filtered based on user role
}
```

## Adding New Items

Just add to `nav-config.ts`:

```typescript
{
  title: 'New Feature',
  url: '/dashboard/new',
  icon: 'star',
  access: { role: 'admin' }
}
```

Items without `access` are visible to all authenticated users.

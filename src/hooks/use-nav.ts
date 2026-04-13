'use client';

import { useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { NavItem, NavGroup } from '@/types';

export function useFilteredNavItems(items: NavItem[]) {
  const { profile } = useAuth();

  return useMemo(() => {
    return items
      .filter((item) => {
        if (!item.access) return true;
        if (item.access.role && profile?.role !== item.access.role) return false;
        return true;
      })
      .map((item) => {
        if (item.items && item.items.length > 0) {
          const filteredChildren = item.items.filter((child) => {
            if (!child.access) return true;
            if (child.access.role && profile?.role !== child.access.role) return false;
            return true;
          });
          return { ...item, items: filteredChildren };
        }
        return item;
      });
  }, [items, profile?.role]);
}

export function useFilteredNavGroups(groups: NavGroup[]) {
  const allItems = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const filteredItems = useFilteredNavItems(allItems);

  return useMemo(() => {
    const filteredSet = new Set(filteredItems.map((item) => item.title));
    return groups
      .map((group) => ({
        ...group,
        items: filteredItems.filter((item) =>
          group.items.some((gi) => gi.title === item.title && filteredSet.has(gi.title))
        )
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, filteredItems]);
}

import { Fragment } from 'react';
import Link from 'next/link';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { Icons } from '@/components/icons';

export interface TeachBreadcrumbItem {
  label: string;
  // Omit href on the LAST item to render it as a non-link BreadcrumbPage
  // (current segment, aria-current='page'). Non-last items must have href.
  href?: string;
}

interface TeachBreadcrumbsProps {
  items: TeachBreadcrumbItem[];
}

export function TeachBreadcrumbs({ items }: TeachBreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${index}-${item.label}`}>
              <BreadcrumbItem className='hidden md:block'>
                {isLast || !item.href ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator className='hidden md:block'>
                  <Icons.slash />
                </BreadcrumbSeparator>
              )}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

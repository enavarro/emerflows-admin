'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Icons } from '@/components/icons';

export default function CohortsError({ error }: { error: Error }) {
  return (
    <div className='p-4 md:px-6'>
      <Alert variant='destructive'>
        <Icons.alertCircle className='h-4 w-4' aria-hidden='true' />
        <AlertTitle>Could not load cohorts</AlertTitle>
        <AlertDescription>
          Refresh the page to try again. If the problem persists, contact support.
          {error?.message ? ` (${error.message})` : ''}
        </AlertDescription>
      </Alert>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAppForm, useFormFields } from '@/components/ui/tanstack-form';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { Icons } from '@/components/icons';
import { mintTokenMutation } from '../api/mutations';
import { mintInputSchema, type MintInputValues } from '../schemas/mint-input';

export function MintTokenSheetTrigger() {
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    ...mintTokenMutation,
    onSuccess: ({ token }) => {
      navigator.clipboard?.writeText(token.url).catch(() => {});
      toast.success('Demo link minted and copied to clipboard');
      setOpen(false);
      form.reset();
    },
    onError: () => toast.error('Failed to mint demo link')
  });

  const form = useAppForm({
    defaultValues: { label: '' } as MintInputValues,
    validators: { onSubmit: mintInputSchema },
    onSubmit: async ({ value }) => {
      await mutation.mutateAsync(value);
    }
  });

  const { FormTextField } = useFormFields<MintInputValues>();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Icons.add className='mr-2 h-4 w-4' />
          New demo link
        </Button>
      </SheetTrigger>
      <SheetContent className='flex flex-col'>
        <SheetHeader>
          <SheetTitle>Mint a demo link</SheetTitle>
          <SheetDescription>
            Generates a 24h JWT-protected URL. Two submissions, max 210s conversation, copy the link
            from the toast or the table.
          </SheetDescription>
        </SheetHeader>

        <div className='flex-1 overflow-auto'>
          <form.AppForm>
            <form.Form id='mint-token-form' className='space-y-4'>
              <FormTextField
                name='label'
                label='Label'
                placeholder='e.g. Maria — Acme recruiter'
                description='Internal note. Helps you identify this link in the list.'
              />
            </form.Form>
          </form.AppForm>
        </div>

        <SheetFooter>
          <Button variant='outline' onClick={() => setOpen(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type='submit' form='mint-token-form' disabled={mutation.isPending}>
            {mutation.isPending ? 'Minting…' : 'Mint link'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

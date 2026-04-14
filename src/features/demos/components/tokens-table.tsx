'use client';

import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { tokensQueryOptions } from '../api/queries';
import { revokeTokenMutation } from '../api/mutations';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function TokensTable() {
  const { data } = useSuspenseQuery(tokensQueryOptions());
  const tokens = data.tokens;

  const revoke = useMutation({
    ...revokeTokenMutation,
    onSuccess: () => toast.success('Token revoked'),
    onError: () => toast.error('Failed to revoke token')
  });

  const onCopy = (url: string) => {
    navigator.clipboard
      ?.writeText(url)
      .then(() => toast.success('Link copied'))
      .catch(() => toast.error('Copy failed'));
  };

  if (tokens.length === 0) {
    return (
      <div className='text-muted-foreground rounded-md border p-8 text-center text-sm'>
        No active demo links. Click “New demo link” to mint one.
      </div>
    );
  }

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>By</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tokens.map((t) => (
            <TableRow key={t.jti}>
              <TableCell className='font-medium'>{t.label}</TableCell>
              <TableCell>{formatDate(t.createdAt)}</TableCell>
              <TableCell>{formatDate(t.expiresAt)}</TableCell>
              <TableCell className='text-muted-foreground text-sm'>{t.createdBy}</TableCell>
              <TableCell>
                {t.revoked ? (
                  <Badge variant='destructive'>Revoked</Badge>
                ) : (
                  <Badge variant='secondary'>Active</Badge>
                )}
              </TableCell>
              <TableCell className='space-x-2 text-right'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => onCopy(t.url)}
                  disabled={t.revoked}
                >
                  <Icons.share className='mr-1 h-3 w-3' />
                  Copy
                </Button>
                <Button
                  size='sm'
                  variant='destructive'
                  onClick={() => revoke.mutate(t.jti)}
                  disabled={t.revoked || revoke.isPending}
                >
                  <Icons.trash className='mr-1 h-3 w-3' />
                  Revoke
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

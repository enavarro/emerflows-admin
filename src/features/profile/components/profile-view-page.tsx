'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ProfileViewPage() {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [nameInitialized, setNameInitialized] = useState(false);

  // Initialize form values when profile loads
  if (profile && !nameInitialized) {
    setFullName(profile.full_name || '');
    setNameInitialized(true);
  }

  if (isLoading) {
    return (
      <div className='flex w-full items-center justify-center p-8'>
        <p className='text-muted-foreground'>Loading profile...</p>
      </div>
    );
  }

  if (!user) return null;

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user!.id);

    if (error) {
      toast.error('Failed to update profile: ' + error.message);
    } else {
      toast.success('Profile updated');
      router.refresh();
    }

    setSaving(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const newPassword = formData.get('new-password') as string;
    const confirmPassword = formData.get('confirm-password') as string;

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      toast.error('Failed to update password: ' + error.message);
    } else {
      toast.success('Password updated');
      form.reset();
    }

    setSaving(false);
  }

  return (
    <div className='flex w-full flex-col gap-8 p-4'>
      <div>
        <h3 className='text-lg font-medium'>Profile</h3>
        <p className='text-muted-foreground text-sm'>Manage your account settings.</p>
      </div>

      <Separator />

      <form onSubmit={handleUpdateProfile} className='max-w-md space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='email'>Email</Label>
          <Input id='email' value={user.email || ''} disabled />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='role'>Role</Label>
          <Input id='role' value={profile?.role || ''} disabled className='capitalize' />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='full-name'>Full Name</Label>
          <Input
            id='full-name'
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder='Your full name'
          />
        </div>
        <Button type='submit' disabled={saving}>
          {saving ? 'Saving...' : 'Update profile'}
        </Button>
      </form>

      <Separator />

      <div>
        <h3 className='text-lg font-medium'>Change Password</h3>
        <p className='text-muted-foreground text-sm'>Update your password.</p>
      </div>

      <form onSubmit={handleChangePassword} className='max-w-md space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='new-password'>New Password</Label>
          <Input
            id='new-password'
            name='new-password'
            type='password'
            required
            autoComplete='new-password'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='confirm-password'>Confirm Password</Label>
          <Input
            id='confirm-password'
            name='confirm-password'
            type='password'
            required
            autoComplete='new-password'
          />
        </div>
        <Button type='submit' disabled={saving}>
          {saving ? 'Saving...' : 'Update password'}
        </Button>
      </form>
    </div>
  );
}

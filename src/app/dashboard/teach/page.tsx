import { redirect } from 'next/navigation';

export default function TeachIndexPage() {
  redirect('/dashboard/teach/cohorts');
}

import PageContainer from '@/components/layout/page-container';
import DemosListingPage from '@/features/demos/components/demos-listing';
import { MintTokenSheetTrigger } from '@/features/demos/components/mint-token-form-sheet';

export const metadata = {
  title: 'Dashboard: Demos'
};

export default function DemosPage() {
  return (
    <PageContainer
      scrollable={false}
      pageTitle='Demos'
      pageDescription='Mint, share, and revoke demo links for demo.emerflows.com.'
      pageHeaderAction={<MintTokenSheetTrigger />}
    >
      <DemosListingPage />
    </PageContainer>
  );
}

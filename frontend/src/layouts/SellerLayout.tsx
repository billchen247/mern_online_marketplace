import { PortalLayout } from './PortalLayout';
import { sellerNav } from './portalNavigation';

export function SellerLayout() {
  return <PortalLayout title="Seller portal" items={sellerNav} />;
}

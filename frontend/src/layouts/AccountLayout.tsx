import { PortalLayout } from './PortalLayout';
import { accountNav } from './portalNavigation';

export function AccountLayout() {
  return <PortalLayout title="My account" items={accountNav} />;
}

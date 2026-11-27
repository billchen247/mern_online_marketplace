import { PortalLayout } from './PortalLayout';
import { adminNav } from './portalNavigation';

export function AdminLayout() {
  return <PortalLayout title="Admin portal" items={adminNav} badge="Admin" />;
}

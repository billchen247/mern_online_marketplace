import { describe, expect, it } from 'vitest';
import { PageHeader as DirectPageHeader } from '../src/components/PageHeader';
import { PageHeader } from '../src/components/common';
import { AccountLayout as DirectAccountLayout } from '../src/layouts/AccountLayout';
import { AccountLayout, adminNav, sellerNav } from '../src/layouts/portals';
import { AccountHome as DirectAccountHome } from '../src/pages/account/AccountHome';
import { AccountHome } from '../src/pages/account/AccountPages';
import { AdminOrdersPage as DirectAdminOrdersPage } from '../src/pages/admin/AdminOrdersPage';
import { AdminOrdersPage } from '../src/pages/admin/AdminPages';
import { LoginPage } from '../src/pages/public/AuthPages';
import DirectLoginPage from '../src/pages/public/LoginPage';
import { SellerDashboardPage as DirectSellerDashboardPage } from '../src/pages/seller/SellerDashboardPage';
import { SellerDashboardPage } from '../src/pages/seller/SellerPages';
import { SellerProductsPage as DirectSellerProductsPage } from '../src/pages/seller/SellerProductsPage';
import { SellerProductsPage } from '../src/pages/seller/SellerProducts';

describe('component compatibility exports', () => {
  it('re-exports the independent components', () => {
    expect(PageHeader).toBe(DirectPageHeader);
    expect(AccountLayout).toBe(DirectAccountLayout);
    expect(AccountHome).toBe(DirectAccountHome);
    expect(AdminOrdersPage).toBe(DirectAdminOrdersPage);
    expect(LoginPage).toBe(DirectLoginPage);
    expect(SellerDashboardPage).toBe(DirectSellerDashboardPage);
    expect(SellerProductsPage).toBe(DirectSellerProductsPage);
    expect(adminNav.length).toBeGreaterThan(0);
    expect(sellerNav.length).toBeGreaterThan(0);
  });
});

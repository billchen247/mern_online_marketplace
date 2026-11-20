import { Button, Container, Stack, Typography } from '@mui/material';
import { lazy, Suspense, type ComponentType } from 'react';
import { Link as RouterLink, Navigate, Route, Routes } from 'react-router-dom';
import { Loading } from '../components/StateViews';
import { MainLayout } from '../layouts/MainLayout';
import { AccountLayout, AdminLayout, SellerLayout } from '../layouts/portals';
import { RequireRole } from './guards';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const named = <T extends Record<string, any>>(load: () => Promise<T>, key: keyof T) =>
  lazy(async () => ({ default: (await load())[key] as ComponentType }));

const HomePage = lazy(() => import('../pages/public/HomePage'));
const ProductListPage = lazy(() => import('../pages/public/ProductListPage'));
const ProductDetailPage = lazy(() => import('../pages/public/ProductDetailPage'));
const CategoriesPage = lazy(() => import('../pages/public/CategoriesPage'));
const ShopListPage = named(() => import('../pages/public/ShopPages'), 'ShopListPage');
const ShopDetailPage = named(() => import('../pages/public/ShopPages'), 'ShopDetailPage');
const LoginPage = named(() => import('../pages/public/AuthPages'), 'LoginPage');
const RegisterPage = named(() => import('../pages/public/AuthPages'), 'RegisterPage');

const CartPage = lazy(() => import('../pages/account/CartCheckout'));
const CheckoutPage = lazy(() => import('../pages/account/CheckoutPage'));
const WishlistPage = lazy(() => import('../pages/account/WishlistPage'));
const AccountHome = named(() => import('../pages/account/AccountPages'), 'AccountHome');
const ProfilePage = named(() => import('../pages/account/AccountPages'), 'ProfilePage');
const AddressesPage = named(() => import('../pages/account/AccountPages'), 'AddressesPage');
const NotificationsPage = named(() => import('../pages/account/AccountPages'), 'NotificationsPage');
const BecomeSellerPage = named(() => import('../pages/account/AccountPages'), 'BecomeSellerPage');
const OrderListPage = named(() => import('../pages/account/OrderPages'), 'OrderListPage');
const OrderDetailPage = named(() => import('../pages/account/OrderPages'), 'OrderDetailPage');
const ReturnsPage = named(() => import('../pages/account/OrderPages'), 'ReturnsPage');

const sellerPages = () => import('../pages/seller/SellerPages');
const sellerProducts = () => import('../pages/seller/SellerProducts');
const SellerDashboardPage = named(sellerPages, 'SellerDashboardPage');
const SellerShopsPage = named(sellerPages, 'SellerShopsPage');
const SellerShopFormPage = named(sellerPages, 'SellerShopFormPage');
const SellerOrdersPage = named(sellerPages, 'SellerOrdersPage');
const SellerOrderDetailPage = named(sellerPages, 'SellerOrderDetailPage');
const SellerEarningsPage = named(sellerPages, 'SellerEarningsPage');
const SellerPayoutsPage = named(sellerPages, 'SellerPayoutsPage');
const SellerProductsPage = named(sellerProducts, 'SellerProductsPage');
const SellerProductFormPage = named(sellerProducts, 'SellerProductFormPage');
const SellerInventoryPage = named(sellerProducts, 'SellerInventoryPage');

const adminPages = () => import('../pages/admin/AdminPages');
const AdminDashboardPage = named(adminPages, 'AdminDashboardPage');
const AdminUsersPage = named(adminPages, 'AdminUsersPage');
const AdminApplicationsPage = named(adminPages, 'AdminApplicationsPage');
const AdminSellersPage = named(adminPages, 'AdminSellersPage');
const AdminShopsPage = named(adminPages, 'AdminShopsPage');
const AdminProductsPage = named(adminPages, 'AdminProductsPage');
const AdminReviewsPage = named(adminPages, 'AdminReviewsPage');
const AdminCategoriesPage = named(adminPages, 'AdminCategoriesPage');
const AdminOrdersPage = named(adminPages, 'AdminOrdersPage');
const AdminOrderDetailPage = named(adminPages, 'AdminOrderDetailPage');
const AdminReturnsPage = named(adminPages, 'AdminReturnsPage');
const AdminSettingsPage = named(adminPages, 'AdminSettingsPage');

export function NotFoundPage() {
  return (
    <Container sx={{ maxWidth: 'sm', py: 10 }}>
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <Typography variant="h3" component="h1">404</Typography>
        <Typography color="text.secondary">We couldn’t find the page you’re looking for.</Typography>
        <Button component={RouterLink} to="/" variant="contained">Back to home</Button>
      </Stack>
    </Container>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="shops" element={<ShopListPage />} />
          <Route path="shops/:id" element={<ShopDetailPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route element={<RequireRole />}>
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="account" element={<AccountLayout />}>
              <Route index element={<AccountHome />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="addresses" element={<AddressesPage />} />
              <Route path="orders" element={<OrderListPage />} />
              <Route path="orders/:id" element={<OrderDetailPage />} />
              <Route path="returns" element={<ReturnsPage />} />
              <Route path="become-seller" element={<BecomeSellerPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
            </Route>
          </Route>
          <Route element={<RequireRole roles={['seller']} />}>
            <Route path="seller" element={<SellerLayout />}>
              <Route index element={<SellerDashboardPage />} />
              <Route path="shops" element={<SellerShopsPage />} />
              <Route path="shops/:id" element={<SellerShopFormPage />} />
              <Route path="products" element={<SellerProductsPage />} />
              <Route path="products/:id" element={<SellerProductFormPage />} />
              <Route path="inventory" element={<SellerInventoryPage />} />
              <Route path="orders" element={<SellerOrdersPage />} />
              <Route path="orders/:id" element={<SellerOrderDetailPage />} />
              <Route path="earnings" element={<SellerEarningsPage />} />
              <Route path="payouts" element={<SellerPayoutsPage />} />
            </Route>
          </Route>
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="applications" element={<AdminApplicationsPage />} />
              <Route path="sellers" element={<AdminSellersPage />} />
              <Route path="shops" element={<AdminShopsPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="reviews" element={<AdminReviewsPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="orders/:id" element={<AdminOrderDetailPage />} />
              <Route path="returns" element={<AdminReturnsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>
          <Route path="home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

import { lazy, Suspense, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loading } from '../components/StateViews';
import { MainLayout } from '../layouts/MainLayout';
import { AccountLayout } from '../layouts/AccountLayout';
import { AdminLayout } from '../layouts/AdminLayout';
import { SellerLayout } from '../layouts/SellerLayout';
import { RequireRole } from './guards';
import { NotFoundPage } from './NotFoundPage';

const named = <K extends string>(load: () => Promise<Record<K, ComponentType>>, key: K) =>
  lazy(async () => ({ default: (await load())[key] }));

const HomePage = lazy(() => import('../pages/public/HomePage'));
const ProductListPage = lazy(() => import('../pages/public/ProductListPage'));
const ProductDetailPage = lazy(() => import('../pages/public/ProductDetailPage'));
const CategoriesPage = lazy(() => import('../pages/public/CategoriesPage'));
const ShopListPage = lazy(() => import('../pages/public/ShopListPage'));
const ShopDetailPage = lazy(() => import('../pages/public/ShopDetailPage'));
const LoginPage = lazy(() => import('../pages/public/LoginPage'));
const RegisterPage = lazy(() => import('../pages/public/RegisterPage'));

const CartPage = lazy(() => import('../pages/account/CartPage'));
const CheckoutPage = lazy(() => import('../pages/account/CheckoutPage'));
const WishlistPage = lazy(() => import('../pages/account/WishlistPage'));
const AccountHome = named(() => import('../pages/account/AccountHome'), 'AccountHome');
const ProfilePage = named(() => import('../pages/account/ProfilePage'), 'ProfilePage');
const AddressesPage = named(() => import('../pages/account/AddressesPage'), 'AddressesPage');
const NotificationsPage = named(() => import('../pages/account/NotificationsPage'), 'NotificationsPage');
const BecomeSellerPage = named(() => import('../pages/account/BecomeSellerPage'), 'BecomeSellerPage');
const OrderListPage = named(() => import('../pages/account/OrderListPage'), 'OrderListPage');
const OrderDetailPage = named(() => import('../pages/account/OrderDetailPage'), 'OrderDetailPage');
const ReturnsPage = named(() => import('../pages/account/ReturnsPage'), 'ReturnsPage');

const SellerDashboardPage = named(() => import('../pages/seller/SellerDashboardPage'), 'SellerDashboardPage');
const SellerShopsPage = named(() => import('../pages/seller/SellerShopsPage'), 'SellerShopsPage');
const SellerShopFormPage = named(() => import('../pages/seller/SellerShopFormPage'), 'SellerShopFormPage');
const SellerOrdersPage = named(() => import('../pages/seller/SellerOrdersPage'), 'SellerOrdersPage');
const SellerOrderDetailPage = named(() => import('../pages/seller/SellerOrderDetailPage'), 'SellerOrderDetailPage');
const SellerEarningsPage = named(() => import('../pages/seller/SellerEarningsPage'), 'SellerEarningsPage');
const SellerPayoutsPage = named(() => import('../pages/seller/SellerPayoutsPage'), 'SellerPayoutsPage');
const SellerProductsPage = named(() => import('../pages/seller/SellerProductsPage'), 'SellerProductsPage');
const SellerProductFormPage = named(() => import('../pages/seller/SellerProductFormPage'), 'SellerProductFormPage');
const SellerInventoryPage = named(() => import('../pages/seller/SellerInventoryPage'), 'SellerInventoryPage');

const AdminDashboardPage = named(() => import('../pages/admin/AdminDashboardPage'), 'AdminDashboardPage');
const AdminUsersPage = named(() => import('../pages/admin/AdminUsersPage'), 'AdminUsersPage');
const AdminApplicationsPage = named(() => import('../pages/admin/AdminApplicationsPage'), 'AdminApplicationsPage');
const AdminSellersPage = named(() => import('../pages/admin/AdminSellersPage'), 'AdminSellersPage');
const AdminShopsPage = named(() => import('../pages/admin/AdminShopsPage'), 'AdminShopsPage');
const AdminProductsPage = named(() => import('../pages/admin/AdminProductsPage'), 'AdminProductsPage');
const AdminReviewsPage = named(() => import('../pages/admin/AdminReviewsPage'), 'AdminReviewsPage');
const AdminCategoriesPage = named(() => import('../pages/admin/AdminCategoriesPage'), 'AdminCategoriesPage');
const AdminOrdersPage = named(() => import('../pages/admin/AdminOrdersPage'), 'AdminOrdersPage');
const AdminOrderDetailPage = named(() => import('../pages/admin/AdminOrderDetailPage'), 'AdminOrderDetailPage');
const AdminReturnsPage = named(() => import('../pages/admin/AdminReturnsPage'), 'AdminReturnsPage');
const AdminSettingsPage = named(() => import('../pages/admin/AdminSettingsPage'), 'AdminSettingsPage');

export { NotFoundPage } from './NotFoundPage';

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

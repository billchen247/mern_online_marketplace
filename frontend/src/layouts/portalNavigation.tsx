import Category from '@mui/icons-material/CategoryOutlined';
import Dashboard from '@mui/icons-material/DashboardOutlined';
import Gavel from '@mui/icons-material/GavelOutlined';
import Inventory from '@mui/icons-material/Inventory2Outlined';
import People from '@mui/icons-material/PeopleOutlined';
import Receipt from '@mui/icons-material/ReceiptLongOutlined';
import Paid from '@mui/icons-material/PaidOutlined';
import Settings from '@mui/icons-material/SettingsOutlined';
import Store from '@mui/icons-material/StorefrontOutlined';
import Assignment from '@mui/icons-material/AssignmentIndOutlined';
import Undo from '@mui/icons-material/AssignmentReturnOutlined';
import Warehouse from '@mui/icons-material/WarehouseOutlined';
import Reviews from '@mui/icons-material/RateReviewOutlined';
import Person from '@mui/icons-material/PersonOutlined';
import Shop from '@mui/icons-material/ShoppingBagOutlined';
import Place from '@mui/icons-material/PlaceOutlined';
import Bell from '@mui/icons-material/NotificationsNone';
import Payments from '@mui/icons-material/AccountBalanceWalletOutlined';
import type { PortalNavItem } from './PortalLayout';

export const sellerNav: PortalNavItem[] = [
  { label: 'Dashboard', to: '/seller', icon: <Dashboard fontSize="small" />, end: true },
  { label: 'Shops', to: '/seller/shops', icon: <Store fontSize="small" /> },
  { label: 'Products', to: '/seller/products', icon: <Inventory fontSize="small" /> },
  { label: 'Inventory', to: '/seller/inventory', icon: <Warehouse fontSize="small" /> },
  { label: 'Orders', to: '/seller/orders', icon: <Receipt fontSize="small" /> },
  { label: 'Earnings', to: '/seller/earnings', icon: <Paid fontSize="small" /> },
  { label: 'Payouts', to: '/seller/payouts', icon: <Payments fontSize="small" /> },
];
export const adminNav: PortalNavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: <Dashboard fontSize="small" />, end: true },
  { label: 'Users', to: '/admin/users', icon: <People fontSize="small" /> },
  { label: 'Seller applications', to: '/admin/applications', icon: <Assignment fontSize="small" /> },
  { label: 'Sellers', to: '/admin/sellers', icon: <Gavel fontSize="small" /> },
  { label: 'Shops', to: '/admin/shops', icon: <Store fontSize="small" /> },
  { label: 'Products', to: '/admin/products', icon: <Inventory fontSize="small" /> },
  { label: 'Reviews', to: '/admin/reviews', icon: <Reviews fontSize="small" /> },
  { label: 'Categories', to: '/admin/categories', icon: <Category fontSize="small" /> },
  { label: 'Orders', to: '/admin/orders', icon: <Receipt fontSize="small" /> },
  { label: 'Returns', to: '/admin/returns', icon: <Undo fontSize="small" /> },
  { label: 'Settings', to: '/admin/settings', icon: <Settings fontSize="small" /> },
];
export const accountNav: PortalNavItem[] = [
  { label: 'Overview', to: '/account', icon: <Dashboard fontSize="small" />, end: true },
  { label: 'Profile', to: '/account/profile', icon: <Person fontSize="small" /> },
  { label: 'Addresses', to: '/account/addresses', icon: <Place fontSize="small" /> },
  { label: 'Orders', to: '/account/orders', icon: <Shop fontSize="small" /> },
  { label: 'Returns', to: '/account/returns', icon: <Undo fontSize="small" /> },
  { label: 'Notifications', to: '/account/notifications', icon: <Bell fontSize="small" /> },
];

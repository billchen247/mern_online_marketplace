import AdminPanelSettings from '@mui/icons-material/AdminPanelSettings';
import FavoriteBorder from '@mui/icons-material/FavoriteBorder';
import Menu from '@mui/icons-material/Menu';
import Notifications from '@mui/icons-material/NotificationsNone';
import Search from '@mui/icons-material/Search';
import ShoppingCart from '@mui/icons-material/ShoppingCartOutlined';
import Storefront from '@mui/icons-material/Storefront';
import {
  AppBar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  InputBase,
  List,
  ListItemButton,
  ListItemText,
  Menu as MuiMenu,
  MenuItem,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { useEffect, useState, type FormEvent } from 'react';
import { Link as RouterLink, Outlet, useNavigate } from 'react-router-dom';
import { userApi } from '../api/services';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useNotify } from '../contexts/NotifyContext';
import { useSettings } from '../contexts/SettingsContext';
import { isAdmin, isSeller } from '../utils/roles';

export interface NavLinkItem {
  label: string;
  to: string;
}
/** Role-aware account-menu entries. Pure function so it can be unit-tested. */
export function accountMenuItems(roles: string[] | undefined): NavLinkItem[] {
  const items: NavLinkItem[] = [
    { label: 'My account', to: '/account' },
    { label: 'My orders', to: '/account/orders' },
    { label: 'Wishlist', to: '/wishlist' },
  ];
  if (roles?.includes('seller')) items.push({ label: 'Seller portal', to: '/seller' });
  else items.push({ label: 'Become a seller', to: '/account/become-seller' });
  if (roles?.includes('admin')) items.push({ label: 'Admin portal', to: '/admin' });
  return items;
}

export function MainLayout() {
  const { user, logout } = useAuth();
  const { count, wishlistIds } = useCart();
  const { settings } = useSettings();
  const { success } = useNotify();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return setUnread(0);
    userApi
      .notifications(1)
      .then((r) => setUnread(r.data.filter((n) => !n.read).length))
      .catch(() => undefined);
  }, [user]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/products?search=${encodeURIComponent(q.trim())}` : '/products');
  };
  const doLogout = async () => {
    setAnchor(null);
    await logout();
    success('You have been signed out');
    navigate('/');
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <a
        href="#main"
        style={{ position: 'absolute', left: -9999 }}
        onFocus={(e) => (e.currentTarget.style.left = '8px')}
        onBlur={(e) => (e.currentTarget.style.left = '-9999px')}
      >
        Skip to content
      </a>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1.5 }}>
          <IconButton sx={{ display: { md: 'none' } }} aria-label="Open menu" onClick={() => setDrawer(true)}>
            <Menu />
          </IconButton>
          <Stack
            component={RouterLink}
            to="/"
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', textDecoration: 'none', color: 'primary.main' }}
            aria-label={`${settings.marketplaceName} home`}
          >
            <Storefront />
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {settings.marketplaceName}
            </Typography>
          </Stack>
          <Paper
            component="form"
            onSubmit={submit}
            role="search"
            variant="outlined"
            sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', flex: 1, maxWidth: 560, mx: 2, px: 1.5 }}
          >
            <InputBase
              fullWidth
              placeholder="Search products…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              inputProps={{ 'aria-label': 'Search products' }}
            />
            <IconButton type="submit" aria-label="Search">
              <Search />
            </IconButton>
          </Paper>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={0.5} component="nav" aria-label="Primary" sx={{ alignItems: 'center' }}>
            <Button component={RouterLink} to="/products" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              Shop
            </Button>
            <Button component={RouterLink} to="/shops" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
              Shops
            </Button>
            {user && isSeller(user) && (
              <Button component={RouterLink} to="/seller" sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
                Seller portal
              </Button>
            )}
            {user && isAdmin(user) && (
              <Button
                component={RouterLink}
                to="/admin"
                startIcon={<AdminPanelSettings />}
                sx={{ display: { xs: 'none', md: 'inline-flex' } }}
              >
                Admin
              </Button>
            )}
            {user && (
              <IconButton component={RouterLink} to="/wishlist" aria-label={`Wishlist, ${wishlistIds.size} items`}>
                <Badge badgeContent={wishlistIds.size} color="secondary">
                  <FavoriteBorder />
                </Badge>
              </IconButton>
            )}
            {user && (
              <IconButton component={RouterLink} to="/account/notifications" aria-label={`Notifications, ${unread} unread`}>
                <Badge badgeContent={unread} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            )}
            <IconButton component={RouterLink} to="/cart" aria-label={`Cart, ${count} items`}>
              <Badge badgeContent={count} color="primary">
                <ShoppingCart />
              </Badge>
            </IconButton>
            {user ? (
              <>
                <Button onClick={(e) => setAnchor(e.currentTarget)} aria-haspopup="menu" data-testid="account-button">
                  {user.name.split(' ')[0]}
                </Button>
                <MuiMenu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
                  {accountMenuItems(user.roles).map((i) => (
                    <MenuItem key={i.to} component={RouterLink} to={i.to} onClick={() => setAnchor(null)}>
                      {i.label}
                    </MenuItem>
                  ))}
                  <Divider />
                  <MenuItem onClick={doLogout}>Sign out</MenuItem>
                </MuiMenu>
              </>
            ) : (
              <>
                <Button component={RouterLink} to="/login">
                  Sign in
                </Button>
                <Button component={RouterLink} to="/register" variant="contained" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                  Sign up
                </Button>
              </>
            )}
          </Stack>
        </Toolbar>
        <Box sx={{ display: { sm: 'none' }, px: 2, pb: 1 }}>
          <Paper component="form" onSubmit={submit} role="search" variant="outlined" sx={{ display: 'flex', px: 1.5 }}>
            <InputBase
              fullWidth
              placeholder="Search products…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              inputProps={{ 'aria-label': 'Search products (mobile)' }}
            />
            <IconButton type="submit" aria-label="Submit search">
              <Search />
            </IconButton>
          </Paper>
        </Box>
      </AppBar>

      <Drawer open={drawer} onClose={() => setDrawer(false)}>
        <List sx={{ width: 240 }} onClick={() => setDrawer(false)}>
          {[{ label: 'Shop', to: '/products' }, { label: 'Shops', to: '/shops' }, ...(user ? accountMenuItems(user.roles) : [])].map(
            (i) => (
              <ListItemButton key={i.to} component={RouterLink} to={i.to}>
                <ListItemText primary={i.label} />
              </ListItemButton>
            ),
          )}
        </List>
      </Drawer>

      <Box component="main" id="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>

      <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', py: 4, mt: 6, bgcolor: 'background.paper' }}>
        <Container>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 700 }}>{settings.marketplaceName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {settings.tagline}. Payments and payouts in this demo are simulated.
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

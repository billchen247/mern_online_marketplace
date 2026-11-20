import Menu from '@mui/icons-material/Menu';
import {
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useState, type ReactNode } from 'react';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';

export interface PortalNavItem {
  label: string;
  to: string;
  icon: ReactNode;
  end?: boolean;
}
const WIDTH = 232;

export function PortalLayout({ title, items, badge }: { title: string; items: PortalNavItem[]; badge?: string }) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isActive = (i: PortalNavItem) => (i.end ? pathname === i.to : pathname === i.to || pathname.startsWith(i.to + '/'));

  const nav = (
    <Box role="navigation" aria-label={`${title} navigation`} sx={{ width: WIDTH }}>
      <Toolbar>
        <Typography noWrap sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        {badge && <Chip size="small" label={badge} sx={{ ml: 1 }} />}
      </Toolbar>
      <Divider />
      <List dense>
        {items.map((i) => (
          <ListItemButton
            key={i.to}
            component={RouterLink}
            to={i.to}
            selected={isActive(i)}
            onClick={() => setOpen(false)}
            sx={{ borderRadius: 1, mx: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>{i.icon}</ListItemIcon>
            <ListItemText primary={i.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
      {desktop ? (
        <Box sx={{ width: WIDTH, flexShrink: 0, borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>{nav}</Box>
      ) : (
        <Drawer open={open} onClose={() => setOpen(false)}>
          {nav}
        </Drawer>
      )}
      <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, minWidth: 0 }}>
        {!desktop && (
          <IconButton aria-label={`Open ${title} menu`} onClick={() => setOpen(true)} sx={{ mb: 1 }}>
            <Menu />
          </IconButton>
        )}
        <Outlet />
      </Box>
    </Box>
  );
}

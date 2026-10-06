import { useState } from 'react'
import { ROLE_LABELS } from '@nst/shared/permissions.js'

import {
  Box,
  Divider,
  IconButton,
  List,
  Toolbar,
  Typography,
} from '@mui/material'

import {
  BookIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChevronLeftIcon,
  KpiIcon,
  OverviewIcon,
  PeopleIcon,
  SidebarIcon,
  ShieldIcon,
  SignOutIcon,
} from '../components/icons'

import { Navigate, Outlet, useLocation } from 'react-router'

import { AppBar, Drawer, DrawerHeader } from '../components/Sidebar.style'

import DrawerItem from '../components/DrawerItem'
import useSignOut from '../components/useSignOut'

import useAccess from '../hooks/useAccess'
import { useAuthStore } from '../stores/auth'

const studentMenuItems = [
  {
    menu: 'Overview',
    icon: OverviewIcon,
    path: '/',
  },
  {
    menu: 'KPIs',
    icon: KpiIcon,
    path: '/kpis',
  },
]

const staffMenuItems = [
  {
    menu: 'Overview',
    icon: OverviewIcon,
    path: '/admin',
  },
  {
    menu: 'Startups',
    icon: BriefcaseIcon,
    path: '/admin/venture',
  },
  // {
  //   menu: 'Portfolios',
  //   icon: PeopleIcon,
  //   path: '/admin/portfolio',
  // },
  {
    menu: 'Founders',
    icon: PeopleIcon,
    path: '/admin/founders',
  },
  {
    menu: 'KPIs',
    icon: KpiIcon,
    path: '/admin/kpis',
  },
]

const commonMenuItems = [
  {
    menu: 'Methodology',
    icon: BookIcon,
    path: '/methodology',
  },
]

const accountsMenuItem = {
  menu: 'Accounts & Roles',
  icon: ShieldIcon,
  path: '/admin/accounts',
}

const menuFor = (user, { isStaff, isMentor, isAdmin, isStudent }) => {
  if (isStaff) {
    // A mentor's lists hold only the startups assigned to them.
    const staffItems = isMentor
      ? staffMenuItems.map(item =>
          item.path === '/admin/venture'
            ? { ...item, menu: 'My Startups' }
            : item
        )
      : staffMenuItems
    return [
      ...staffItems,
      ...(isAdmin ? [accountsMenuItem] : []),
      ...commonMenuItems,
    ]
  }
  if (isStudent) {
    return [
      ...studentMenuItems,
      {
        menu: 'Bi-Weekly',
        icon: CalendarIcon,
        path: `/profile/${user._id}`,
      },
      ...commonMenuItems,
    ]
  }
  return commonMenuItems
}

export default function MiniDrawer() {
  const loggedInUserData = useAuthStore(state => state.user)
  const access = useAccess()
  const drawerItems = menuFor(loggedInUserData, access)

  const location = useLocation()

  const { signingOut, signOutError, handleSignOut } = useSignOut()

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const openDrawer = () => setIsDrawerOpen(true)
  const closeDrawer = () => setIsDrawerOpen(false)

  // Authentication is enforced by the RequireAuth / RequireRole route guards,
  // so by the time this layout renders the user is known to be signed in.

  // Staff have no student dashboard, so send them to their own.
  if (access.isStaff && location.pathname === '/') {
    return <Navigate to="/admin" replace />
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" open={isDrawerOpen}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={openDrawer}
            edge="start"
            sx={[
              {
                marginRight: 2,
              },
              isDrawerOpen && { display: 'none' },
            ]}
          >
            <SidebarIcon />
          </IconButton>
          <Typography
            component="div"
            sx={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            NST Entrepreneurship Portal
          </Typography>
          {access.role && (
            <Typography
              component="span"
              variant="caption"
              color="text.secondary"
              sx={{ ml: 'auto', fontWeight: 500 }}
            >
              {ROLE_LABELS[access.role]}
            </Typography>
          )}
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" open={isDrawerOpen}>
        <DrawerHeader>
          <IconButton onClick={closeDrawer}>
            <ChevronLeftIcon />
          </IconButton>
        </DrawerHeader>

        <Divider />

        <List>
          {drawerItems.map(item => (
            <DrawerItem
              key={item.path}
              open={isDrawerOpen}
              icon={item.icon}
              label={item.menu}
              path={item.path}
            />
          ))}
        </List>

        <Box sx={{ marginTop: 'auto' }}>
          <Divider />
          <List>
            <DrawerItem
              open={isDrawerOpen}
              icon={SignOutIcon}
              label={signingOut ? 'Signing out...' : 'Sign Out'}
              onClick={handleSignOut}
              disabled={signingOut}
            />
          </List>
          {isDrawerOpen && signOutError && (
            <Typography
              variant="caption"
              color="error"
              sx={{ display: 'block', px: 2.5, pb: 1 }}
            >
              {signOutError}
            </Typography>
          )}
        </Box>
      </Drawer>
      {/* minWidth 0 lets wide content (tables) scroll inside main instead
          of stretching the whole page past the screen on phones. */}
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: 3 }}>
        <DrawerHeader />
        <Outlet />
      </Box>
    </Box>
  )
}

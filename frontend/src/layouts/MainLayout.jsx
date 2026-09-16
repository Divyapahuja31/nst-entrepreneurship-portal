import { useState, useEffect } from 'react'

import {
  Box,
  CircularProgress,
  Divider,
  IconButton,
  List,
  Toolbar,
  Typography,
} from '@mui/material'

import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Logout as LogoutIcon,
  People as PeopleIcon,
  Dashboard as DashboardIcon,
  MilitaryTech as MilitaryTechIcon,
  DateRange as DateRangeIcon,
  AutoAwesome as AutoAwesomeIcon,
  AutoStories as AutoStoriesIcon,
} from '@mui/icons-material'

import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'

import { AppBar, Drawer, DrawerHeader } from '../components/Sidebar.style'

import DrawerItem from '../components/DrawerItem'

import { useAuthStore } from '../stores/auth'
import { signOut } from '../api/auth'

const studentMenuItems = [
  {
    menu: 'Overview',
    icon: DashboardIcon,
    path: '/',
  },
  {
    menu: 'KPIs',
    icon: MilitaryTechIcon,
    path: '/kpis',
  },
]

const adminMenuItems = [
  {
    menu: 'Overview',
    icon: DashboardIcon,
    path: '/admin',
  },
  {
    menu: 'Portfolios',
    icon: PeopleIcon,
    path: '/admin/portfolio',
  },
  {
    menu: 'Venture OS',
    icon: AutoAwesomeIcon,
    path: '/admin/venture',
  },
]

const commonMenuItems = [
  {
    menu: 'Methodology',
    icon: AutoStoriesIcon,
    path: '/methodology',
  },
]

export default function MiniDrawer() {
  const [drawerItems, setDrawerItems] = useState([])

  const loggedInUserData = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const isLoading = useAuthStore(state => state.isLoading)
  const logout = useAuthStore(state => state.logout)

  console.log('loggedInUserData', loggedInUserData)

  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    function getDrawerItems() {
      if (loggedInUserData?.role?.name === 'admin') {
        setDrawerItems([...adminMenuItems, ...commonMenuItems])
      } else if (loggedInUserData?.role?.name === 'student') {
        setDrawerItems([
          ...studentMenuItems,
          {
            menu: 'Bi-Weekly',
            icon: DateRangeIcon,
            path: `/profile/${loggedInUserData._id}`,
          },
          ...commonMenuItems,
        ])
      } else {
        setDrawerItems([...commonMenuItems])
      }
    }

    getDrawerItems()
  }, [loggedInUserData])

  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState(null)
  const handleSignOut = async () => {
    setSigningOut(true)
    setSignOutError(null)
    const result = await signOut()
    setSigningOut(false)
    if (result.error) {
      setSignOutError(result.error)
      return
    }
    logout()
    navigate('/signin')
  }

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const openDrawer = () => setIsDrawerOpen(true)
  const closeDrawer = () => setIsDrawerOpen(false)

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  // redirect to /admin if the user is an admin and is on the root path
  if (loggedInUserData?.role?.name === 'admin' && location.pathname === '/') {
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
                marginRight: 5,
              },
              isDrawerOpen && { display: 'none' },
            ]}
          >
            <MenuIcon />
          </IconButton>
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
              icon={LogoutIcon}
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
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <DrawerHeader />
        <Outlet />
      </Box>
    </Box>
  )
}

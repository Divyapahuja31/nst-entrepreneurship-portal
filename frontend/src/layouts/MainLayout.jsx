import { useState, useEffect } from 'react'

import {
  Box,
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

import { useLoaderData, Outlet, useFetcher } from 'react-router'

import { AppBar, Drawer, DrawerHeader } from '../components/Sidebar.style'

import DrawerItem from '../components/DrawerItem'

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

  const loggedInUserData = useLoaderData()

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

  const signout = useFetcher()
  const signingOut = signout.state !== 'idle'
  const handleSignOut = () => {
    signout.submit(null, { method: 'post', action: '/signout' })
  }

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const openDrawer = () => setIsDrawerOpen(true)
  const closeDrawer = () => setIsDrawerOpen(false)

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
          {isDrawerOpen && signout.data?.error && (
            <Typography
              variant="caption"
              color="error"
              sx={{ display: 'block', px: 2.5, pb: 1 }}
            >
              {signout.data.error}
            </Typography>
          )}
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <DrawerHeader />
        <Outlet context={loggedInUserData} />
      </Box>
    </Box>
  )
}

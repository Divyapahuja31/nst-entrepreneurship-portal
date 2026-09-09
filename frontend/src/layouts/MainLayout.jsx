import * as React from 'react'
import { useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'

import Toolbar from '@mui/material/Toolbar'
import List from '@mui/material/List'
import CssBaseline from '@mui/material/CssBaseline'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import LogoutIcon from '@mui/icons-material/Logout'
import PeopleIcon from '@mui/icons-material/People'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import AssistantNavigationIcon from '@mui/icons-material/AssistantNavigation'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import { useLoaderData } from 'react-router'

import { NavLink, Outlet, useFetcher, useLocation } from 'react-router'

import DashboardIcon from '@mui/icons-material/Dashboard'
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech'

import { AppBar, Drawer, DrawerHeader } from '../components/Sidebar.style'

const menuItems = [
  {
    menu: 'Dashboard',
    icon: DashboardIcon,
    path: '/dashboard',
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
    menu: 'Profiles',
    icon: PeopleIcon,
    path: '/admin/profiles',
  },
  {
    menu: 'Venture OS ',
    icon: AutoAwesomeIcon,
    path: '/admin/venture',
  },
  {
    menu: 'Bi-weekly',
    icon: CalendarMonthIcon,
    path: '/admin/biweekly',
  },
  {
    menu: 'Methodology',
    icon: AutoStoriesIcon,
    path: '/admin/methodology',
  },
  {
    menu: 'Leadership',
    icon: AssistantNavigationIcon,
    path: '/admin/leadership',
  },
]

export default function MiniDrawer() {
  const theme = useTheme()
  const data = useLoaderData()
  console.log(data)
  const { pathname } = useLocation()
  const [open, setOpen] = React.useState(false)
  const signout = useFetcher()
  const signingOut = signout.state !== 'idle'

  const handleSignOut = () => {
    signout.submit(null, { method: 'post', action: '/signout' })
  }

  const handleDrawerOpen = () => {
    setOpen(true)
  }

  const handleDrawerClose = () => {
    setOpen(false)
  }

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={[
              {
                marginRight: 5,
              },
              open && { display: 'none' },
            ]}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" open={open}>
        <DrawerHeader>
          <IconButton onClick={handleDrawerClose}>
            {theme.direction === 'rtl' ? (
              <ChevronRightIcon />
            ) : (
              <ChevronLeftIcon />
            )}
          </IconButton>
        </DrawerHeader>
        <Divider />
        <List>
          {(data?.role === 'admin' ? adminMenuItems : menuItems).map(item => (
            <ListItem key={item.path} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                component={NavLink}
                to={item.path}
                selected={pathname === item.path}
                sx={[
                  {
                    minHeight: 48,
                    px: 2.5,
                  },
                  open
                    ? {
                        justifyContent: 'initial',
                      }
                    : {
                        justifyContent: 'center',
                      },
                ]}
              >
                <ListItemIcon
                  sx={[
                    {
                      minWidth: 0,
                      justifyContent: 'center',
                    },
                    open
                      ? {
                          mr: 3,
                        }
                      : {
                          mr: 'auto',
                        },
                  ]}
                >
                  <item.icon />
                </ListItemIcon>
                <ListItemText
                  primary={item.menu}
                  sx={[
                    open
                      ? {
                          opacity: 1,
                        }
                      : {
                          opacity: 0,
                        },
                  ]}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Box sx={{ marginTop: 'auto' }}>
          <Divider />
          <List>
            <ListItem disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                onClick={handleSignOut}
                disabled={signingOut}
                sx={[
                  {
                    minHeight: 48,
                    px: 2.5,
                  },
                  open
                    ? {
                        justifyContent: 'initial',
                      }
                    : {
                        justifyContent: 'center',
                      },
                ]}
              >
                <ListItemIcon
                  sx={[
                    {
                      minWidth: 0,
                      justifyContent: 'center',
                    },
                    open
                      ? {
                          mr: 3,
                        }
                      : {
                          mr: 'auto',
                        },
                  ]}
                >
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText
                  primary={signingOut ? 'Signing out...' : 'Sign Out'}
                  sx={[
                    open
                      ? {
                          opacity: 1,
                        }
                      : {
                          opacity: 0,
                        },
                  ]}
                />
              </ListItemButton>
            </ListItem>
          </List>
          {open && signout.data?.error && (
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
        <Outlet />
      </Box>
    </Box>
  )
}

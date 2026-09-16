import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material'

import { NavLink, useLocation } from 'react-router'



export default function DrawerItem({
  open,
  icon: Icon,
  label,
  path,
  onClick,
  disabled,
}) {
  const linkProps = path ? { component: NavLink, to: path } : {}

  const { pathname } = useLocation()

  return (
    <ListItem disablePadding sx={{ display: 'block' }}>
      <ListItemButton
        {...linkProps}
        selected={pathname === path}
        onClick={onClick}
        disabled={disabled}
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
          <Icon />
        </ListItemIcon>
        <ListItemText
          primary={label}
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
  )
}

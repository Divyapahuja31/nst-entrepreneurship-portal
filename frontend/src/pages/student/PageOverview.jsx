import {
  Typography,
  Box,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  ButtonBase,
  Stack,
} from '@mui/material'

import { useNavigate } from 'react-router'

import { useAuthStore } from '../../stores/auth'

const ventureOptions = [
  {
    label: 'Create a venture',
    description: 'Got an idea? Start a new venture and submit your proposal.',
    image: '/undraw_got-an-idea_1z3i.svg',
    path: '/create-proposal',
  },
  {
    label: 'Join a venture',
    description: 'Already have a team? Join an existing venture as a founder.',
    image: '/undraw_handshake-deal_nwk6.svg',
    path: '/join-venture',
  },
]

function VentureOptionButton({ option, onClick }) {
  return (
    <ButtonBase
      focusRipple
      onClick={onClick}
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 2,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        textAlign: 'center',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 4,
        },
      }}
    >
      <Box
        component="img"
        src={option.image}
        alt=""
        sx={{
          width: '100%',
          maxWidth: 200,
          height: 180,
          objectFit: 'contain',
          mb: 2,
        }}
      />
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {option.label}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {option.description}
      </Typography>
    </ButtonBase>
  )
}

function NoVentureDialog({ open }) {
  const navigate = useNavigate()

  return (
    <Dialog open={open} maxWidth="md" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pt: 4 }}>
        <Typography variant="h5" component="span" fontWeight={600}>
          You're not part of a venture yet
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center', pb: 4 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          To get started, create a new venture or join an existing one.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
          {ventureOptions.map(option => (
            <VentureOptionButton
              key={option.path}
              option={option}
              onClick={() => navigate(option.path)}
            />
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

export default function Dashboard() {
  const loggedInUserData = useAuthStore(state => state.user)
  const isLoading = useAuthStore(state => state.isLoading)

  const hasVenture = Boolean(loggedInUserData?.venture)
  const showNoVentureDialog = !isLoading && !!loggedInUserData && !hasVenture

  return (
    <>
      <NoVentureDialog open={showNoVentureDialog} />

      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1">
        Welcome to the dashboard! Here you can find an overview of your
        activities and key metrics.
      </Typography>

      <Grid container spacing={2} style={{ marginTop: '20px' }}>
        <Grid size={12}>
          <Box
            sx={{
              backgroundColor: '#f5f5f5',
              padding: '20px',
              borderRadius: '8px',
              height: '100px',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Recent Activities
            </Typography>
            <Typography variant="body2">
              You have no recent activities.
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </>
  )
}

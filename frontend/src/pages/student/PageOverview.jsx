import { useState } from 'react'

import {
  Typography,
  Box,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  ButtonBase,
  Stack,
  Alert,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
} from '@mui/material'

import CreateVentureStep from '../../components/CreateVentureStep.jsx'
import JoinVentureStep from '../../components/JoinVentureStep.jsx'

import { useAuthStore } from '../../stores/auth'

const ventureOptions = [
  {
    label: 'Create a venture',
    description: 'Got an idea? Start a new venture and submit your proposal.',
    image: '/undraw_got-an-idea_1z3i.svg',
    step: 'create',
  },
  {
    label: 'Join a venture',
    description: 'Already have a team? Join an existing venture as a founder.',
    image: '/undraw_handshake-deal_nwk6.svg',
    step: 'join',
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

function NoVentureDialog({ open, rejectedApplication, onApplied }) {
  const [step, setStep] = useState('choose')

  const goBack = () => setStep('choose')

  if (step === 'create') {
    return (
      <Dialog open={open} maxWidth="md" fullWidth>
        <CreateVentureStep onBack={goBack} onSubmitted={onApplied} />
      </Dialog>
    )
  }

  if (step === 'join') {
    return (
      <Dialog open={open} maxWidth="sm" fullWidth>
        <JoinVentureStep onBack={goBack} onSubmitted={onApplied} />
      </Dialog>
    )
  }

  return (
    <Dialog open={open} maxWidth="md" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pt: 4 }}>
        <Typography variant="h5" component="span" fontWeight={600}>
          You're not part of a venture yet
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center', pb: 4 }}>
        {rejectedApplication && (
          <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
            {rejectedApplication.type === 'PROPOSAL'
              ? `Your proposal for ${rejectedApplication.ventureName} was not approved. You can submit a new one.`
              : `Your request to join ${rejectedApplication.ventureName} was not approved. You can apply again.`}
          </Alert>
        )}
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          To get started, create a new venture or join an existing one.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
          {ventureOptions.map(option => (
            <VentureOptionButton
              key={option.step}
              option={option}
              onClick={() => setStep(option.step)}
            />
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

function PendingApplication({ application }) {
  return (
    <>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Alert severity="info" sx={{ mt: 2 }}>
        {application.type === 'PROPOSAL'
          ? `Your proposal for ${application.ventureName} is waiting for admin approval.`
          : `Your request to join ${application.ventureName} is waiting for admin approval.`}
      </Alert>

      <Typography variant="body1" sx={{ mt: 2 }}>
        You'll get access to your venture dashboard once an admin approves it.
      </Typography>
    </>
  )
}

function VentureDashboard({ user, venture }) {
  const founders = venture.founders || []

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Welcome, {user.username}
      </Typography>
      <Typography variant="body1">
        You are a founder at <strong>{venture.name}</strong>.
      </Typography>

      <Grid container spacing={2} style={{ marginTop: '20px' }}>
        <Grid size={12}>
          <Box
            sx={{
              backgroundColor: '#f5f5f5',
              padding: '20px',
              borderRadius: '8px',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Team members
            </Typography>
            <List dense>
              {founders.map(founder => (
                <ListItem key={founder._id || founder} disableGutters>
                  <ListItemText
                    primary={founder.username || founder}
                    secondary={founder.email}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Grid>

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

export default function Dashboard() {
  const loggedInUserData = useAuthStore(state => state.user)
  const isLoading = useAuthStore(state => state.isLoading)
  const fetchUser = useAuthStore(state => state.fetchUser)

  if (isLoading || !loggedInUserData) {
    return <CircularProgress />
  }

  const venture = loggedInUserData.venture
  const application = loggedInUserData.application

  if (venture) {
    return <VentureDashboard user={loggedInUserData} venture={venture} />
  }

  if (application?.status === 'PENDING') {
    return <PendingApplication application={application} />
  }

  return (
    <>
      <NoVentureDialog
        open
        rejectedApplication={
          application?.status === 'REJECTED' ? application : null
        }
        onApplied={fetchUser}
      />

      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
    </>
  )
}

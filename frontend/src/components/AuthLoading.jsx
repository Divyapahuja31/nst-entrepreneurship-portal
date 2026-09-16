import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

// Shown while the session is still being resolved, so a guard never flashes a
// redirect before it knows who the user is.
export default function AuthLoading() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
    >
      <CircularProgress />
    </Box>
  )
}

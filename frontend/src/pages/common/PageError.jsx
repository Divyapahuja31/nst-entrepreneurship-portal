import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router'

import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material'

const STATUS_INFO = {
  400: {
    title: 'Bad request',
    detail: 'Something about that request was not valid.',
  },
  401: {
    title: 'Sign in required',
    detail: 'Your session may have expired. Sign in to continue.',
  },
  403: {
    title: 'No access',
    detail: 'You do not have permission to view this page.',
  },
  404: {
    title: 'Page not found',
    detail: 'The page you are looking for does not exist.',
  },
  500: {
    title: 'Something went wrong',
    detail: 'The server ran into a problem. Try again in a moment.',
  },
}

const FALLBACK = {
  title: 'Something went wrong',
  detail: 'An unexpected error occurred.',
}

const normalizeError = error => {
  if (isRouteErrorResponse(error)) {
    return {
      status: error.status,
      message: typeof error.data === 'string' ? error.data : error.statusText,
    }
  }

  const response = error?.response

  if (response) {
    const detail = response.data?.error || response.data?.message

    return {
      status: response.status,
      message: typeof detail === 'string' ? detail : null,
    }
  }

  return {
    status: null,
    message: error?.message || null,
  }
}

export function ErrorView({ status, message }) {
  const navigate = useNavigate()

  const info = STATUS_INFO[status] || FALLBACK

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      {status && (
        <Typography variant="h2" color="text.secondary">
          {status}
        </Typography>
      )}

      <Typography variant="h5" gutterBottom>
        {info.title}
      </Typography>

      <Typography variant="body1" color="text.secondary">
        {info.detail}
      </Typography>

      {message && message !== info.detail && (
        <Alert severity="error" sx={{ mt: 3 }}>
          <AlertTitle>Details</AlertTitle>
          {message}
        </Alert>
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
        {status === 401 ? (
          <Button variant="contained" onClick={() => navigate('/signin')}>
            Sign in
          </Button>
        ) : (
          <Button variant="contained" onClick={() => navigate('/')}>
            Go to dashboard
          </Button>
        )}
        <Button onClick={() => navigate(-1)}>Go back</Button>
      </Stack>
    </Box>
  )
}

export default function PageError() {
  const error = useRouteError()

  console.error('Route error:', error)

  return <ErrorView {...normalizeError(error)} />
}

export function PageNotFound() {
  return <ErrorView status={404} />
}

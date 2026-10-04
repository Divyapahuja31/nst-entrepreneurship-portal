import { useEffect, useState } from 'react'
import { Alert, Box, Button, TextField } from '@mui/material'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'

function OtpVerificationForm({
  onVerify,
  onResend,
  onBack,
  submitting = false,
  error = '',
  successMessage = '',
  submitLabel = 'Verify',
  backLabel = 'Back',
  initialResendTimer = 60,
}) {
  const [otp, setOtp] = useState('')
  const [resendTimer, setResendTimer] = useState(initialResendTimer)

  useEffect(() => {
    let interval = null
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1)
      }, 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [resendTimer])

  const handleSubmit = e => {
    e.preventDefault()
    if (otp.trim().length === 6 && !submitting) {
      onVerify(otp.trim())
    }
  }

  const handleResend = () => {
    if (resendTimer === 0 && !submitting) {
      onResend()
      setResendTimer(60)
    }
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {successMessage && !error && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <TextField
        id="otp-verification-code"
        label="Verification Code"
        type="text"
        name="otp"
        value={otp}
        onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
        required
        fullWidth
        autoFocus
        autoComplete="one-time-code"
        slotProps={{
          htmlInput: {
            maxLength: 6,
            inputMode: 'numeric',
            autoComplete: 'one-time-code',
            style: {
              fontVariantNumeric: 'tabular-nums',
              fontSize: '1.375rem',
              fontWeight: 600,
              letterSpacing: '0.3em',
            },
          },
        }}
        sx={{ mb: 3 }}
      />

      <Button
        fullWidth
        variant="contained"
        type="submit"
        size="large"
        disabled={submitting || otp.trim().length !== 6}
      >
        {submitting ? 'Verifying…' : submitLabel}
      </Button>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          mt: 2,
          mx: -1.5,
        }}
      >
        {onBack && (
          <Button
            variant="text"
            onClick={onBack}
            startIcon={<ChevronLeftRoundedIcon />}
            sx={{ pl: 1 }}
          >
            {backLabel}
          </Button>
        )}

        {onResend && (
          <Button
            variant="text"
            onClick={handleResend}
            disabled={resendTimer > 0 || submitting}
            sx={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code'}
          </Button>
        )}
      </Box>
    </form>
  )
}

export default OtpVerificationForm

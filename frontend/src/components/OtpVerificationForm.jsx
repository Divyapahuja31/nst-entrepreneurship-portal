import { useEffect, useState } from 'react'
import { Alert, Box, Button, TextField } from '@mui/material'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'

function OtpVerificationForm({
  onVerify,
  onResend,
  onBack,
  submitting = false,
  error = '',
  successMessage = '',
  submitLabel = 'Verify Code',
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

      {successMessage && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <TextField
        id="otp-verification-code"
        label="6-Digit Verification Code"
        type="text"
        name="otp"
        value={otp}
        onChange={e => setOtp(e.target.value)}
        required
        fullWidth
        autoComplete="one-time-code"
        inputProps={{
          maxLength: 6,
          autoComplete: 'one-time-code',
          style: { letterSpacing: '4px', fontWeight: 'bold' },
        }}
        placeholder="123456"
        sx={{ mb: 3 }}
      />

      <Button
        fullWidth
        variant="contained"
        type="submit"
        size="large"
        disabled={submitting || otp.trim().length !== 6}
        endIcon={<ArrowForwardRoundedIcon />}
        sx={{ mb: 2 }}
      >
        {submitting ? 'Verifying Code...' : submitLabel}
      </Button>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 1,
        }}
      >
        {onBack && (
          <Button
            variant="text"
            size="small"
            onClick={onBack}
            startIcon={<ArrowBackRoundedIcon />}
          >
            {backLabel}
          </Button>
        )}

        {onResend && (
          <Button
            variant="text"
            size="small"
            onClick={handleResend}
            disabled={resendTimer > 0 || submitting}
          >
            {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
          </Button>
        )}
      </Box>
    </form>
  )
}

export default OtpVerificationForm

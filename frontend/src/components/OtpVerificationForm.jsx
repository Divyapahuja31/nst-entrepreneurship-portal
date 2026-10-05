import { useEffect, useState } from 'react'
import { Box, Button, Typography } from '@mui/material'

const CODE_LENGTH = 6

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
  const [focused, setFocused] = useState(false)
  const [resendTimer, setResendTimer] = useState(initialResendTimer)

  // A rejected code is cleared so the next attempt starts fresh.
  const [shownError, setShownError] = useState(error)
  if (error !== shownError) {
    setShownError(error)
    if (error) setOtp('')
  }

  useEffect(() => {
    if (resendTimer <= 0) return undefined
    const interval = setInterval(() => setResendTimer(prev => prev - 1), 1000)
    return () => clearInterval(interval)
  }, [resendTimer])

  // Typing or pasting the last digit submits immediately, no extra tap needed.
  const handleChange = e => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH)
    setOtp(digits)
    if (
      digits.length === CODE_LENGTH &&
      otp.length !== CODE_LENGTH &&
      !submitting
    ) {
      onVerify(digits)
    }
  }

  const handleSubmit = e => {
    e.preventDefault()
    if (otp.length === CODE_LENGTH && !submitting) {
      onVerify(otp)
    }
  }

  const handleResend = () => {
    if (resendTimer === 0 && !submitting) {
      onResend()
      setResendTimer(60)
    }
  }

  const activeIndex = Math.min(otp.length, CODE_LENGTH - 1)

  return (
    <form onSubmit={handleSubmit} autoComplete="off">
      {successMessage && !error && (
        <Typography
          variant="body2"
          color="textSecondary"
          aria-live="polite"
          sx={{ textAlign: 'center', mb: 2 }}
        >
          {successMessage}
        </Typography>
      )}

      {/* One real input sits over six boxes, so paste and SMS autofill just work. */}
      <Box
        sx={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: `repeat(${CODE_LENGTH}, 1fr)`,
          gap: { xs: 1, sm: 1.5 },
          maxWidth: 336,
          mx: 'auto',
        }}
      >
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const isActive = focused && i === activeIndex
          return (
            <Box
              key={i}
              aria-hidden="true"
              sx={{
                height: 56,
                borderRadius: '12px',
                border: '1px solid',
                borderColor: error
                  ? 'error.main'
                  : isActive
                    ? 'primary.main'
                    : '#d2d2d7',
                boxShadow: isActive
                  ? '0 0 0 4px rgba(0, 125, 250, 0.3)'
                  : 'none',
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 500,
                fontVariantNumeric: 'tabular-nums',
                transition: 'border-color 150ms, box-shadow 150ms',
              }}
            >
              {otp[i] || ''}
            </Box>
          )
        })}

        <Box
          component="input"
          id="otp-verification-code"
          name="otp"
          aria-label="Verification code"
          aria-invalid={Boolean(error)}
          value={otp}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required
          autoFocus
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={CODE_LENGTH}
          sx={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            border: 0,
            fontSize: 16, // keeps iOS from zooming on focus
            cursor: 'text',
          }}
        />
      </Box>

      {error && (
        <Typography
          variant="body2"
          color="error"
          role="alert"
          sx={{ textAlign: 'center', mt: 2 }}
        >
          {error}
        </Typography>
      )}

      <Button
        fullWidth
        variant="contained"
        type="submit"
        size="large"
        loading={submitting}
        disabled={otp.length !== CODE_LENGTH}
        sx={{ mt: 4 }}
      >
        {submitLabel}
      </Button>

      <Box
        sx={{
          display: 'flex',
          justifyContent: onBack && onResend ? 'space-between' : 'center',
          alignItems: 'center',
          mt: 2,
        }}
      >
        {onBack && (
          <Button variant="text" size="small" onClick={onBack}>
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
            {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
          </Button>
        )}
      </Box>
    </form>
  )
}

export default OtpVerificationForm

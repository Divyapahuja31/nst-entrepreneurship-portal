import { Button, Typography } from '@mui/material'
import { canLockKpi, canUnlockKpi } from '@nst/shared/permissions.js'

import { LockIcon, LockOpenIcon } from './icons'

// Lock a graded KPI (its mentor or the board) or unlock it (the board only).
// Anyone else sees that it is locked.
export default function KpiLockAction({ actor, ctx, busy, onLock, onUnlock }) {
  if (canUnlockKpi(actor, ctx)) {
    return (
      <Button
        variant="outlined"
        startIcon={<LockOpenIcon />}
        loading={busy}
        onClick={onUnlock}
      >
        Unlock
      </Button>
    )
  }
  if (canLockKpi(actor, ctx)) {
    return (
      <Button
        variant="outlined"
        startIcon={<LockIcon />}
        loading={busy}
        onClick={onLock}
      >
        Lock Grade
      </Button>
    )
  }
  if (!ctx.isLocked) {
    return null
  }
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
    >
      <LockIcon sx={{ fontSize: 16 }} />
      Locked
    </Typography>
  )
}

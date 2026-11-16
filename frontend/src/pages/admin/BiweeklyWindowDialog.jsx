import * as React from 'react'
import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { ChevronRightIcon } from '../../components/icons'
import { getVentures } from '../../api/venture'
import toError from '../../api/toError'

function StartupSelection({ startups, selected, onChange, disabled }) {
  const [search, setSearch] = React.useState('')
  const visible = startups.filter(startup =>
    `${startup.name} ${startup.campus}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  )
  const summary =
    selected.length === startups.length
      ? `All startups (${startups.length})`
      : `${selected.length} of ${startups.length} startups selected`
  const toggle = id =>
    onChange(
      selected.includes(id)
        ? selected.filter(value => value !== id)
        : [...selected, id]
    )

  return (
    <Accordion
      disableGutters
      elevation={0}
      disabled={disabled}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: '8px !important',
        '&:before': { display: 'none' },
      }}
    >
      <AccordionSummary
        id="startup-selection-heading"
        aria-controls="startup-selection-options"
        expandIcon={<ChevronRightIcon sx={{ transform: 'rotate(90deg)' }} />}
      >
        <Box>
          <Typography variant="body2" color="text.secondary">
            Startups
          </Typography>
          <Typography fontWeight={600}>{summary}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <TextField
          fullWidth
          size="small"
          label="Search startups"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />
        <Stack direction="row" spacing={1} sx={{ py: 1 }}>
          <Button
            size="small"
            disabled={selected.length === startups.length}
            onClick={() => onChange(startups.map(startup => startup.id))}
          >
            Select all
          </Button>
          <Button
            size="small"
            disabled={!selected.length}
            onClick={() => onChange([])}
          >
            Select none
          </Button>
        </Stack>
        <Box
          role="group"
          aria-label="Startups to open"
          sx={{ maxHeight: 240, overflowY: 'auto' }}
        >
          {visible.map(startup => (
            <FormControlLabel
              key={startup.id}
              sx={{
                m: 0,
                px: 0.5,
                py: 0.5,
                width: '100%',
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
              control={
                <Checkbox
                  checked={selected.includes(startup.id)}
                  onChange={() => toggle(startup.id)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {startup.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {startup.campus}
                  </Typography>
                </Box>
              }
            />
          ))}
          {!visible.length && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No matching startups.
            </Typography>
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}

export default function BiweeklyWindowDialog({
  cycleNumber,
  now,
  onOpen,
  onClose,
}) {
  const [startups, setStartups] = React.useState([])
  const [selected, setSelected] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState('')
  const [attempt, setAttempt] = React.useState(0)
  const [until, setUntil] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  React.useEffect(() => {
    let active = true
    getVentures()
      .then(rows => {
        if (!active) return
        const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name))
        setStartups(sorted)
        setSelected(sorted.map(startup => startup.id))
        setLoading(false)
      })
      .catch(err => {
        if (!active) return
        setLoadError(toError(err, 'Could not load startups.').error)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [attempt])
  const validUntil = new Date(until).getTime() > now.getTime()
  const save = async () => {
    if (!validUntil || !selected.length || saving) return
    setSaving(true)
    setError('')
    try {
      const result = await onOpen(
        cycleNumber,
        new Date(until).toISOString(),
        selected
      )
      if (result.failedVentureIds.length) {
        setSelected(result.failedVentureIds)
        setError(
          `Opened for ${result.openedVentureIds.length} startups. ${result.failedVentureIds.length} could not be updated. Retry the remaining selection.`
        )
      } else {
        onClose()
      }
    } catch (err) {
      setError(toError(err, 'Could not open submission windows.').error)
    } finally {
      setSaving(false)
    }
  }
  return (
    <Dialog
      open
      onClose={() => !saving && onClose()}
      fullWidth
      maxWidth="sm"
      aria-labelledby="open-cycle-title"
    >
      <DialogTitle id="open-cycle-title">Open cycle {cycleNumber}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Selected startups can edit and submit immediately until the closing
            time. Their submitted reports will be unlocked.
          </Typography>
          {loading && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              role="status"
            >
              <CircularProgress size={18} />
              <Typography>Loading startups…</Typography>
            </Stack>
          )}
          {loadError && (
            <Alert
              severity="error"
              action={
                <Button
                  onClick={() => {
                    setLoadError('')
                    setLoading(true)
                    setAttempt(value => value + 1)
                  }}
                >
                  Retry
                </Button>
              }
            >
              {loadError}
            </Alert>
          )}
          {!loading && !loadError && (
            <StartupSelection
              startups={startups}
              selected={selected}
              onChange={setSelected}
              disabled={saving}
            />
          )}
          {!loading && !loadError && !selected.length && (
            <Typography variant="body2" color="text.secondary">
              Select at least one startup to open this cycle.
            </Typography>
          )}
          <TextField
            fullWidth
            label="Open until"
            type="datetime-local"
            value={until}
            disabled={saving}
            onChange={event => setUntil(event.target.value)}
            error={Boolean(until) && !validUntil}
            helperText={`Choose a future time in ${Intl.DateTimeFormat().resolvedOptions().timeZone}.`}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button disabled={saving} onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={
            loading ||
            Boolean(loadError) ||
            !validUntil ||
            !selected.length ||
            saving
          }
          onClick={save}
        >
          {saving
            ? 'Opening…'
            : `Open for ${selected.length} startup${selected.length === 1 ? '' : 's'}`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

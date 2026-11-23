import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material'
import { loadKpiBotSettings, saveKpiBotSettings } from '../api/kpiBotSettings'

export default function KpiBotPromptButton() {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState(null)
  const [guidance, setGuidance] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    const result = await loadKpiBotSettings()
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSettings(result.settings)
    setGuidance(result.settings.guidance)
    setConflict(false)
  }

  const edit = () => {
    setOpen(true)
    setSettings(null)
    load()
  }

  const save = async () => {
    setSaving(true)
    setError('')
    const result = await saveKpiBotSettings(guidance, settings.revision)
    setSaving(false)
    if (result.error) {
      setError(result.error)
      setConflict(Boolean(result.conflict))
      return
    }
    setOpen(false)
    setSaved(true)
  }

  const invalid =
    settings && (!guidance.trim() || guidance.length > settings.maxLength)

  return (
    <>
      <Button size="small" variant="text" onClick={edit}>
        Edit Prompt
      </Button>
      <Dialog
        open={open}
        onClose={() => !saving && setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit KPI Bot Prompt</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Change how the bot recommends KPIs for all startups. Saved changes
            apply to meetings the bot reads next. Existing recommendations and
            saved extraction results keep their original guidance.
          </Typography>
          {loading && (
            <CircularProgress size={24} aria-label="Loading prompt" />
          )}
          {error && (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={load}
                  disabled={loading || saving}
                >
                  Reload
                </Button>
              }
            >
              {error}
            </Alert>
          )}
          {settings && !loading && (
            <>
              <TextField
                autoFocus
                fullWidth
                multiline
                minRows={7}
                maxRows={16}
                label="Recommendation Guidance"
                value={guidance}
                onChange={event => setGuidance(event.target.value)}
                disabled={saving}
                error={Boolean(invalid)}
                helperText={
                  invalid
                    ? `Enter 1 to ${settings.maxLength} characters.`
                    : `${guidance.length} / ${settings.maxLength} characters`
                }
              />
              <Box
                sx={{ bgcolor: 'background.default', p: 2, borderRadius: 2 }}
              >
                <Typography variant="subtitle2">
                  Context Kept With Every Request
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  The meeting transcript, speakers, startups, founders, Google
                  account matches, meeting date, and time zone are still
                  included automatically. Quote checks, speaker matching, and
                  the required KPI format remain in place.
                </Typography>
                <Box component="details" sx={{ mt: 1 }}>
                  <Typography
                    component="summary"
                    variant="body2"
                    sx={{ cursor: 'pointer' }}
                  >
                    View Built-In Rules
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      mt: 1,
                    }}
                  >
                    {settings.fixedInstructions}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap' }}>
          <Button
            onClick={() => setGuidance(settings.defaultGuidance)}
            disabled={!settings || loading || saving}
          >
            Restore Default
          </Button>
          <Button onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={save}
            loading={saving}
            disabled={
              !settings ||
              loading ||
              Boolean(invalid) ||
              conflict ||
              guidance === settings.guidance
            }
          >
            Save Prompt
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={saved}
        autoHideDuration={5000}
        onClose={() => setSaved(false)}
      >
        <Alert severity="success" onClose={() => setSaved(false)}>
          KPI bot prompt saved.
        </Alert>
      </Snackbar>
    </>
  )
}

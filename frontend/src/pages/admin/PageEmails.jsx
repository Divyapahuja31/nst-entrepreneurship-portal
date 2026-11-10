import * as React from 'react'
import { useBlocker, useLoaderData } from 'react-router'

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Slider,
  Switch,
  TextField,
  Typography,
} from '@mui/material'

import PageHeader from '../../components/PageHeader'
import SectionCard from '../../components/SectionCard'
import { DocTextIcon, EnvelopeIcon, TargetIcon } from '../../components/icons'
import { previewEmail, saveEmailSettings } from '../../api/emails'

// The admin's Emails page: who emails come from, the header and footer
// they share, when KPI alerts go out, and each email's wording. Nothing
// changes until Save; the preview shows the unsaved draft.

const copy = value => structuredClone(value)
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// The settings as the form holds them: an unset sender field is empty text.
const formOf = settings => ({
  ...copy(settings),
  sender: {
    fromName: settings.sender.fromName ?? '',
    replyTo: settings.sender.replyTo ?? '',
  },
})

// "templates.student-result.subject" -> that field's error, if the last
// save failed on it.
const errorFor = (failure, path) =>
  failure?.field === path ? failure.error : undefined

function ResetButton({ show, onClick }) {
  if (!show) {
    return null
  }
  return (
    <Button size="small" onClick={onClick} sx={{ justifySelf: 'start' }}>
      Use the default
    </Button>
  )
}

function SenderSection({ form, setForm, defaults, senderAddress, failure }) {
  const setSender = (name, value) =>
    setForm(f => ({ ...f, sender: { ...f.sender, [name]: value } }))
  const setBrand = (name, value) =>
    setForm(f => ({ ...f, brand: { ...f.brand, [name]: value } }))
  const brandField = (name, label, props = {}) => (
    <Box sx={{ display: 'grid', gap: 0.5 }}>
      <TextField
        fullWidth
        label={label}
        value={form.brand[name] ?? ''}
        onChange={event => setBrand(name, event.target.value)}
        error={Boolean(errorFor(failure, `brand.${name}`))}
        helperText={errorFor(failure, `brand.${name}`)}
        {...props}
      />
      <ResetButton
        show={form.brand[name] !== defaults.brand[name]}
        onClick={() => setBrand(name, defaults.brand[name])}
      />
    </Box>
  )

  return (
    <SectionCard
      icon={EnvelopeIcon}
      title="Sender and Footer"
      subtitle="Who every email comes from, and the lines at its top and bottom."
    >
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        }}
      >
        <TextField
          label="Sender name"
          value={form.sender.fromName}
          onChange={event => setSender('fromName', event.target.value)}
          error={Boolean(errorFor(failure, 'sender.fromName'))}
          helperText={
            errorFor(failure, 'sender.fromName') ||
            (senderAddress
              ? `Sent from ${senderAddress}. Leave empty to keep the server's name.`
              : 'Leave empty to keep the server’s name.')
          }
        />
        <TextField
          label="Reply-to address"
          type="email"
          value={form.sender.replyTo}
          onChange={event => setSender('replyTo', event.target.value)}
          error={Boolean(errorFor(failure, 'sender.replyTo'))}
          helperText={
            errorFor(failure, 'sender.replyTo') ||
            'Where replies go. Leave empty for none.'
          }
        />
        {brandField('title', 'Header')}
        {brandField('subtitle', 'Header, second line')}
        <Box sx={{ gridColumn: { sm: '1 / -1' } }}>
          {brandField('footer', 'Footer', { multiline: true, minRows: 2 })}
        </Box>
      </Box>
    </SectionCard>
  )
}

const asNumber = value => (value === '' ? '' : Number(value))

// The rules in words, as they stand in the form.
const describeRules = ({ lowPercent, passPercent, strikes }) => {
  if ([lowPercent, passPercent, strikes].some(v => v === '' || isNaN(v))) {
    return null
  }
  const run = strikes === 1 ? 'one grade' : `${strikes} grades in a row`
  return `A grade at or below ${lowPercent}% is a low score, and below ${passPercent}% needs improvement. After ${run} below ${passPercent}%, the startup's mentors are emailed. After ${run} at or below ${lowPercent}%, the academic board is too.`
}

function RulesSection({ form, setForm, defaults, failure }) {
  const setRule = (name, value) =>
    setForm(f => ({ ...f, rules: { ...f.rules, [name]: asNumber(value) } }))
  const rule = (name, label, helper, props) => (
    <TextField
      label={label}
      type="number"
      value={form.rules[name]}
      onChange={event => setRule(name, event.target.value)}
      error={Boolean(errorFor(failure, `rules.${name}`))}
      helperText={errorFor(failure, `rules.${name}`) || helper}
      slotProps={{ htmlInput: props }}
    />
  )
  const changed = !same(form.rules, defaults.rules)

  return (
    <SectionCard
      icon={TargetIcon}
      title="KPI Alert Rules"
      subtitle="When a run of locked grades alerts mentors and the academic board."
      action={
        changed && (
          <Button
            size="small"
            onClick={() =>
              setForm(f => ({ ...f, rules: copy(defaults.rules) }))
            }
          >
            Use the defaults
          </Button>
        )
      }
    >
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          mb: 2,
        }}
      >
        {rule(
          'lowPercent',
          'Low score, at or below (%)',
          `Default ${defaults.rules.lowPercent}`,
          { min: 0, max: 99 }
        )}
        {rule(
          'passPercent',
          'On track, from (%)',
          `Default ${defaults.rules.passPercent}`,
          { min: 1, max: 100 }
        )}
        {rule(
          'strikes',
          'Grades in a row',
          `Default ${defaults.rules.strikes}`,
          { min: 1, max: 10 }
        )}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {describeRules(form.rules)}
      </Typography>
    </SectionCard>
  )
}

// The draft rendered by the server, a moment after the last keystroke.
function Preview({ email, form }) {
  const [score, setScore] = React.useState(35)
  const [result, setResult] = React.useState(null)

  React.useEffect(() => {
    let stale = false
    const timer = setTimeout(async () => {
      const next = await previewEmail({
        key: email.key,
        score,
        settings: form,
      })
      if (!stale) {
        setResult(next)
      }
    }, 300)
    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [email.key, score, form])

  return (
    <Box sx={{ display: 'grid', gap: 1.5, alignContent: 'start' }}>
      <Typography variant="subtitle2">Preview, with sample data</Typography>
      {email.usesScore && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', px: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Score
          </Typography>
          <Slider
            value={score}
            min={0}
            max={100}
            onChange={(_, value) => setScore(value)}
            valueLabelDisplay="auto"
            aria-label="Sample score"
          />
          <Typography variant="body2" sx={{ minWidth: 40 }}>
            {score}%
          </Typography>
        </Box>
      )}
      {result?.error ? (
        <Alert severity="warning">{result.error}</Alert>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary">
            Subject: {result?.email?.subject ?? '…'}
          </Typography>
          <Box
            component="iframe"
            title={`Preview of ${email.label}`}
            // No scripts, no navigation: it only shows the email.
            sandbox=""
            srcDoc={result?.email?.html ?? ''}
            sx={{
              width: '100%',
              height: 560,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.default',
            }}
          />
        </>
      )}
    </Box>
  )
}

function EmailsSection({ emails, form, setForm, failure, selected, select }) {
  const email = emails.find(e => e.key === selected) ?? emails[0]
  const own = form.templates[email.key]
  const setField = (name, value) =>
    setForm(f => ({
      ...f,
      templates: {
        ...f.templates,
        [email.key]: { ...f.templates[email.key], [name]: value },
      },
    }))

  return (
    <SectionCard
      icon={DocTextIcon}
      title="Email Wording"
      subtitle="What each email says, and whether it is sent. Placeholders in braces are filled in for each email."
    >
      <TextField
        select
        fullWidth
        label="Email"
        value={email.key}
        onChange={event => select(event.target.value)}
        sx={{ mb: 2 }}
      >
        {emails.map(option => (
          <MenuItem key={option.key} value={option.key}>
            {option.label}
            {form.templates[option.key].enabled ? '' : ' (off)'}
          </MenuItem>
        ))}
      </TextField>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        }}
      >
        <Box sx={{ display: 'grid', gap: 2, alignContent: 'start' }}>
          <Typography variant="body2" color="text.secondary">
            {email.description}
          </Typography>
          {email.canDisable && (
            <FormControlLabel
              control={
                <Switch
                  checked={own.enabled}
                  onChange={event => setField('enabled', event.target.checked)}
                />
              }
              label={own.enabled ? 'Sent' : 'Not sent'}
            />
          )}
          {email.fields.map(field => {
            const path = `templates.${email.key}.${field.name}`
            return (
              <Box key={field.name} sx={{ display: 'grid', gap: 0.5 }}>
                <TextField
                  fullWidth
                  label={field.label}
                  value={own[field.name] ?? ''}
                  onChange={event => setField(field.name, event.target.value)}
                  multiline={field.multiline}
                  minRows={field.multiline ? 2 : undefined}
                  disabled={!own.enabled}
                  error={Boolean(errorFor(failure, path))}
                  helperText={errorFor(failure, path)}
                />
                <ResetButton
                  show={own.enabled && own[field.name] !== field.default}
                  onClick={() => setField(field.name, field.default)}
                />
              </Box>
            )
          })}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Placeholders
            </Typography>
            {email.placeholders.map(p => (
              <Typography key={p.name} variant="body2" color="text.secondary">
                <Box
                  component="code"
                  sx={{ color: 'text.primary', fontWeight: 500 }}
                >
                  {`{${p.name}}`}
                </Box>{' '}
                {p.description}
              </Typography>
            ))}
          </Box>
        </Box>
        {/* A new email starts its own preview, not the last one's. */}
        <Preview key={email.key} email={email} form={form} />
      </Box>
    </SectionCard>
  )
}

// The email a failed save points at, so its editor can show the error.
const emailOfField = field =>
  field?.startsWith('templates.') ? field.split('.')[1] : null

export default function PageEmails() {
  const [page, setPage] = React.useState(useLoaderData())
  const [form, setForm] = React.useState(() => formOf(page.settings))
  const [selected, setSelected] = React.useState(page.emails[0].key)
  const [saving, setSaving] = React.useState(false)
  const [failure, setFailure] = React.useState(null)
  const [notice, setNotice] = React.useState('')
  const dirty = !same(form, formOf(page.settings))

  // Unsaved changes aren't lost by leaving the page by mistake.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname
  )
  React.useEffect(() => {
    if (!dirty) {
      return undefined
    }
    const warn = event => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const save = async () => {
    setSaving(true)
    setNotice('')
    const result = await saveEmailSettings(form)
    setSaving(false)
    if (result.error) {
      setFailure(result)
      const key = emailOfField(result.field)
      if (key) {
        setSelected(key)
      }
      return
    }
    setFailure(null)
    setPage(result.page)
    setForm(formOf(result.page.settings))
    setNotice('Saved. Emails sent from now on use these settings.')
  }

  const discard = () => {
    setForm(formOf(page.settings))
    setFailure(null)
  }

  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
      <PageHeader
        title="Emails"
        subtitle="What the portal's emails say, who they come from and when KPI alerts go out."
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" disabled={!dirty} onClick={discard}>
              Discard
            </Button>
            <Button
              variant="contained"
              disabled={!dirty}
              loading={saving}
              onClick={save}
            >
              Save
            </Button>
          </Box>
        }
      />

      {notice && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}
      {failure && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setFailure(null)}>
          {failure.error}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: { xs: 2, sm: 3 } }}>
        <SenderSection
          form={form}
          setForm={setForm}
          defaults={page.defaults}
          senderAddress={page.senderAddress}
          failure={failure}
        />
        <RulesSection
          form={form}
          setForm={setForm}
          defaults={page.defaults}
          failure={failure}
        />
        <EmailsSection
          emails={page.emails}
          form={form}
          setForm={setForm}
          failure={failure}
          selected={selected}
          select={setSelected}
        />
      </Box>

      <Dialog
        open={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Leave without saving?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your changes to the emails are not saved yet. Leaving discards them.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => blocker.reset?.()}>
            Stay
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => blocker.proceed?.()}
          >
            Leave
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

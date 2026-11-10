import React from 'react'
import { useLoaderData } from 'react-router'

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'

import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import SectionCard from '../../components/SectionCard'
import StatusPill from '../../components/StatusPill'
import { StyledTableCell, StyledTableRow } from '../../components/Table.style'
import {
  BuildingIcon,
  EnvelopeIcon,
  PeopleIcon,
  PlusIcon,
} from '../../components/icons'
import {
  addBatch,
  addCampus,
  addDomain,
  removeBatch,
  removeCampus,
  removeDomain,
  setDomainStaff,
} from '../../api/setup'
import { useAuthStore } from '../../stores/auth'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

const domainOf = email => email?.split('@')[1]?.toLowerCase() ?? ''

// A table inside a section card, scrolling sideways on a phone.
function SectionTable({ minWidth, head, children }) {
  return (
    <Box sx={{ overflowX: 'auto', mx: { xs: -2.5, sm: -3 } }}>
      <Table sx={{ minWidth }}>
        <TableHead>
          <TableRow>
            {head.map(cell => (
              <StyledTableCell
                key={cell.label}
                align={cell.align}
                sx={{
                  '&:first-of-type': { pl: { xs: 2.5, sm: 3 } },
                  '&:last-of-type': { pr: { xs: 2.5, sm: 3 } },
                }}
              >
                {cell.label}
              </StyledTableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody
          sx={{
            '& td:first-of-type': { pl: { xs: 2.5, sm: 3 } },
            '& td:last-of-type': { pr: { xs: 2.5, sm: 3 } },
          }}
        >
          {children}
        </TableBody>
      </Table>
    </Box>
  )
}

// A remove button that says why when it can't be used.
function RemoveButton({ blockedBy, onClick }) {
  return (
    <span title={blockedBy || undefined}>
      <Button
        variant="text"
        color="error"
        disabled={Boolean(blockedBy)}
        onClick={onClick}
      >
        Remove
      </Button>
    </span>
  )
}

// The add dialogs: `fields` render inside a form; `submit` returns the API's
// result, whose field errors land on the inputs.
function AddDialog({ open, title, intro, initial, fields, submit, onClose }) {
  const [form, setForm] = React.useState(initial)
  const [errors, setErrors] = React.useState({})
  const [formError, setFormError] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const close = () => {
    setForm(initial)
    setErrors({})
    setFormError('')
    onClose()
  }

  const onSubmit = async event => {
    event.preventDefault()
    setSaving(true)
    const result = await submit(form)
    setSaving(false)
    if (result.error) {
      setErrors(typeof result.error === 'object' ? result.error : {})
      setFormError(typeof result.error === 'object' ? '' : result.error)
      return
    }
    close()
  }

  const field = name => ({
    value: form[name],
    onChange: event => setForm({ ...form, [name]: event.target.value }),
    error: Boolean(errors[name]),
    helperText: errors[name],
  })

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <form onSubmit={onSubmit} noValidate>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>{intro}</DialogContentText>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Box sx={{ display: 'grid', gap: 2, pt: 0.5 }}>
            {fields(field, form)}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" type="submit" loading={saving}>
            {title}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

const THIS_YEAR = new Date().getFullYear()

const EMPTY_CAMPUS = { name: '', location: '' }
const emptyBatch = campuses => ({
  campus: campuses.length === 1 ? campuses[0]._id : '',
  startYear: String(THIS_YEAR),
  endYear: String(THIS_YEAR + 4),
  name: '',
})

function DomainsSection({ domains, myDomain, run, confirmRemove }) {
  const [domain, setDomain] = React.useState('')
  const [staff, setStaff] = React.useState(false)
  const [error, setError] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const add = async event => {
    event.preventDefault()
    const name = domain.trim().toLowerCase().replace(/^@/, '')
    setSaving(true)
    const result = await run(() => addDomain({ domain: name, staff }), {
      done: `People with an @${name} email can now sign up.`,
      quiet: true,
    })
    setSaving(false)
    if (result.error) {
      setError(result.error.domain ?? result.error)
      return
    }
    setDomain('')
    setStaff(false)
    setError('')
  }

  const removeBlocker = entry => {
    if (entry.domain === myDomain) {
      return 'Your own account uses this domain'
    }
    return domains.length <= 1 ? 'Keep at least one domain' : null
  }

  return (
    <SectionCard
      icon={EnvelopeIcon}
      title="Allowed Email Domains"
      subtitle="Only these addresses can sign up or sign in with Google. Each domain or subdomain is its own entry."
    >
      <Box
        component="form"
        onSubmit={add}
        noValidate
        sx={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          mb: 3,
        }}
      >
        <TextField
          label="Domain"
          placeholder="students.example.edu"
          value={domain}
          onChange={event => setDomain(event.target.value)}
          error={Boolean(error)}
          helperText={error || 'What comes after the @'}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ flex: '1 1 240px' }}
        />
        <TextField
          select
          label="New accounts start as"
          value={staff ? 'staff' : 'student'}
          onChange={event => setStaff(event.target.value === 'staff')}
          sx={{ flex: '0 1 200px', minWidth: 180 }}
        >
          <MenuItem value="student">Student</MenuItem>
          <MenuItem value="staff">Mentor</MenuItem>
        </TextField>
        <Button
          type="submit"
          variant="contained"
          startIcon={<PlusIcon />}
          loading={saving}
          disabled={!domain.trim()}
          sx={{ mt: 1 }}
        >
          Add Domain
        </Button>
      </Box>

      <SectionTable
        minWidth={520}
        head={[
          { label: 'Domain' },
          { label: 'New accounts start as' },
          { label: 'Actions', align: 'right' },
        ]}
      >
        {domains.map(entry => (
          <StyledTableRow key={entry._id}>
            <StyledTableCell>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                @{entry.domain}
                {entry.domain === myDomain && (
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                  >
                    {' '}
                    (yours)
                  </Typography>
                )}
              </Typography>
            </StyledTableCell>
            <StyledTableCell>
              <TextField
                select
                size="small"
                hiddenLabel
                value={entry.staff ? 'staff' : 'student'}
                onChange={event =>
                  run(
                    () =>
                      setDomainStaff(entry._id, event.target.value === 'staff'),
                    {
                      done: () =>
                        `New @${entry.domain} accounts start as ${
                          event.target.value === 'staff'
                            ? 'Mentors'
                            : 'Students'
                        }. Existing accounts keep their roles.`,
                    }
                  )
                }
                slotProps={{
                  htmlInput: {
                    'aria-label': `New @${entry.domain} accounts start as`,
                  },
                }}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="student">Student</MenuItem>
                <MenuItem value="staff">Mentor</MenuItem>
              </TextField>
            </StyledTableCell>
            <StyledTableCell align="right">
              <RemoveButton
                blockedBy={removeBlocker(entry)}
                onClick={() =>
                  confirmRemove({
                    title: `Remove @${entry.domain}?`,
                    body: `No one new can sign up with an @${entry.domain} email, and existing accounts can no longer sign in with Google. Accounts with a password still can.`,
                    action: () => removeDomain(entry._id),
                    done: `@${entry.domain} was removed.`,
                  })
                }
              />
            </StyledTableCell>
          </StyledTableRow>
        ))}
      </SectionTable>
    </SectionCard>
  )
}

function CampusesSection({ campuses, run, confirmRemove }) {
  const [adding, setAdding] = React.useState(false)

  const removeBlocker = campus => {
    if (campus.batches) {
      return 'Remove its batches first'
    }
    if (campus.people || campus.startups) {
      return 'People or startups belong to this campus'
    }
    return null
  }

  return (
    <SectionCard
      icon={BuildingIcon}
      tint="green"
      title="Campuses"
      subtitle="Every student and startup belongs to one."
      action={
        <Button
          variant="outlined"
          startIcon={<PlusIcon />}
          onClick={() => setAdding(true)}
        >
          Add Campus
        </Button>
      }
    >
      {campuses.length ? (
        <SectionTable
          minWidth={600}
          head={[
            { label: 'Campus' },
            { label: 'Batches' },
            { label: 'People' },
            { label: 'Startups' },
            { label: 'Actions', align: 'right' },
          ]}
        >
          {campuses.map(campus => (
            <StyledTableRow key={campus._id}>
              <StyledTableCell>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {campus.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {campus.location}
                </Typography>
              </StyledTableCell>
              <StyledTableCell>{campus.batches}</StyledTableCell>
              <StyledTableCell>{campus.people}</StyledTableCell>
              <StyledTableCell>{campus.startups}</StyledTableCell>
              <StyledTableCell align="right">
                <RemoveButton
                  blockedBy={removeBlocker(campus)}
                  onClick={() =>
                    confirmRemove({
                      title: `Remove ${campus.name}?`,
                      body: 'Nothing belongs to it yet, so nothing else changes.',
                      action: () => removeCampus(campus._id),
                      done: `${campus.name} was removed.`,
                    })
                  }
                />
              </StyledTableCell>
            </StyledTableRow>
          ))}
        </SectionTable>
      ) : (
        <EmptyState
          icon={BuildingIcon}
          title="No campuses yet"
          description="Add a campus before adding batches; students can't sign up without one."
        />
      )}

      <AddDialog
        open={adding}
        title="Add Campus"
        intro="Students choose it when they sign up, and their startups belong to it."
        initial={EMPTY_CAMPUS}
        onClose={() => setAdding(false)}
        submit={form =>
          run(() => addCampus(form), {
            done: () => `${form.name.trim()} was added.`,
            quiet: true,
          })
        }
        fields={field => (
          <>
            <TextField label="Name" required autoFocus {...field('name')} />
            <TextField
              label="Location"
              required
              placeholder="City"
              {...field('location')}
            />
          </>
        )}
      />
    </SectionCard>
  )
}

function BatchesSection({ batches, campuses, run, confirmRemove }) {
  const [adding, setAdding] = React.useState(false)
  const initial = emptyBatch(campuses)

  return (
    <SectionCard
      icon={PeopleIcon}
      tint="orange"
      title="Batches"
      subtitle="Students pick their batch when they sign up."
      action={
        <Button
          variant="outlined"
          startIcon={<PlusIcon />}
          disabled={!campuses.length}
          onClick={() => setAdding(true)}
        >
          Add Batch
        </Button>
      }
    >
      {batches.length ? (
        <SectionTable
          minWidth={600}
          head={[
            { label: 'Batch' },
            { label: 'Campus' },
            { label: 'Students' },
            { label: 'Status' },
            { label: 'Actions', align: 'right' },
          ]}
        >
          {batches.map(batch => {
            const ended = batch.endYear < THIS_YEAR
            return (
              <StyledTableRow key={batch._id}>
                <StyledTableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {batch.name}
                  </Typography>
                  {batch.name !== `${batch.startYear}-${batch.endYear}` && (
                    <Typography variant="body2" color="text.secondary">
                      {batch.startYear}–{batch.endYear}
                    </Typography>
                  )}
                </StyledTableCell>
                <StyledTableCell>
                  {batch.campus?.name ?? 'Unknown campus'}
                </StyledTableCell>
                <StyledTableCell>{batch.people}</StyledTableCell>
                <StyledTableCell>
                  <StatusPill
                    label={ended ? 'Graduated' : 'Current'}
                    tint={ended ? 'gray' : 'green'}
                    plain={ended}
                  />
                </StyledTableCell>
                <StyledTableCell align="right">
                  <RemoveButton
                    blockedBy={
                      batch.people
                        ? `${plural(batch.people, 'student')} in this batch`
                        : null
                    }
                    onClick={() =>
                      confirmRemove({
                        title: `Remove ${batch.name}?`,
                        body: 'No one is in it, so nothing else changes.',
                        action: () => removeBatch(batch._id),
                        done: `${batch.name} was removed.`,
                      })
                    }
                  />
                </StyledTableCell>
              </StyledTableRow>
            )
          })}
        </SectionTable>
      ) : (
        <EmptyState
          icon={PeopleIcon}
          title="No batches yet"
          description="Students can't sign up until their campus has a batch."
        />
      )}

      <AddDialog
        // Remounts with fresh defaults whenever the campus list changes.
        key={campuses.map(c => c._id).join()}
        open={adding}
        title="Add Batch"
        intro="Students choose it when they sign up."
        initial={initial}
        onClose={() => setAdding(false)}
        submit={form =>
          run(() => addBatch(form), {
            done: () =>
              `${form.name.trim() || `${form.startYear}-${form.endYear}`} was added.`,
            quiet: true,
          })
        }
        fields={(field, form) => (
          <>
            <TextField select label="Campus" required {...field('campus')}>
              {campuses.map(campus => (
                <MenuItem key={campus._id} value={campus._id}>
                  {campus.name}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Starts"
                type="number"
                required
                {...field('startYear')}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Ends"
                type="number"
                required
                {...field('endYear')}
                sx={{ flex: 1 }}
              />
            </Box>
            <TextField
              label="Name"
              placeholder={`${form.startYear}-${form.endYear}`}
              {...field('name')}
              helperText={
                field('name').helperText ||
                'Leave empty to name it by its years'
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </>
        )}
      />
    </SectionCard>
  )
}

export default function PageSetup() {
  const [page, setPage] = React.useState(useLoaderData())
  const myDomain = domainOf(useAuthStore(state => state.user?.email))
  const [notice, setNotice] = React.useState('')
  const [error, setError] = React.useState('')
  // A removal waiting for confirmation: { title, body, action, done }.
  const [confirming, setConfirming] = React.useState(null)
  const [busy, setBusy] = React.useState(false)

  // Runs a change and shows the new page. `done` is the notice (or makes it
  // from the new page). A `quiet` change leaves its error to the form that
  // made it.
  const run = async (action, { done, quiet } = {}) => {
    setError('')
    const result = await action()
    if (result.error) {
      if (!quiet) {
        setError(result.error)
      }
      return result
    }
    setPage(result.page)
    setNotice(typeof done === 'function' ? done(result.page) : done)
    return result
  }
  const confirm = async () => {
    setBusy(true)
    await run(confirming.action, { done: confirming.done })
    setBusy(false)
    setConfirming(null)
  }

  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
      <PageHeader
        title="School Setup"
        subtitle="The campuses and batches students choose when they sign up, and the email addresses allowed in."
      />

      {notice && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: { xs: 2, sm: 3 } }}>
        <CampusesSection
          campuses={page.campuses}
          run={run}
          confirmRemove={setConfirming}
        />
        <BatchesSection
          batches={page.batches}
          campuses={page.campuses}
          run={run}
          confirmRemove={setConfirming}
        />
        <DomainsSection
          domains={page.domains}
          myDomain={myDomain}
          run={run}
          confirmRemove={setConfirming}
        />
      </Box>

      <Dialog
        open={Boolean(confirming)}
        onClose={() => !busy && setConfirming(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{confirming?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirming?.body}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            disabled={busy}
            onClick={() => setConfirming(null)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            loading={busy}
            onClick={confirm}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

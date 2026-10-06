import React from 'react'
import { useLoaderData, useRevalidator } from 'react-router'
import {
  ROLE_LABELS,
  ROLE_NAMES,
  ROLES,
  canChangeRoleOf,
  canDeleteAccountOf,
} from '@nst/shared/permissions.js'

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
  Tab,
  Table,
  TableBody,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'

import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import SectionCard from '../../components/SectionCard'
import StatTile from '../../components/StatTile'
import StatusPill from '../../components/StatusPill'
import TableCard from '../../components/TableCard'
import { StyledTableCell, StyledTableRow } from '../../components/Table.style'
import {
  BookIcon,
  PeopleIcon,
  PersonAddIcon,
  ShieldIcon,
  TargetIcon,
} from '../../components/icons'
import { formatDate } from '../../components/kpiStatus'
import {
  changeAccountRole,
  createAccount,
  deactivateAccount,
} from '../../api/accounts'
import useAccess from '../../hooks/useAccess'

// What each role may do, in a sentence, for the role menu and dialogs.
const ROLE_SUMMARY = {
  [ROLES.ADMIN]: 'Everything, including accounts and roles',
  [ROLES.ACADEMIC_BOARD]: 'Reviews every startup and can unlock final grades',
  [ROLES.MENTOR]: 'Reviews the startups assigned to them',
  [ROLES.STUDENT]: 'Works on their own startup',
}

const NO_ROLE = 'NONE'
const DEACTIVATED = 'DEACTIVATED'

const roleLabel = role => ROLE_LABELS[role] ?? 'No role'

const statusOf = account => {
  if (account.deactivatedAt) {
    return { label: 'Deactivated', tint: 'gray', plain: true }
  }
  if (!account.role) {
    return { label: 'No role', tint: 'orange' }
  }
  return { label: 'Active', tint: 'green' }
}

const matchesFilter = (account, filter) => {
  if (filter === DEACTIVATED) {
    return Boolean(account.deactivatedAt)
  }
  if (account.deactivatedAt) {
    return false
  }
  if (filter === NO_ROLE) {
    return !account.role
  }
  return !filter || account.role === filter
}

const matchesSearch = (account, search) => {
  const query = search.trim().toLowerCase()
  return (
    !query ||
    account.username?.toLowerCase().includes(query) ||
    account.email?.toLowerCase().includes(query) ||
    account.venture?.name?.toLowerCase().includes(query)
  )
}

const describeEntry = entry => {
  switch (entry.action) {
    case 'ROLE_CHANGED':
      return `${roleLabel(entry.previousRole)} → ${roleLabel(entry.newRole)}`
    case 'ACCOUNT_CREATED':
      return `Created as ${roleLabel(entry.newRole)}`
    case 'ACCOUNT_DEACTIVATED':
      return 'Deactivated'
    default:
      return entry.action
  }
}

function RoleSelect({ account, disabledReason, onChange }) {
  return (
    <TextField
      select
      size="small"
      hiddenLabel
      value={account.role ?? ''}
      disabled={Boolean(disabledReason)}
      title={disabledReason || undefined}
      onChange={event => onChange(event.target.value)}
      slotProps={{
        select: { displayEmpty: true },
        htmlInput: { 'aria-label': `Role of ${account.username}` },
      }}
      sx={{ minWidth: 170 }}
    >
      <MenuItem value="" disabled>
        Choose a role
      </MenuItem>
      {ROLE_NAMES.map(role => (
        <MenuItem key={role} value={role}>
          {ROLE_LABELS[role]}
        </MenuItem>
      ))}
    </TextField>
  )
}

const EMPTY_FORM = { username: '', email: '', role: ROLES.MENTOR, batch: '' }

function AddAccountDialog({ open, batches, onClose, onCreated }) {
  const [form, setForm] = React.useState(EMPTY_FORM)
  const [errors, setErrors] = React.useState({})
  const [formError, setFormError] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const set = field => event =>
    setForm({ ...form, [field]: event.target.value })
  const isStudent = form.role === ROLES.STUDENT

  const close = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setFormError('')
    onClose()
  }

  const submit = async event => {
    event.preventDefault()
    const batch = batches.find(b => b._id === form.batch)
    setSaving(true)
    const result = await createAccount({
      username: form.username,
      email: form.email,
      role: form.role,
      ...(isStudent && { batch: form.batch, campus: batch?.campus?._id }),
    })
    setSaving(false)

    if (result.error) {
      if (typeof result.error === 'object') {
        setErrors(result.error)
        setFormError('')
      } else {
        setErrors({})
        setFormError(result.error)
      }
      return
    }
    onCreated(result.account)
    close()
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle>Add Account</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            They sign in with their school Google account, or set a password
            with “Forgot password”.
          </DialogContentText>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="Name"
              autoComplete="name"
              required
              value={form.username}
              onChange={set('username')}
              error={Boolean(errors.username)}
              helperText={errors.username}
            />
            <TextField
              label="School email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={set('email')}
              error={Boolean(errors.email)}
              helperText={
                errors.email || 'An @adypu.edu.in or @newtonschool.co address'
              }
            />
            <TextField
              select
              label="Role"
              required
              value={form.role}
              onChange={set('role')}
              error={Boolean(errors.role)}
              helperText={errors.role || ROLE_SUMMARY[form.role]}
            >
              {ROLE_NAMES.map(role => (
                <MenuItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </MenuItem>
              ))}
            </TextField>
            {isStudent && (
              <TextField
                select
                label="Batch"
                required
                value={form.batch}
                onChange={set('batch')}
                error={Boolean(errors.batch || errors.campus)}
                helperText={
                  errors.batch ||
                  errors.campus ||
                  'Students need a batch, as when they sign up.'
                }
              >
                {batches.map(batch => (
                  <MenuItem key={batch._id} value={batch._id}>
                    {batch.name} · {batch.campus?.name ?? 'Unknown campus'}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" type="submit" loading={saving}>
            Add Account
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function ActivityLog({ entries }) {
  if (!entries.length) {
    return (
      <SectionCard>
        <EmptyState
          icon={BookIcon}
          title="No changes yet"
          description="Role changes, new accounts and deactivations will be listed here."
        />
      </SectionCard>
    )
  }
  return (
    <TableCard>
      <Table sx={{ minWidth: 640 }}>
        <TableHead>
          <TableRow>
            <StyledTableCell>When</StyledTableCell>
            <StyledTableCell>Account</StyledTableCell>
            <StyledTableCell>Change</StyledTableCell>
            <StyledTableCell>By</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map(entry => (
            <StyledTableRow key={entry._id}>
              <StyledTableCell sx={{ whiteSpace: 'nowrap' }}>
                {formatDate(entry.createdAt)}
              </StyledTableCell>
              <StyledTableCell>{entry.target?.email}</StyledTableCell>
              <StyledTableCell>{describeEntry(entry)}</StyledTableCell>
              <StyledTableCell>
                {entry.actor?.email ?? 'Command line'}
              </StyledTableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  )
}

export default function PageAccounts() {
  const { accounts, adminCount, entries, batches } = useLoaderData()
  const revalidator = useRevalidator()
  const { actor } = useAccess()

  const [tab, setTab] = React.useState(0)
  const [search, setSearch] = React.useState('')
  const [filter, setFilter] = React.useState('')
  const [adding, setAdding] = React.useState(false)
  // A change waiting for confirmation: { kind: 'role' | 'deactivate',
  // account, role }.
  const [confirming, setConfirming] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [notice, setNotice] = React.useState('')
  const [error, setError] = React.useState('')

  const active = accounts.filter(account => !account.deactivatedAt)
  const countRole = role => active.filter(a => a.role === role).length
  const noRoleCount = active.filter(a => !a.role).length
  const visible = accounts.filter(
    account => matchesFilter(account, filter) && matchesSearch(account, search)
  )

  // The API refuses these too; disabling them says why up front.
  const lockedReason = account => {
    if (account.deactivatedAt) {
      return 'This account is deactivated'
    }
    if (!canChangeRoleOf(actor, account.id)) {
      return "You can't change your own role"
    }
    if (account.role === ROLES.ADMIN && adminCount <= 1) {
      return 'The last admin keeps their role'
    }
    return null
  }

  const confirm = async () => {
    const { kind, account, role } = confirming
    setBusy(true)
    setError('')
    const result =
      kind === 'role'
        ? await changeAccountRole(account.id, role)
        : await deactivateAccount(account.id)
    setBusy(false)
    setConfirming(null)
    if (result.error) {
      setError(result.error)
      return
    }
    setNotice(
      kind === 'role'
        ? `${account.username} is now ${roleLabel(role)}.`
        : `${account.username} was deactivated.`
    )
    revalidator.revalidate()
  }

  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
      <PageHeader
        title="Accounts & Roles"
        subtitle="Who can sign in and what they can do. Every change is recorded in Activity."
        action={
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setAdding(true)}
          >
            Add Account
          </Button>
        }
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
      {noRoleCount > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" onClick={() => setFilter(NO_ROLE)}>
              Show
            </Button>
          }
        >
          {noRoleCount === 1
            ? '1 account has no role and sees only an error page.'
            : `${noRoleCount} accounts have no role and see only an error page.`}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 2, sm: 3 },
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
          },
          mb: 3,
        }}
      >
        <StatTile
          icon={ShieldIcon}
          label="Admins"
          value={countRole(ROLES.ADMIN)}
        />
        <StatTile
          icon={BookIcon}
          label="Academic Board"
          value={countRole(ROLES.ACADEMIC_BOARD)}
        />
        <StatTile
          icon={TargetIcon}
          tint="green"
          label="Mentors"
          value={countRole(ROLES.MENTOR)}
        />
        <StatTile
          icon={PeopleIcon}
          tint="gray"
          label="Students"
          value={countRole(ROLES.STUDENT)}
        />
      </Box>

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        aria-label="Accounts sections"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={`Accounts (${active.length})`} />
        <Tab label="Activity" />
      </Tabs>

      {tab === 0 && (
        <>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            <TextField
              label="Search"
              placeholder="Name, email or startup"
              value={search}
              onChange={event => setSearch(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ flex: '1 1 260px' }}
            />
            <TextField
              select
              label="Role"
              value={filter}
              onChange={event => setFilter(event.target.value)}
              slotProps={{
                select: { displayEmpty: true },
                inputLabel: { shrink: true },
              }}
              sx={{ flex: '0 1 220px', minWidth: 180 }}
            >
              <MenuItem value="">All active accounts</MenuItem>
              {ROLE_NAMES.map(role => (
                <MenuItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </MenuItem>
              ))}
              <MenuItem value={NO_ROLE}>No role</MenuItem>
              <MenuItem value={DEACTIVATED}>Deactivated</MenuItem>
            </TextField>
          </Box>

          {visible.length ? (
            <TableCard>
              <Table sx={{ minWidth: 760 }}>
                <TableHead>
                  <TableRow>
                    <StyledTableCell>Account</StyledTableCell>
                    <StyledTableCell>Startup</StyledTableCell>
                    <StyledTableCell>Role</StyledTableCell>
                    <StyledTableCell>Status</StyledTableCell>
                    <StyledTableCell align="right">Actions</StyledTableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visible.map(account => {
                    const status = statusOf(account)
                    const reason = lockedReason(account)
                    const isSelf = !canDeleteAccountOf(actor, account.id)
                    return (
                      <StyledTableRow key={account.id}>
                        <StyledTableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {account.username}
                            {isSelf && (
                              <Typography
                                component="span"
                                variant="body2"
                                color="text.secondary"
                              >
                                {' '}
                                (you)
                              </Typography>
                            )}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {account.email}
                          </Typography>
                        </StyledTableCell>
                        <StyledTableCell>
                          {account.venture?.name ?? '-'}
                        </StyledTableCell>
                        <StyledTableCell>
                          <RoleSelect
                            account={account}
                            disabledReason={reason}
                            onChange={role =>
                              setConfirming({ kind: 'role', account, role })
                            }
                          />
                        </StyledTableCell>
                        <StyledTableCell>
                          <StatusPill {...status} />
                        </StyledTableCell>
                        <StyledTableCell align="right">
                          {!account.deactivatedAt && (
                            <Button
                              variant="text"
                              color="error"
                              disabled={Boolean(
                                isSelf ||
                                (account.role === ROLES.ADMIN &&
                                  adminCount <= 1)
                              )}
                              onClick={() =>
                                setConfirming({ kind: 'deactivate', account })
                              }
                            >
                              Deactivate
                            </Button>
                          )}
                        </StyledTableCell>
                      </StyledTableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableCard>
          ) : (
            <SectionCard>
              <EmptyState
                icon={PeopleIcon}
                title="No matches"
                description="No accounts match this search and filter."
              />
            </SectionCard>
          )}
        </>
      )}

      {tab === 1 && <ActivityLog entries={entries} />}

      <AddAccountDialog
        open={adding}
        batches={batches}
        onClose={() => setAdding(false)}
        onCreated={account => {
          setNotice(`Added ${account.username} as ${roleLabel(account.role)}.`)
          revalidator.revalidate()
        }}
      />

      <Dialog
        open={Boolean(confirming)}
        onClose={() => !busy && setConfirming(null)}
        maxWidth="xs"
        fullWidth
      >
        {confirming?.kind === 'role' && (
          <>
            <DialogTitle>
              Make {confirming.account.username} {roleLabel(confirming.role)}?
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                {roleLabel(confirming.account.role)} →{' '}
                {roleLabel(confirming.role)}. {ROLE_SUMMARY[confirming.role]}.
                {confirming.account.role === ROLES.MENTOR &&
                  ' Their startups will need a new mentor.'}
              </DialogContentText>
            </DialogContent>
          </>
        )}
        {confirming?.kind === 'deactivate' && (
          <>
            <DialogTitle>Deactivate {confirming.account.username}?</DialogTitle>
            <DialogContent>
              <DialogContentText>
                They are signed out and can&apos;t sign in again. Their KPIs and
                reviews stay, but they leave their startup
                {confirming.account.role === ROLES.MENTOR &&
                  ' and the startups they mentor need a new mentor'}
                .
              </DialogContentText>
            </DialogContent>
          </>
        )}
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
            color={confirming?.kind === 'deactivate' ? 'error' : 'primary'}
            loading={busy}
            onClick={confirm}
          >
            {confirming?.kind === 'deactivate' ? 'Deactivate' : 'Change Role'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

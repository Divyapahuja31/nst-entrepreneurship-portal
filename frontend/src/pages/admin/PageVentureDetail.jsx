import { useState } from 'react'
import { useLoaderData, useRevalidator, useSearchParams } from 'react-router'
import { canManageVentures } from '@nst/shared/permissions.js'

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'

import CheckInsSection from '../../components/CheckInsSection'
import EmptyState from '../../components/EmptyState'
import KPIReview from '../../components/KPIReview'
import PageHeader from '../../components/PageHeader'
import SectionCard from '../../components/SectionCard'
import CustomizedTable from '../../components/Table'
import { PeopleIcon } from '../../components/icons'
import { normalizeWebsite } from '../../components/proposalFormConfig.js'
import { formatDate } from '../../components/kpiStatus'
import BiWeekly from './PageReportBiWeekly'
import { getMentors, setVentureMentors } from '../../api/venture'
import useAccess from '../../hooks/useAccess'

const founderColumns = [
  { key: 'username', label: 'Founder' },
  { key: 'email', label: 'Email' },
  { key: 'joinedAt', label: 'Joined' },
]
const pastFounderColumns = [...founderColumns, { key: 'leftAt', label: 'Left' }]

function Fact({ label, children }) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1">{children || '-'}</Typography>
    </Box>
  )
}

const mentorLabel = mentor => `${mentor.username} · ${mentor.email}`

// Who mentors the startup, and (for the board) a way to change them.
function MentorCard({ venture }) {
  const { actor } = useAccess()
  const revalidator = useRevalidator()
  const [open, setOpen] = useState(false)
  const [mentors, setMentors] = useState(null)
  const [choice, setChoice] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const assigned = venture.mentors ?? []

  const openDialog = async () => {
    setChoice(assigned)
    setError('')
    setOpen(true)
    const result = await getMentors()
    if (result.error) {
      setError(result.error)
      return
    }
    setMentors(result.mentors)
  }

  const save = async () => {
    setSaving(true)
    const result = await setVentureMentors(
      venture.id,
      choice.map(mentor => mentor.id)
    )
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setOpen(false)
    revalidator.revalidate()
  }

  return (
    <>
      <SectionCard
        title={assigned.length > 1 ? 'Mentors' : 'Mentor'}
        subtitle={
          assigned.length
            ? assigned.map(mentorLabel).join(', ')
            : 'No mentor yet. Only the academic board can review this startup until one is assigned.'
        }
        action={
          canManageVentures(actor) && (
            <Button variant="outlined" onClick={openDialog}>
              {assigned.length ? 'Change Mentors' : 'Assign Mentors'}
            </Button>
          )
        }
        sx={{ mb: { xs: 2, sm: 3 } }}
      />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Mentors for {venture.name}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Each mentor reviews this startup&apos;s KPIs and bi-weekly reports,
            and schedules check-ins on their own calendar. Taking a mentor off
            cancels their upcoming check-ins.
          </DialogContentText>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Autocomplete
            multiple
            options={mentors ?? []}
            value={choice}
            disabled={!mentors}
            onChange={(_, picked) => setChoice(picked)}
            getOptionLabel={mentorLabel}
            isOptionEqualToValue={(a, b) => String(a.id) === String(b.id)}
            renderInput={params => (
              <TextField
                {...params}
                label="Mentors"
                helperText="Leave empty for no mentor."
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            loading={saving}
            disabled={!mentors}
            onClick={save}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

const CHECK_INS_TAB = 3

export default function PageVentureDetail() {
  // Coming back from connecting Google Calendar lands on the check-ins.
  const [searchParams] = useSearchParams()
  const [tabIndex, setTabIndex] = useState(() =>
    searchParams.has('calendar') ? CHECK_INS_TAB : 0
  )
  const {
    venture,
    founders = [],
    pastFounders = [],
    biweekly,
    kpis = [],
    checkIns,
  } = useLoaderData()

  const toRow = founder => ({
    ...founder,
    joinedAt: formatDate(founder.joinedAt),
    leftAt: formatDate(founder.leftAt),
  })

  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
      <PageHeader
        breadcrumbs={[
          { label: 'Overview', to: '/admin' },
          { label: 'Startups', to: '/admin/venture' },
          { label: venture?.name || 'Startup' },
        ]}
        title={venture.name}
        subtitle={venture.description}
      />

      <SectionCard sx={{ mb: { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(6, minmax(0, 1fr))',
            },
          }}
        >
          <Fact label="Stage">{venture.stage}</Fact>
          <Fact label="Campus">{venture.campus}</Fact>
          <Fact label="Industry">{venture.industry}</Fact>
          <Fact label="Team">{founders.length}</Fact>
          <Fact label="Created">{formatDate(venture.createdAt)}</Fact>
          <Fact label="Website">
            {venture.website && (
              <Link
                href={normalizeWebsite(venture.website)}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ wordBreak: 'break-all' }}
              >
                {venture.website}
              </Link>
            )}
          </Fact>
        </Box>
      </SectionCard>

      <MentorCard venture={venture} />

      <Tabs
        value={tabIndex}
        onChange={(_, value) => setTabIndex(value)}
        aria-label="Startup sections"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={`Founders (${founders.length})`} />
        <Tab label={`KPIs (${kpis.length})`} />
        <Tab label="Bi-weekly" />
        <Tab label="Check-Ins" />
      </Tabs>

      {tabIndex === 0 && (
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: 'minmax(0, 1fr)',
          }}
        >
          {founders.length ? (
            <CustomizedTable
              columnNames={founderColumns}
              data={founders.map(toRow)}
              targetRoute="/admin/profile"
            />
          ) : (
            <SectionCard>
              <EmptyState
                icon={PeopleIcon}
                title="No active founders"
                description="Founders appear here when a proposal is approved or a join request is accepted."
              />
            </SectionCard>
          )}

          {pastFounders.length > 0 && (
            <Box>
              <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
                Past Founders
              </Typography>
              <CustomizedTable
                columnNames={pastFounderColumns}
                data={pastFounders.map(toRow)}
                targetRoute="/admin/profile"
              />
            </Box>
          )}
        </Box>
      )}

      {tabIndex === 1 && (
        <KPIReview kpis={kpis} venture={venture} founders={founders} />
      )}

      {tabIndex === 2 &&
        (biweekly ? (
          <BiWeekly data={biweekly} />
        ) : (
          <Alert severity="warning">
            Bi-weekly reports for this startup could not be loaded. Refresh the
            page to try again.
          </Alert>
        ))}

      {tabIndex === CHECK_INS_TAB && (
        <CheckInsSection checkIns={checkIns} venture={venture} />
      )}
    </Box>
  )
}

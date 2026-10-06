import { useState } from 'react'
import { useLoaderData, useRevalidator } from 'react-router'
import { canManageVentures } from '@nst/shared/permissions.js'

import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'

import EmptyState from '../../components/EmptyState'
import KPIReview from '../../components/KPIReview'
import PageHeader from '../../components/PageHeader'
import SectionCard from '../../components/SectionCard'
import CustomizedTable from '../../components/Table'
import { PeopleIcon } from '../../components/icons'
import { normalizeWebsite } from '../../components/proposalFormConfig.js'
import { formatDate } from '../../components/kpiStatus'
import BiWeekly from './PageReportBiWeekly'
import { getMentors, setVentureMentor } from '../../api/venture'
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

// Who mentors the startup, and (for the board) a way to change it.
function MentorCard({ venture }) {
  const { actor } = useAccess()
  const revalidator = useRevalidator()
  const [open, setOpen] = useState(false)
  const [mentors, setMentors] = useState(null)
  const [choice, setChoice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const mentor = venture.mentor

  const openDialog = async () => {
    setChoice(mentor?.id ?? '')
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
    const result = await setVentureMentor(venture.id, choice)
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
        title="Mentor"
        subtitle={
          mentor
            ? `${mentor.username} · ${mentor.email}`
            : 'No mentor yet. Only the academic board can review this startup until one is assigned.'
        }
        action={
          canManageVentures(actor) && (
            <Button variant="outlined" onClick={openDialog}>
              {mentor ? 'Change Mentor' : 'Assign Mentor'}
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
        <DialogTitle>Mentor for {venture.name}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            The mentor reviews this startup&apos;s KPIs and bi-weekly reports.
          </DialogContentText>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            select
            fullWidth
            label="Mentor"
            value={mentors ? choice : ''}
            disabled={!mentors}
            onChange={event => setChoice(event.target.value)}
          >
            <MenuItem value="">No mentor</MenuItem>
            {(mentors ?? []).map(option => (
              <MenuItem key={option.id} value={option.id}>
                {option.username} · {option.email}
              </MenuItem>
            ))}
          </TextField>
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

export default function PageVentureDetail() {
  const [tabIndex, setTabIndex] = useState(0)
  const {
    venture,
    founders = [],
    pastFounders = [],
    biweekly,
    kpis = [],
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
    </Box>
  )
}

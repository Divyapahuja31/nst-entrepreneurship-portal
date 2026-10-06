import React from 'react'
import { useLoaderData, useRevalidator } from 'react-router'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'

import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import SectionCard from '../../components/SectionCard'
import CustomizedTable from '../../components/Table'
import ReviewTable from '../../components/ReviewTable'
import ProposalDrawer from '../../components/ProposalDrawer'
import { reviewJoinRequest, reviewProposal } from '../../api/venture'
import useAccess from '../../hooks/useAccess'
import { mustPickMentorToAccept } from '@nst/shared/permissions.js'
import {
  BriefcaseIcon,
  LightbulbIcon,
  PersonAddIcon,
} from '../../components/icons'

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && children}
    </div>
  )
}

function Empty({ icon, title, description }) {
  return (
    <SectionCard>
      <EmptyState icon={icon} title={title} description={description} />
    </SectionCard>
  )
}

const ventureColumns = [
  { key: 'name', label: 'Startup' },
  { key: 'campus', label: 'Campus' },
  { key: 'stage', label: 'Stage' },
  { key: 'industry', label: 'Industry' },
  { key: 'founders', label: 'Founders' },
  { key: 'mentorName', label: 'Mentor' },
  { key: 'team', label: 'Team', align: 'right' },
]

const proposalColumns = [
  { key: 'startup', label: 'Startup' },
  { key: 'founder', label: 'Submitted by' },
  { key: 'campus', label: 'Campus' },
  { key: 'industry', label: 'Industry' },
  { key: 'stage', label: 'Stage' },
  { key: 'submitted', label: 'Submitted' },
]

const joinRequestColumns = [
  { key: 'founder', label: 'Student' },
  { key: 'venture', label: 'Startup' },
  { key: 'message', label: 'Message' },
  { key: 'submitted', label: 'Requested' },
]

// Name plus a note when the same student has another application pending:
// approving either one closes the other.
const studentCell = (name, otherApplication) => (
  <>
    {name || '-'}
    {otherApplication && (
      <Box
        component="span"
        sx={{ display: 'block', color: 'warning.main', fontSize: '0.8125rem' }}
      >
        {otherApplication}
      </Box>
    )}
  </>
)

const DAY_MS = 24 * 60 * 60 * 1000

// "Sep 25, 2026 · 6 days ago", so the longest-waiting items stand out.
const describeWait = value => {
  if (!value) return '-'
  const days = Math.floor((Date.now() - new Date(value).getTime()) / DAY_MS)
  const ago = days < 1 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`
  return `${formatDate(value)} · ${ago}`
}

const formatDate = value => {
  if (!value) return '-'

  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// The mentor choice in the approve dialog, when the board approves.
function MentorPicker({ mentors, value, onChange }) {
  if (!mentors.length) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        There are no mentor accounts yet. An admin can give someone the Mentor
        role from Accounts &amp; Roles.
      </Alert>
    )
  }
  return (
    <TextField
      select
      fullWidth
      label="Mentor"
      value={value}
      onChange={event => onChange(event.target.value)}
      helperText="The mentor reviews this startup's KPIs and reports."
      sx={{ mt: 2 }}
    >
      {mentors.map(mentor => (
        <MenuItem key={mentor.id} value={mentor.id}>
          {mentor.username} · {mentor.email}
        </MenuItem>
      ))}
    </TextField>
  )
}

export default function PageVentures() {
  const { ventures, proposals, joinRequests, mentors } = useLoaderData()
  const revalidator = useRevalidator()
  const { actor, isMentor } = useAccess()
  // The board picks the new startup's mentor; a mentor becomes it.
  const pickMentor = mustPickMentorToAccept(actor)
  const [mentorId, setMentorId] = React.useState('')

  const ventureRows = ventures.map(venture => ({
    ...venture,
    mentorName: venture.mentor?.username ?? 'Unassigned',
  }))

  const [tab, setTab] = React.useState(0)
  const [busyId, setBusyId] = React.useState(null)
  const [error, setError] = React.useState('')
  const [viewing, setViewing] = React.useState(null)
  const [rejecting, setRejecting] = React.useState(null)
  const [remarks, setRemarks] = React.useState('')
  // A decision waiting for confirmation: { title, body, confirmLabel, run }.
  const [confirming, setConfirming] = React.useState(null)
  const [notice, setNotice] = React.useState('')

  const proposalByStudent = new Map(
    proposals.map(p => [p.submittedBy?._id, p.startupName])
  )
  const joinRequestByStudent = new Map(
    joinRequests.map(r => [r.requestedBy?._id, r.venture?.name])
  )

  const proposalRows = proposals.map(proposal => ({
    id: proposal._id,
    proposal,
    startup: proposal.startupName,
    studentName: proposal.submittedBy?.username,
    otherApplication: joinRequestByStudent.get(proposal.submittedBy?._id),
    founder: studentCell(
      proposal.submittedBy?.username,
      joinRequestByStudent.has(proposal.submittedBy?._id) &&
        `Also asked to join ${joinRequestByStudent.get(proposal.submittedBy?._id)}`
    ),
    campus: proposal.campus?.name,
    industry: proposal.industry?.name || proposal.industryName,
    stage: proposal.stageLabel ?? proposal.stage,
    submitted: describeWait(proposal.createdAt),
  }))

  const joinRequestRows = joinRequests.map(request => ({
    id: request._id,
    studentName: request.requestedBy?.username,
    ventureName: request.venture?.name,
    otherApplication: proposalByStudent.get(request.requestedBy?._id),
    founder: studentCell(
      request.requestedBy?.username,
      proposalByStudent.has(request.requestedBy?._id) &&
        `Also proposed ${proposalByStudent.get(request.requestedBy?._id)}`
    ),
    venture: request.venture?.name,
    // Two lines at most; the full message is in the tooltip.
    message: request.message ? (
      <Box
        title={request.message}
        sx={{
          maxWidth: 420,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {request.message}
      </Box>
    ) : null,
    submitted: describeWait(request.createdAt),
  }))

  const runReview = async (review, successMessage) => {
    setError('')
    setNotice('')

    const result = await review()

    setBusyId(null)

    if (result.error) {
      setError(result.error)
      return
    }

    setNotice(successMessage)
    revalidator.revalidate()
  }

  // Approvals and join-request rejections can't be undone, so each asks first.
  const handleApproveProposal = row => {
    const proposalId = row.id ?? row._id
    const startup = row.startup ?? row.startupName
    const student = row.studentName ?? row.submittedBy?.username

    setViewing(null)
    setMentorId('')
    setConfirming({
      title: `Approve ${startup}?`,
      body: pickMentor
        ? `This creates the startup with ${student} as its founder. Choose who mentors it.`
        : `This creates the startup with ${student} as its founder, and you as its mentor.`,
      confirmLabel: 'Approve',
      needsMentor: pickMentor,
      run: chosenMentorId => {
        setBusyId(proposalId)
        runReview(
          () =>
            reviewProposal(proposalId, 'APPROVED', undefined, chosenMentorId),
          `Approved ${startup}.`
        )
      },
    })
  }

  const startRejectProposal = row => {
    setViewing(null)
    setRemarks('')
    setRejecting({
      id: row.id ?? row._id,
      startup: row.startup ?? row.startupName,
    })
  }

  const handleApproveJoinRequest = row => {
    const other = row.otherApplication
      ? ` Their pending proposal for ${row.otherApplication} will be closed.`
      : ''
    setConfirming({
      title: `Add ${row.studentName} to ${row.ventureName}?`,
      body: `${row.studentName} becomes a founder of ${row.ventureName}.${other}`,
      confirmLabel: 'Approve',
      run: () => {
        setBusyId(row.id)
        runReview(
          () => reviewJoinRequest(row.id, 'APPROVED'),
          `${row.studentName} joined ${row.ventureName}.`
        )
      },
    })
  }

  const handleRejectJoinRequest = row => {
    setConfirming({
      title: `Reject ${row.studentName}'s request?`,
      body: `${row.studentName} won't join ${row.ventureName}. This can't be undone.`,
      confirmLabel: 'Reject',
      run: () => {
        setBusyId(row.id)
        runReview(
          () => reviewJoinRequest(row.id, 'REJECTED'),
          `Rejected ${row.studentName}'s request to join ${row.ventureName}.`
        )
      },
    })
  }

  const handleConfirmRejectProposal = () => {
    const proposalId = rejecting.id

    setRejecting(null)
    setBusyId(proposalId)
    runReview(
      () => reviewProposal(proposalId, 'REJECTED', remarks),
      `Rejected ${rejecting.startup}.`
    )
  }

  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
      <PageHeader
        title={isMentor ? 'My Startups' : 'Startups'}
        subtitle={
          isMentor
            ? 'The startups you mentor, new proposals any mentor can take on, and requests to join your startups.'
            : 'Approved startups, and everything waiting on your decision.'
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(event, newValue) => setTab(newValue)}
        aria-label="Startup lists"
        variant="scrollable"
        scrollButtons={false}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={`Startups (${ventures.length})`} />
        <Tab label={`Proposals (${proposalRows.length})`} />
        <Tab label={`Join Requests (${joinRequestRows.length})`} />
      </Tabs>

      <TabPanel value={tab} index={0}>
        {ventures.length ? (
          <CustomizedTable
            columnNames={ventureColumns}
            data={ventureRows}
            targetRoute="/admin/venture"
          />
        ) : (
          <Empty
            icon={BriefcaseIcon}
            title="No startups yet"
            description={
              isMentor
                ? 'Startups appear here once one is assigned to you, or you approve a proposal.'
                : 'Startups appear here once you approve a proposal.'
            }
          />
        )}
      </TabPanel>

      <TabPanel value={tab} index={1}>
        {proposalRows.length ? (
          <ReviewTable
            actionsLabel="Actions"
            columns={proposalColumns}
            rows={proposalRows}
            busyId={busyId}
            onApprove={handleApproveProposal}
            onReject={startRejectProposal}
            onView={row => setViewing(row.proposal)}
          />
        ) : (
          <Empty
            icon={LightbulbIcon}
            title="No proposals to review"
            description="New startup proposals from students will appear here."
          />
        )}
      </TabPanel>

      <TabPanel value={tab} index={2}>
        {joinRequestRows.length ? (
          <ReviewTable
            actionsLabel="Actions"
            columns={joinRequestColumns}
            rows={joinRequestRows}
            busyId={busyId}
            onApprove={handleApproveJoinRequest}
            onReject={handleRejectJoinRequest}
          />
        ) : (
          <Empty
            icon={PersonAddIcon}
            title="No join requests"
            description="Requests from students to join an existing startup will appear here."
          />
        )}
      </TabPanel>

      <ProposalDrawer
        proposal={viewing}
        busy={Boolean(busyId)}
        onClose={() => setViewing(null)}
        onApprove={handleApproveProposal}
        onReject={startRejectProposal}
      />

      <Dialog
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reject {rejecting?.startup}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            These remarks are shown to the student when they revise and resubmit
            the proposal.
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={3}
            label="Remarks"
            value={remarks}
            onChange={event => setRemarks(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setRejecting(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmRejectProposal}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(confirming)}
        onClose={() => setConfirming(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{confirming?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirming?.body}</DialogContentText>
          {confirming?.needsMentor && (
            <MentorPicker
              mentors={mentors}
              value={mentorId}
              onChange={setMentorId}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setConfirming(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={confirming?.confirmLabel === 'Reject' ? 'error' : 'primary'}
            disabled={Boolean(confirming?.needsMentor && !mentorId)}
            onClick={() => {
              confirming.run(mentorId)
              setConfirming(null)
            }}
          >
            {confirming?.confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

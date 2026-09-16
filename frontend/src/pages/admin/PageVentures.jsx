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
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import CustomizedTable from '../../components/Table'
import ReviewTable from '../../components/ReviewTable'
import ProposalDrawer from '../../components/ProposalDrawer'
import { reviewJoinRequest, reviewProposal } from '../../api/venture'

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index} tabIndex={0}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

const ventureColumns = [
  'name',
  'campus',
  'stage',
  'industry',
  'founders',
  'team',
]

const proposalColumns = [
  { key: 'startup', label: 'startup' },
  { key: 'founder', label: 'submitted by' },
  { key: 'campus', label: 'campus' },
  { key: 'industry', label: 'industry' },
  { key: 'stage', label: 'stage' },
  { key: 'submitted', label: 'submitted' },
]

const joinRequestColumns = [
  { key: 'founder', label: 'student' },
  { key: 'venture', label: 'venture' },
  { key: 'message', label: 'message' },
  { key: 'submitted', label: 'requested' },
]

const formatDate = value => {
  if (!value) return '-'

  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function PageVentures() {
  const { ventures, proposals, joinRequests } = useLoaderData()
  const revalidator = useRevalidator()

  const [tab, setTab] = React.useState(0)
  const [selectedRows, setSelectedRows] = React.useState([])
  const [busyId, setBusyId] = React.useState(null)
  const [error, setError] = React.useState('')
  const [viewing, setViewing] = React.useState(null)
  const [rejecting, setRejecting] = React.useState(null)
  const [remarks, setRemarks] = React.useState('')

  const proposalRows = proposals.map(proposal => ({
    id: proposal._id,
    proposal,
    startup: proposal.startupName,
    founder: proposal.submittedBy?.username,
    campus: proposal.campus?.name,
    industry: proposal.industry?.name || proposal.industryName,
    stage: proposal.stage,
    submitted: formatDate(proposal.createdAt),
  }))

  const joinRequestRows = joinRequests.map(request => ({
    id: request._id,
    founder: request.requestedBy?.username,
    venture: request.venture?.name,
    message: request.message,
    submitted: formatDate(request.createdAt),
  }))

  const runReview = async review => {
    setError('')

    const result = await review()

    setBusyId(null)

    if (result.error) {
      setError(result.error)
      return
    }

    revalidator.revalidate()
  }

  const handleApproveProposal = row => {
    const proposalId = row.id ?? row._id

    setViewing(null)
    setBusyId(proposalId)
    runReview(() => reviewProposal(proposalId, 'APPROVED'))
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
    setBusyId(row.id)
    runReview(() => reviewJoinRequest(row.id, 'APPROVED'))
  }

  const handleRejectJoinRequest = row => {
    setBusyId(row.id)
    runReview(() => reviewJoinRequest(row.id, 'REJECTED'))
  }

  const handleConfirmRejectProposal = () => {
    const proposalId = rejecting.id

    setRejecting(null)
    setBusyId(proposalId)
    runReview(() => reviewProposal(proposalId, 'REJECTED', remarks))
  }

  return (
    <>
      <Typography variant="h4" gutterBottom>
        Ventures
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Approved ventures, and everything waiting on your decision.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3 }}>
        <Tabs
          value={tab}
          onChange={(event, newValue) => setTab(newValue)}
          aria-label="venture tabs"
        >
          <Tab label={`Ventures (${ventures.length})`} />
          <Tab label={`Pending proposals (${proposalRows.length})`} />
          <Tab label={`Join requests (${joinRequestRows.length})`} />
        </Tabs>
      </Box>

      <TabPanel value={tab} index={0}>
        {ventures.length ? (
          <CustomizedTable
            columnNames={ventureColumns}
            data={ventures}
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
            targetRoute="/admin/venture"
          />
        ) : (
          <Alert severity="info">No ventures have been approved yet.</Alert>
        )}
      </TabPanel>

      <TabPanel value={tab} index={1}>
        {proposalRows.length ? (
          <ReviewTable
            columns={proposalColumns}
            rows={proposalRows}
            busyId={busyId}
            onApprove={handleApproveProposal}
            onReject={startRejectProposal}
            onView={row => setViewing(row.proposal)}
          />
        ) : (
          <Alert severity="info">No proposals are waiting for approval.</Alert>
        )}
      </TabPanel>

      <TabPanel value={tab} index={2}>
        {joinRequestRows.length ? (
          <ReviewTable
            columns={joinRequestColumns}
            rows={joinRequestRows}
            busyId={busyId}
            onApprove={handleApproveJoinRequest}
            onReject={handleRejectJoinRequest}
          />
        ) : (
          <Alert severity="info">
            No join requests are waiting for approval.
          </Alert>
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
          <Button onClick={() => setRejecting(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmRejectProposal}>
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

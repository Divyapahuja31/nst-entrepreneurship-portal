import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { normalizeWebsite } from './proposalFormConfig.js'

const formatDate = value => {
  if (!value) return '-'

  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function Field({ label, value, isLink }) {
  const href = isLink && value?.trim() ? normalizeWebsite(value) : null

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1" sx={{ mt: 0.25 }}>
        {href ? (
          <Link href={href} target="_blank" rel="noopener noreferrer">
            {value}
          </Link>
        ) : (
          value || '-'
        )}
      </Typography>
    </Box>
  )
}

function Section({ title, children }) {
  return (
    <Box sx={{ mt: 3, '&:first-of-type': { mt: 1 } }}>
      <Typography variant="h6" component="h3">
        {title}
      </Typography>
      <Divider sx={{ my: 1.5 }} />
      {children}
    </Box>
  )
}

function ItemList({ items }) {
  if (!items?.length) return <Typography variant="body1">-</Typography>

  return (
    <List dense disablePadding>
      {items.map((item, index) => (
        <ListItem key={index} disableGutters>
          <ListItemText primary={`• ${item}`} />
        </ListItem>
      ))}
    </List>
  )
}

export default function ProposalDrawer({
  proposal,
  onClose,
  onApprove,
  onReject,
  busy,
}) {
  return (
    <Dialog
      open={Boolean(proposal)}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      slotProps={{ paper: { sx: { maxHeight: '90vh' } } }}
    >
      {proposal && (
        <>
          <DialogTitle>
            <Typography variant="h5" component="div">
              {proposal.startupName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Submitted by{' '}
              <strong>{proposal.submittedBy?.username || '-'}</strong> on{' '}
              {formatDate(proposal.createdAt)}
            </Typography>
          </DialogTitle>

          <DialogContent dividers>
            <Section title="The Idea">
              <Field label="Problem" value={proposal.description} />
              <Field label="Target customer" value={proposal.targetCustomer} />
              <Field
                label="Industry"
                value={proposal.industry?.name || proposal.industryName}
              />
              <Field label="Campus" value={proposal.campus?.name} />
            </Section>

            <Section title="Where It Stands">
              <Field
                label="Stage"
                value={proposal.stageLabel ?? proposal.stage}
              />
              <Field
                label="Current traction"
                value={proposal.currentTraction}
              />
              <Field label="Business model" value={proposal.businessModel} />
              <Field
                label="Achievements so far"
                value={proposal.achievementsTillNow}
              />
            </Section>

            <Section title="Assumptions & Risks">
              <Typography variant="body2" color="text.secondary">
                Assumptions
              </Typography>
              <Box sx={{ mb: 2, mt: 0.5 }}>
                <ItemList items={proposal.assumptions} />
              </Box>

              <Typography variant="body2" color="text.secondary">
                Risks
              </Typography>
              <Box sx={{ mb: 2, mt: 0.5 }}>
                <ItemList items={proposal.risks} />
              </Box>

              <Field label="Six-month goals" value={proposal.sixMonthGoals} />
            </Section>

            <Section title="Execution">
              <Field label="Tech stack" value={proposal.techStack} />
              <Field label="Capital status" value={proposal.capitalStatus} />
              <Field
                label="Weekly commitment"
                value={
                  proposal.weeklyHours ? `${proposal.weeklyHours} hours` : null
                }
              />
              <Field label="Website" value={proposal.website} isLink />
            </Section>
          </DialogContent>

          <DialogActions sx={{ justifyContent: 'space-between' }}>
            <Button onClick={onClose} disabled={busy} variant="text">
              Close
            </Button>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                color="error"
                disabled={busy}
                onClick={() => onReject(proposal)}
              >
                Reject
              </Button>
              <Button
                variant="contained"
                disabled={busy}
                onClick={() => onApprove(proposal)}
              >
                Approve
              </Button>
            </Box>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}

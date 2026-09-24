import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
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
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ mt: 0.5 }}>
        {href ? (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            color="primary"
          >
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
      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', letterSpacing: 0.5 }}>
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
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        },
      }}
    >
      {proposal && (
        <>
          <DialogTitle sx={{ m: 0, p: 3, pb: 2, position: 'relative' }}>
            <Typography variant="h5" component="div" sx={{ fontWeight: 700, pr: 4 }}>
              {proposal.startupName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Submitted by <strong>{proposal.submittedBy?.username || '-'}</strong> on{' '}
              {formatDate(proposal.createdAt)}
            </Typography>
            <IconButton
              aria-label="close"
              onClick={onClose}
              sx={{
                position: 'absolute',
                right: 16,
                top: 16,
                color: theme => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 3 }}>
            <Section title="The Idea">
              <Field label="PROBLEM" value={proposal.description} />
              <Field label="TARGET CUSTOMER" value={proposal.targetCustomer} />
              <Field
                label="INDUSTRY"
                value={proposal.industry?.name || proposal.industryName}
              />
              <Field label="CAMPUS" value={proposal.campus?.name} />
            </Section>

            <Section title="Where It Stands">
              <Field label="STAGE" value={proposal.stage} />
              <Field
                label="CURRENT TRACTION"
                value={proposal.currentTraction}
              />
              <Field label="BUSINESS MODEL" value={proposal.businessModel} />
              <Field
                label="ACHIEVEMENTS TILL NOW"
                value={proposal.achievementsTillNow}
              />
            </Section>

            <Section title="Assumptions & Risks">
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
                ASSUMPTIONS
              </Typography>
              <Box sx={{ mb: 2, mt: 0.5 }}>
                <ItemList items={proposal.assumptions} />
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
                RISKS
              </Typography>
              <Box sx={{ mb: 2, mt: 0.5 }}>
                <ItemList items={proposal.risks} />
              </Box>

              <Field label="SIX-MONTH GOALS" value={proposal.sixMonthGoals} />
            </Section>

            <Section title="Execution">
              <Field label="TECH STACK" value={proposal.techStack} />
              <Field label="CAPITAL STATUS" value={proposal.capitalStatus} />
              <Field
                label="WEEKLY COMMITMENT"
                value={
                  proposal.weeklyHours ? `${proposal.weeklyHours} hours` : null
                }
              />
              <Field label="WEBSITE" value={proposal.website} isLink />
            </Section>
          </DialogContent>

          <DialogActions sx={{ p: 2.5, px: 3, justifyContent: 'space-between' }}>
            <Button onClick={onClose} disabled={busy} variant="outlined" color="inherit">
              Close
            </Button>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                color="error"
                disabled={busy}
                startIcon={<CancelOutlinedIcon />}
                onClick={() => onReject(proposal)}
              >
                Reject
              </Button>
              <Button
                variant="contained"
                color="primary"
                disabled={busy}
                startIcon={<CheckCircleOutlinedIcon />}
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

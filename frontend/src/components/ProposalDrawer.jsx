import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

const formatDate = value => {
  if (!value) return '-'

  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function Field({ label, value }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1">{value || '-'}</Typography>
    </Box>
  )
}

function Section({ title, children }) {
  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      <Divider sx={{ mb: 2 }} />
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
          <ListItemText primary={item} />
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
    <Drawer anchor="right" open={Boolean(proposal)} onClose={onClose}>
      <Box sx={{ width: { xs: '100vw', sm: 480 }, p: 3 }}>
        {proposal && (
          <>
            <Typography variant="h5" gutterBottom>
              {proposal.startupName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Submitted by {proposal.submittedBy?.username || '-'} on{' '}
              {formatDate(proposal.createdAt)}
            </Typography>

            <Section title="The idea">
              <Field label="PROBLEM" value={proposal.description} />
              <Field label="TARGET CUSTOMER" value={proposal.targetCustomer} />
              <Field
                label="INDUSTRY"
                value={proposal.industry?.name || proposal.industryName}
              />
              <Field label="CAMPUS" value={proposal.campus?.name} />
            </Section>

            <Section title="Where it stands">
              <Field label="STAGE" value={proposal.stage} />
              <Field
                label="CURRENT TRACTION"
                value={proposal.currentTraction}
              />
              <Field label="BUSINESS MODEL" value={proposal.businessModel} />
            </Section>

            <Section title="Assumptions & risks">
              <Typography variant="caption" color="text.secondary">
                ASSUMPTIONS
              </Typography>
              <ItemList items={proposal.assumptions} />

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 2, display: 'block' }}
              >
                RISKS
              </Typography>
              <ItemList items={proposal.risks} />

              <Box sx={{ mt: 2 }}>
                <Field label="SIX-MONTH GOALS" value={proposal.sixMonthGoals} />
              </Box>
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
              <Field label="WEBSITE" value={proposal.website} />
            </Section>

            <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
              <Button
                variant="contained"
                disabled={busy}
                onClick={() => onApprove(proposal)}
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                disabled={busy}
                onClick={() => onReject(proposal)}
              >
                Reject
              </Button>
              <Button onClick={onClose} disabled={busy}>
                Close
              </Button>
            </Stack>
          </>
        )}
      </Box>
    </Drawer>
  )
}

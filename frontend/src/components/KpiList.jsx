import {
  Box,
  ButtonBase,
  Collapse,
  Divider,
  Link,
  Typography,
} from '@mui/material'

import StatusPill from './StatusPill'
import { ChevronRightIcon } from './icons'
import { formatDate, kpiStatus } from './kpiStatus'

// The KPI list used by founders (KPIs page) and admins (startup and founder
// pages): a row per KPI that expands into its details.

// Row of the details panel: label on the left, value on the right.
function Fact({ label, children }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 2,
        py: 1,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ textAlign: 'right' }}>
        {children}
      </Typography>
    </Box>
  )
}

function DetailGroup({ title, children }) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

export function KpiDetails({ kpi, footer, progressHint, showEvaluator }) {
  const hasEvidence = kpi.evidence?.fileName || kpi.evidence?.supportingText

  return (
    <Box
      sx={{
        mt: 1.5,
        p: { xs: 2, sm: 2.5 },
        borderRadius: '14px',
        bgcolor: 'background.default',
        display: 'grid',
        gap: 3,
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 7fr) minmax(0, 5fr)' },
      }}
    >
      <Box sx={{ display: 'grid', gap: 3, alignContent: 'start' }}>
        <DetailGroup title="Description">
          <Typography
            variant="body2"
            color={kpi.description ? 'text.primary' : 'text.secondary'}
            sx={{ whiteSpace: 'pre-line' }}
          >
            {kpi.description || 'No description yet.'}
          </Typography>
        </DetailGroup>

        <DetailGroup title="Sub-KPIs">
          {kpi.subKPIs?.length > 0 ? (
            <Box
              component="ol"
              sx={{ m: 0, pl: 2.5, display: 'grid', gap: 0.5 }}
            >
              {kpi.subKPIs.map((sub, i) => (
                <Typography key={sub._id || i} component="li" variant="body2">
                  {sub.name}
                </Typography>
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              This KPI isn&apos;t broken into smaller parts.
            </Typography>
          )}
        </DetailGroup>
      </Box>

      <Box sx={{ display: 'grid', gap: 3, alignContent: 'start' }}>
        <DetailGroup title="Progress">
          <Fact label="Achieved">
            {kpi.actualValue || (
              <Box component="span" sx={{ color: 'text.secondary' }}>
                Not recorded yet
              </Box>
            )}
          </Fact>
          {kpi.evidence?.fileName && (
            <>
              <Divider />
              <Fact label="Evidence">
                <Link href={`/api/kpis/${kpi._id}/evidence/download`} download>
                  {kpi.evidence.fileName}
                </Link>
              </Fact>
            </>
          )}
          {kpi.evidence?.supportingText && (
            <>
              <Divider />
              <Typography variant="body2" sx={{ pt: 1 }}>
                {kpi.evidence.supportingText}
              </Typography>
            </>
          )}
          {!hasEvidence && progressHint && kpi.status === 'ACCEPTED' && (
            <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
              {progressHint}
            </Typography>
          )}
        </DetailGroup>

        <DetailGroup title="Evaluation">
          <Fact label="Submitted">{formatDate(kpi.submissionDate)}</Fact>
          <Divider />
          <Fact label="Reviewed">{formatDate(kpi.evaluationDate)}</Fact>
          {showEvaluator && (
            <>
              <Divider />
              <Fact label="Reviewed by">
                {kpi.evaluatedBy?.username || kpi.evaluatedBy?.email || '-'}
              </Fact>
            </>
          )}
          <Divider />
          <Fact label="Score">
            {kpi.status === 'GRADED' && kpi.score != null ? (
              <Box component="strong" sx={{ fontWeight: 600 }}>
                {kpi.score} pts
              </Box>
            ) : (
              '-'
            )}
          </Fact>
          {kpi.feedback && (
            <>
              <Divider />
              <Typography variant="body2" sx={{ pt: 1 }}>
                {kpi.feedback}
              </Typography>
            </>
          )}
        </DetailGroup>
      </Box>

      {footer && (
        <Box
          sx={{
            gridColumn: '1 / -1',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          {footer}
        </Box>
      )}
    </Box>
  )
}

// Title, owner and due date on the left; status and the one action that
// applies on the right. Click the title to show `children` (the details).
export function KpiRow({ kpi, owner, expanded, onToggle, action, children }) {
  const status = kpiStatus(kpi.status)

  const detailsId = `kpi-details-${kpi._id}`

  return (
    <Box sx={{ py: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1.5, sm: 2 },
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
        }}
      >
        <ButtonBase
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={detailsId}
          sx={{
            flex: '1 1 260px',
            minWidth: 0,
            justifyContent: 'flex-start',
            gap: 1.5,
            textAlign: 'left',
            borderRadius: '12px',
            p: 1,
            m: -1,
            '&.Mui-focusVisible': { bgcolor: 'background.default' },
          }}
        >
          <ChevronRightIcon
            sx={{
              fontSize: 14,
              color: 'text.secondary',
              transform: expanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" component="h3" noWrap>
              {kpi.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {owner && <>{owner} · </>}
              {kpi.dueDate ? `Due ${formatDate(kpi.dueDate)}` : 'No due date'}
              {kpi.status === 'GRADED' && kpi.score != null && (
                <> · {kpi.score} pts</>
              )}
            </Typography>
          </Box>
        </ButtonBase>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            ml: { xs: 3.5, sm: 0 },
            flexShrink: { xs: 1, sm: 0 },
          }}
        >
          <StatusPill
            label={status.label}
            tint={status.tint}
            plain={status.plain}
          />
          {action}
        </Box>
      </Box>

      <Collapse in={expanded} timeout="auto" unmountOnExit id={detailsId}>
        {children}
      </Collapse>
    </Box>
  )
}

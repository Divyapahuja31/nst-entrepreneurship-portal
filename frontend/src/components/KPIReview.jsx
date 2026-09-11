import { useState, Fragment } from 'react'
import { useFetcher, useLoaderData, useNavigation } from 'react-router'
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  IconButton,
  Collapse,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Alert,
  Tooltip,
} from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import RateReviewIcon from '@mui/icons-material/RateReview'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import ScoreIcon from '@mui/icons-material/Score'
import EventNoteIcon from '@mui/icons-material/EventNote'
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt'

import KPIExpandedDetails from './KPIExpandedDetails'
import KPIEvaluateDialog from './KPIEvaluateDialog'

const STATUS_COLORS = {
  DRAFT: 'default',
  WAITING_FOR_APPROVAL: 'warning',
  ACCEPTED: 'info',
  GRADED: 'success',
  REJECTED: 'error',
}

const formatDate = dateStr => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '-'
  }
}

export default function KPIReview({ kpis: propKpis, founder, venture }) {
  const loaderData = useLoaderData()
  const navigation = useNavigation()
  const fetcher = useFetcher()

  const kpis = propKpis || loaderData?.kpis || []
  const loading = navigation.state === 'loading'
  const savingEval = fetcher.state !== 'idle'

  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const [evalDialogOpen, setEvalDialogOpen] = useState(false)
  const [selectedKpi, setSelectedKpi] = useState(null)
  const [defaultEvalStatus, setDefaultEvalStatus] = useState(null)

  const handleOpenEvaluate = (kpi, defaultStatus = null) => {
    setSelectedKpi(kpi)
    setDefaultEvalStatus(defaultStatus)
    setEvalDialogOpen(true)
  }

  const handleSaveEvaluation = ({ kpiId, status, score, feedback }) => {
    fetcher.submit(
      { intent: 'evaluateKPI', kpiId, status, score, feedback },
      { method: 'post', encType: 'application/json' }
    )
    setSuccessMsg(
      status === 'GRADED'
        ? `KPI graded successfully.`
        : `KPI status updated to ${status}.`
    )
    setEvalDialogOpen(false)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  const totalCount = kpis.length
  const pendingCount = kpis.filter(
    k => k.status === 'WAITING_FOR_APPROVAL'
  ).length
  const acceptedCount = kpis.filter(k => k.status === 'ACCEPTED').length
  const gradedCount = kpis.filter(k => k.status === 'GRADED').length

  const gradedKpisWithScores = kpis.filter(
    k => k.status === 'GRADED' && k.score > 0
  )
  const averageScore = gradedKpisWithScores.length
    ? Math.round(
        gradedKpisWithScores.reduce((acc, curr) => acc + (curr.score || 0), 0) /
          gradedKpisWithScores.length
      )
    : '-'

  const statCards = [
    {
      label: 'Total KPIs',
      val: totalCount,
      Icon: EventNoteIcon,
      color: 'primary',
    },
    {
      label: 'Awaiting Acceptance',
      val: pendingCount,
      Icon: PendingActionsIcon,
      color: 'warning',
    },
    {
      label: 'Accepted',
      val: acceptedCount,
      Icon: ThumbUpAltIcon,
      color: 'info',
    },
    {
      label: `Graded (${gradedCount})`,
      val: `Avg ${averageScore}`,
      Icon: ScoreIcon,
      color: 'success',
    },
  ]

  const displayError = errorMsg || fetcher.data?.error || ''

  return (
    <Box sx={{ width: '100%', py: 1 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            KPI Review & Grading Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Founder:{' '}
            <strong>{founder?.username || founder?.email || 'N/A'}</strong>
            {venture?.name ? ` | Venture: ${venture.name}` : ''}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map(stat => (
          <Grid item xs={12} sm={6} md={3} key={stat.label}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent
                sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}
              >
                <stat.Icon color={stat.color} sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {stat.label}
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: `${stat.color}.main` }}
                  >
                    {stat.val}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {successMsg && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          onClose={() => setSuccessMsg('')}
        >
          {successMsg}
        </Alert>
      )}

      {displayError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrorMsg('')}>
          {displayError}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 6 }}>
          <CircularProgress />
        </Box>
      ) : kpis.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}
        >
          <Typography variant="body1" color="text.secondary">
            No KPIs submitted or registered yet for this student.
          </Typography>
        </Paper>
      ) : (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          <Table aria-label="KPI Review Table">
            <TableHead sx={{ backgroundColor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 40 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>KPI Title</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Due Date
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Submission Date
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Status
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Score / Grade
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Graded Date
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  Teacher Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {kpis.map((kpi, idx) => {
                const isExpanded = expandedId === kpi._id
                return (
                  <Fragment key={kpi._id}>
                    <TableRow
                      hover
                      sx={{
                        '& > *': {
                          borderBottom: isExpanded ? 'unset' : undefined,
                        },
                      }}
                    >
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <Box
                          onClick={() =>
                            setExpandedId(prev =>
                              prev === kpi._id ? null : kpi._id
                            )
                          }
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            cursor: 'pointer',
                            fontWeight: 600,
                            '&:hover': { color: 'primary.main' },
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={e => {
                              e.stopPropagation()
                              setExpandedId(prev =>
                                prev === kpi._id ? null : kpi._id
                              )
                            }}
                          >
                            {isExpanded ? (
                              <KeyboardArrowUpIcon fontSize="small" />
                            ) : (
                              <KeyboardArrowDownIcon fontSize="small" />
                            )}
                          </IconButton>
                          {kpi.title}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {formatDate(kpi.dueDate)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {kpi.submissionDate ? (
                          <Chip
                            label={formatDate(kpi.submissionDate)}
                            size="small"
                            variant="outlined"
                            color="info"
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Not submitted
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={kpi.status}
                          size="small"
                          color={STATUS_COLORS[kpi.status] || 'default'}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color:
                              kpi.status === 'GRADED'
                                ? 'success.main'
                                : 'text.primary',
                          }}
                        >
                          {kpi.status === 'GRADED' &&
                          kpi.score !== undefined &&
                          kpi.score !== null
                            ? `${kpi.score} pts`
                            : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {kpi.evaluationDate ? (
                          <Chip
                            label={formatDate(kpi.evaluationDate)}
                            size="small"
                            variant="filled"
                            color="success"
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Pending
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          {kpi.status === 'WAITING_FOR_APPROVAL' && (
                            <>
                              <fetcher.Form
                                method="post"
                                style={{ display: 'inline' }}
                              >
                                <input
                                  type="hidden"
                                  name="intent"
                                  value="evaluateKPI"
                                />
                                <input
                                  type="hidden"
                                  name="kpiId"
                                  value={kpi._id}
                                />
                                <input
                                  type="hidden"
                                  name="status"
                                  value="ACCEPTED"
                                />
                                <input
                                  type="hidden"
                                  name="feedback"
                                  value={kpi.feedback || ''}
                                />
                                <Tooltip title="Accept KPI definition">
                                  <Button
                                    type="submit"
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    startIcon={<CheckCircleIcon />}
                                    disabled={savingEval}
                                    sx={{
                                      textTransform: 'none',
                                      fontWeight: 600,
                                      py: 0.5,
                                    }}
                                  >
                                    Accept
                                  </Button>
                                </Tooltip>
                              </fetcher.Form>
                              <Tooltip title="Reject KPI definition">
                                <Button
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  startIcon={<CancelIcon />}
                                  onClick={() =>
                                    handleOpenEvaluate(kpi, 'REJECTED')
                                  }
                                  disabled={savingEval}
                                  sx={{
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    py: 0.5,
                                  }}
                                >
                                  Reject
                                </Button>
                              </Tooltip>
                            </>
                          )}

                          {kpi.status === 'ACCEPTED' && (
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              startIcon={<RateReviewIcon fontSize="small" />}
                              onClick={() => handleOpenEvaluate(kpi, 'GRADED')}
                              sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                py: 0.5,
                              }}
                            >
                              Grade KPI
                            </Button>
                          )}

                          {kpi.status === 'GRADED' && (
                            <Button
                              variant="outlined"
                              color="primary"
                              size="small"
                              startIcon={<RateReviewIcon fontSize="small" />}
                              onClick={() => handleOpenEvaluate(kpi, 'GRADED')}
                              sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                py: 0.5,
                              }}
                            >
                              Update Grade
                            </Button>
                          )}

                          {kpi.status === 'REJECTED' && (
                            <Button
                              variant="outlined"
                              color="warning"
                              size="small"
                              startIcon={<RateReviewIcon fontSize="small" />}
                              onClick={() =>
                                handleOpenEvaluate(kpi, 'ACCEPTED')
                              }
                              sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                py: 0.5,
                              }}
                            >
                              Review / Accept
                            </Button>
                          )}

                          {kpi.status === 'DRAFT' && (
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<RateReviewIcon fontSize="small" />}
                              onClick={() => handleOpenEvaluate(kpi)}
                              sx={{
                                textTransform: 'none',
                                fontWeight: 600,
                                py: 0.5,
                              }}
                            >
                              Review
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell
                        style={{ paddingBottom: 0, paddingTop: 0 }}
                        colSpan={8}
                      >
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <KPIExpandedDetails kpi={kpi} />
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <KPIEvaluateDialog
        open={evalDialogOpen}
        onClose={() => setEvalDialogOpen(false)}
        kpi={selectedKpi}
        initialStatus={defaultEvalStatus}
        founder={founder}
        venture={venture}
        onSave={handleSaveEvaluation}
        saving={savingEval}
      />
    </Box>
  )
}

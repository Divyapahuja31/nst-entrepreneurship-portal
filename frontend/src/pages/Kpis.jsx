import { useState, Fragment } from 'react'
import {
  useLoaderData,
  useOutletContext,
  useParams,
  useFetcher,
  useNavigation,
} from 'react-router'
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Button,
  Box,
  CircularProgress,
  IconButton,
  Collapse,
  Chip,
  Tooltip,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SendIcon from '@mui/icons-material/Send'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'

import AddKpi from '../components/AddKpi'
import UploadEvidenceDialog from '../components/UploadEvidenceDialog'
import { uploadKPIEvidence, deleteKPIEvidence } from '../api/kpi'

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

export default function Kpis() {
  const loaderData = useLoaderData()
  const { ventureId: routeVentureId } = useParams()
  const userProfile = useOutletContext()
  const fetcher = useFetcher()
  const navigation = useNavigation()

  const ventureId =
    routeVentureId ||
    loaderData?.venture?._id ||
    userProfile?.ventureId ||
    userProfile?.venture?._id
  const kpis = loaderData?.data || []

  const [openAddKpi, setOpenAddKpi] = useState(false)
  const [editingKpi, setEditingKpi] = useState(null)
  const [expandedKpiId, setExpandedKpiId] = useState(null)
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false)
  const [selectedKpiForEvidence, setSelectedKpiForEvidence] = useState(null)

  const isLoading = navigation.state === 'loading' || fetcher.state !== 'idle'
  const actionError = fetcher.data?.error || loaderData?.error || ''
  const displayError = !ventureId
    ? 'No venture associated with your account.'
    : actionError

  const handleSaveKPI = async kpiData => {
    if (!ventureId) {
      alert('Cannot save KPI without a valid venture ID.')
      return
    }

    if (editingKpi) {
      fetcher.submit(
        {
          intent: 'updateKPI',
          kpiId: editingKpi._id,
          title: kpiData.title,
          description: kpiData.description,
          dueDate: kpiData.dueDate,
          status: kpiData.status,
          subKpis: kpiData.subKpis,
        },
        { method: 'post', encType: 'application/json' }
      )
    } else {
      fetcher.submit(
        {
          intent: 'createKPI',
          title: kpiData.title,
          description: kpiData.description,
          dueDate: kpiData.dueDate,
          venture: ventureId,
          status: kpiData.status,
          subKpis: kpiData.subKpis,
        },
        { method: 'post', encType: 'application/json' }
      )
    }

    setEditingKpi(null)
    setOpenAddKpi(false)
  }

  const handleSaveEvidence = async ({
    kpi,
    actualValue,
    supportingText,
    file,
    fileName,
  }) => {
    if (!kpi?._id) return
    try {
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        if (supportingText !== undefined) {
          formData.append('supportingText', supportingText)
        }
        if (actualValue !== undefined) {
          formData.append('actualValue', actualValue)
        }
        await uploadKPIEvidence(kpi._id, formData)
        fetcher.submit(
          { intent: 'revalidate' },
          { method: 'post', encType: 'application/json' }
        )
      } else {
        fetcher.submit(
          {
            intent: 'submitEvidence',
            kpiId: kpi._id,
            actualValue,
            supportingText,
            fileName: fileName || kpi.evidence?.fileName || '',
            fileUrl: kpi.evidence?.fileUrl || '',
          },
          { method: 'post', encType: 'application/json' }
        )
      }
    } catch (err) {
      console.error('Failed to save evidence:', err)
      alert(err.message || 'Failed to save evidence')
    }
    setEvidenceDialogOpen(false)
    setSelectedKpiForEvidence(null)
  }

  const handleDeleteEvidence = async ({ kpi }) => {
    if (!kpi?._id) return
    try {
      await deleteKPIEvidence(kpi._id)
      fetcher.submit(
        {
          intent: 'submitEvidence',
          kpiId: kpi._id,
          actualValue: kpi.actualValue || '',
          supportingText: '',
          fileName: '',
          fileUrl: '',
        },
        { method: 'post', encType: 'application/json' }
      )
    } catch (err) {
      console.error('Failed to delete evidence:', err)
      alert(err.message || 'Failed to delete evidence')
    }
    setEvidenceDialogOpen(false)
    setSelectedKpiForEvidence(null)
  }

  const handleEditClick = kpi => {
    setEditingKpi(kpi)
    setOpenAddKpi(true)
  }

  const toggleExpand = id => {
    setExpandedKpiId(prev => (prev === id ? null : id))
  }

  return (
    <>
      <Typography variant="h3">Manage KPIs</Typography>

      <Typography
        variant="body1"
        gutterBottom
        sx={{
          margin: '10px',
        }}
      >
        Evaluation & Performance Student Venture KPIs
      </Typography>

      <hr />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 3,
          marginBottom: 6,
          marginRight: 2,
        }}
      >
        <Button
          variant="contained"
          onClick={() => {
            setEditingKpi(null)
            setOpenAddKpi(true)
          }}
          sx={{
            fontSize: '15px',
            padding: '10px 20px',
          }}
        >
          + Add KPI
        </Button>
      </Box>

      {isLoading && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 5,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {displayError && (
        <Typography
          color="error"
          sx={{
            textAlign: 'center',
            marginTop: 3,
          }}
        >
          {displayError}
        </Typography>
      )}

      {!isLoading && !displayError && (
        <Table
          sx={{
            maxWidth: '95%',
            border: 1,
            margin: '0 auto',
          }}
          aria-label="KPI table"
        >
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f8fafc' }}>
              <TableCell sx={{ fontWeight: 700, width: 40 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>KPI</TableCell>
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
                Score
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">
                Evaluation Date
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">
                Action
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">
                Manage
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {kpis.map((kpi, index) => {
              const isExpanded = expandedKpiId === kpi._id
              return (
                <Fragment key={kpi._id}>
                  <TableRow
                    sx={{
                      '& > *': {
                        borderBottom: isExpanded ? 'unset' : undefined,
                      },
                    }}
                  >
                    <TableCell>{index + 1}</TableCell>

                    <TableCell>
                      <Box
                        onClick={() => toggleExpand(kpi._id)}
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
                            toggleExpand(kpi._id)
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
                            kpi.score > 0 ? 'success.main' : 'text.primary',
                        }}
                      >
                        {kpi.score !== undefined && kpi.score !== null
                          ? kpi.score
                          : '-'}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      {kpi.evaluationDate ? (
                        <Chip
                          label={formatDate(kpi.evaluationDate)}
                          size="small"
                          color="success"
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Pending
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      {kpi.status === 'ACCEPTED' || kpi.status === 'GRADED' ? (
                        <Button
                          variant={kpi.actualValue ? 'outlined' : 'contained'}
                          size="small"
                          color="primary"
                          onClick={() => {
                            setSelectedKpiForEvidence(kpi)
                            setEvidenceDialogOpen(true)
                          }}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 1,
                          }}
                        >
                          {kpi.actualValue
                            ? 'Update Progress'
                            : 'Upload Document'}
                        </Button>
                      ) : (
                        <Tooltip
                          title={
                            kpi.status === 'WAITING_FOR_APPROVAL'
                              ? 'Wait for mentor to approve this KPI before inputting numbers & evidence.'
                              : kpi.status === 'REJECTED'
                                ? 'KPI was rejected. Revise and resubmit.'
                                : 'Submit KPI for mentor approval first.'
                          }
                        >
                          <span>
                            <Button
                              variant="outlined"
                              size="small"
                              disabled
                              sx={{ textTransform: 'none', borderRadius: 1 }}
                            >
                              {kpi.status === 'WAITING_FOR_APPROVAL'
                                ? 'Awaiting Approval'
                                : kpi.status === 'REJECTED'
                                  ? 'Rejected'
                                  : 'Draft'}
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>

                    <TableCell align="center">
                      {(kpi.status === 'DRAFT' ||
                        kpi.status === 'REJECTED') && (
                        <fetcher.Form
                          method="post"
                          style={{ display: 'inline' }}
                        >
                          <input
                            type="hidden"
                            name="intent"
                            value="submitKPI"
                          />
                          <input type="hidden" name="kpiId" value={kpi._id} />
                          <Tooltip title="Submit for Mentor Approval">
                            <IconButton
                              type="submit"
                              size="small"
                              color="primary"
                            >
                              <SendIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </fetcher.Form>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => handleEditClick(kpi)}
                        title="Edit KPI"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <fetcher.Form
                        method="post"
                        style={{ display: 'inline' }}
                        onSubmit={e => {
                          if (!window.confirm('Delete this KPI?')) {
                            e.preventDefault()
                          }
                        }}
                      >
                        <input type="hidden" name="intent" value="deleteKPI" />
                        <input type="hidden" name="kpiId" value={kpi._id} />
                        <IconButton
                          type="submit"
                          size="small"
                          color="error"
                          title="Delete KPI"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </fetcher.Form>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell
                      style={{ paddingBottom: 0, paddingTop: 0 }}
                      colSpan={9}
                    >
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box
                          sx={{
                            p: 2.5,
                            m: 1.5,
                            border: '1px solid #e0e0e0',
                            borderRadius: 1.5,
                            backgroundColor: '#fafafa',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: 3,
                              flexWrap: 'wrap',
                            }}
                          >
                            <Box sx={{ flex: 1, minWidth: 260 }}>
                              <Typography
                                variant="subtitle2"
                                color="text.secondary"
                                sx={{ fontWeight: 600, mb: 0.75 }}
                              >
                                Description
                              </Typography>
                              <Box
                                sx={{
                                  p: 1.5,
                                  mb: 2.5,
                                  border: '1px solid #d0d0d0',
                                  borderRadius: 1,
                                  backgroundColor: '#ffffff',
                                  maxHeight: 110,
                                  minHeight: 60,
                                  overflowY: 'auto',
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  color={
                                    kpi.description
                                      ? 'text.primary'
                                      : 'text.secondary'
                                  }
                                  sx={{ whitespace: 'pre-line' }}
                                >
                                  {kpi.description ||
                                    'No description provided.'}
                                </Typography>
                              </Box>

                              <Typography
                                variant="subtitle2"
                                color="text.secondary"
                                sx={{ fontWeight: 600, mb: 0.75 }}
                              >
                                SubKPIs
                              </Typography>
                              {kpi.subKPIs?.length > 0 ? (
                                <TableContainer
                                  component={Paper}
                                  variant="outlined"
                                  sx={{ borderRadius: 1 }}
                                >
                                  <Table size="small">
                                    <TableHead
                                      sx={{ backgroundColor: '#f5f5f5' }}
                                    >
                                      <TableRow>
                                        <TableCell
                                          sx={{
                                            fontWeight: 600,
                                            width: 60,
                                            py: 1,
                                          }}
                                        >
                                          #
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>
                                          SubKPI Name
                                        </TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {kpi.subKPIs.map((sub, i) => (
                                        <TableRow
                                          key={sub._id || i}
                                          hover
                                          sx={{
                                            '&:last-child td, &:last-child th':
                                              { border: 0 },
                                          }}
                                        >
                                          <TableCell
                                            sx={{
                                              py: 1,
                                              color: 'text.secondary',
                                            }}
                                          >
                                            {i + 1}
                                          </TableCell>
                                          <TableCell
                                            sx={{ py: 1, fontWeight: 500 }}
                                          >
                                            {sub.name}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              ) : (
                                <Box
                                  sx={{
                                    p: 2,
                                    border: '1px solid #d0d0d0',
                                    borderRadius: 1,
                                    backgroundColor: '#ffffff',
                                    textAlign: 'center',
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    No sub-KPIs added.
                                  </Typography>
                                </Box>
                              )}

                              {kpi.evidence && (kpi.evidence.fileName || kpi.evidence.supportingText) && (
                                <Box sx={{ mt: 2.5 }}>
                                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.75 }}>
                                    Uploaded Evidence
                                  </Typography>
                                  <Box sx={{ p: 1.5, border: '1px solid #d0d0d0', borderRadius: 1, backgroundColor: '#ffffff' }}>
                                    {kpi.evidence.fileName && (
                                      <Typography variant="body2" sx={{ fontWeight: 500, mb: kpi.evidence.supportingText ? 0.5 : 0 }}>
                                        File: {kpi.evidence.fileUrl ? (
                                          <a href={kpi.evidence.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'none' }}>
                                            {kpi.evidence.fileName}
                                          </a>
                                        ) : kpi.evidence.fileName}
                                      </Typography>
                                    )}
                                    {kpi.evidence.supportingText && (
                                      <Typography variant="body2" color="text.secondary">
                                        Note: {kpi.evidence.supportingText}
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              )}
                            </Box>

                            <Box
                              sx={{
                                width: 260,
                                backgroundColor: '#ffffff',
                                p: 2,
                                border: '1px solid #d0d0d0',
                                borderRadius: 1.5,
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                color="text.secondary"
                                sx={{ fontWeight: 700, mb: 1 }}
                              >
                                Student Progress & Evidence
                              </Typography>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  mb: 0.5,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Achieved Number:
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    color: 'primary.main',
                                  }}
                                >
                                  {kpi.actualValue || 'Not yet recorded'}
                                </Typography>
                              </Box>
                              {kpi.evidence?.fileName && (
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    mb: 0.5,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Attached File:
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 600 }}
                                  >
                                    {kpi.evidence.fileUrl ? (
                                      <a
                                        href={kpi.evidence.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          color: '#1976d2',
                                          textDecoration: 'none',
                                        }}
                                      >
                                        {kpi.evidence.fileName}
                                      </a>
                                    ) : (
                                      kpi.evidence.fileName
                                    )}
                                  </Typography>
                                </Box>
                              )}
                              {kpi.evidence?.supportingText && (
                                <Box
                                  sx={{
                                    mt: 1,
                                    pt: 1,
                                    borderTop: '1px dashed #e0e0e0',
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontWeight: 600 }}
                                  >
                                    Supporting Notes:
                                  </Typography>
                                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    {kpi.evidence.supportingText}
                                  </Typography>
                                </Box>
                              )}
                            </Box>

                            {/* Evaluation Overview */}
                            <Box
                              sx={{
                                width: 260,
                                backgroundColor: '#ffffff',
                                p: 2,
                                border: '1px solid #d0d0d0',
                                borderRadius: 1.5,
                              }}
                            >
                              <Typography
                                variant="subtitle2"
                                color="text.secondary"
                                sx={{ fontWeight: 700, mb: 1 }}
                              >
                                Evaluation Overview
                              </Typography>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  mb: 0.5,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Submitted:
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {formatDate(kpi.submissionDate)}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  mb: 0.5,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Graded Date:
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 600 }}
                                >
                                  {formatDate(kpi.evaluationDate)}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  mb: 0.5,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Score:
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    color: 'success.main',
                                  }}
                                >
                                  {kpi.status === 'GRADED' &&
                                  kpi.score !== undefined &&
                                  kpi.score !== null
                                    ? `${kpi.score} pts`
                                    : '-'}
                                </Typography>
                              </Box>
                              {kpi.feedback && (
                                <Box
                                  sx={{
                                    mt: 1,
                                    pt: 1,
                                    borderTop: '1px dashed #e0e0e0',
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontWeight: 600 }}
                                  >
                                    Evaluator Feedback:
                                  </Typography>
                                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    {kpi.feedback}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              )
            })}

            {kpis.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No KPIs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <AddKpi
        key={editingKpi?._id || (openAddKpi ? 'open' : 'closed')}
        open={openAddKpi}
        onClose={() => {
          setOpenAddKpi(false)
          setEditingKpi(null)
        }}
        onSave={handleSaveKPI}
        initialData={editingKpi}
      />

      <UploadEvidenceDialog
        key={selectedKpiForEvidence?._id || (evidenceDialogOpen ? 'open' : 'closed')}
        open={evidenceDialogOpen}
        onClose={() => {
          setEvidenceDialogOpen(false)
          setSelectedKpiForEvidence(null)
        }}
        kpi={selectedKpiForEvidence}
        onSave={handleSaveEvidence}
        onDelete={handleDeleteEvidence}
      />
    </>
  )
}

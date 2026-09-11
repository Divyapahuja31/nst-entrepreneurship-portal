import { useEffect, useState, useCallback, Fragment } from 'react'
import { useOutletContext, useParams } from 'react-router'
import { Typography, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper, Button, Box, CircularProgress, IconButton, Collapse } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'

import AddKpi from '../components/AddKpi'
import UploadEvidenceDialog from '../components/UploadEvidenceDialog'
import { getVentureKPIs, createKPI, updateKPI, deleteKPI, createSubKPI, updateSubKPI, deleteSubKPI, submitKPIForApproval, uploadKPIEvidence, deleteKPIEvidence } from '../api/kpi'

export default function Kpis() {
  const { ventureId: routeVentureId } = useParams()
  const userProfile = useOutletContext()
  const ventureId = routeVentureId || userProfile?.ventureId || userProfile?.venture?._id

  const [openAddKpi, setOpenAddKpi] = useState(false)
  const [editingKpi, setEditingKpi] = useState(null)
  const [expandedKpiId, setExpandedKpiId] = useState(null)
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false)
  const [selectedKpiForEvidence, setSelectedKpiForEvidence] = useState(null)
  const [kpis, setKpis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchKPIs = useCallback(async () => {
    if (!ventureId) return

    try {
      const response = await getVentureKPIs(ventureId)
      setKpis(response.data || [])
      setError('')
    } catch (error) {
      console.error('Failed to fetch KPIs:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [ventureId])

  useEffect(() => {
    let isMounted = true

    if (!ventureId) return

    const loadKPIs = async () => {
      try {
        const response = await getVentureKPIs(ventureId)
        if (isMounted) {
          setKpis(response.data || [])
          setError('')
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch KPIs:', error)
          setError(error.message)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadKPIs()

    return () => {
      isMounted = false
    }
  }, [ventureId])

  const displayError = !ventureId ? 'No venture associated with your account.' : error
  const isLoading = ventureId ? loading : false

  const handleSaveKPI = async kpiData => {
    if (!ventureId) {
      throw new Error('Cannot save KPI without a valid venture ID.')
    }

    try {
      let targetKpiId
      if (editingKpi) {
        targetKpiId = editingKpi._id
        await updateKPI({
          kpiId: editingKpi._id,
          title: kpiData.title,
          description: kpiData.description,
          dueDate: kpiData.dueDate,
          status: kpiData.status,
        })
      } else {
        const kpiResponse = await createKPI({
          title: kpiData.title,
          description: kpiData.description,
          dueDate: kpiData.dueDate,
          venture: ventureId,
        })
        targetKpiId = kpiResponse.data._id
      }

      const currentFormSubIds = new Set(
        kpiData.subKpis.map(s => (s._id || s.id)?.toString()).filter(Boolean)
      )
      const oldSubKPIs = editingKpi?.subKPIs || []


      for (const oldSub of oldSubKPIs) {
        if (oldSub._id && !currentFormSubIds.has(oldSub._id.toString())) {
          await deleteSubKPI(oldSub._id)
        }
      }

      for (const subKPI of kpiData.subKpis) {
        const subId = subKPI._id || subKPI.id
        const isExisting = oldSubKPIs.some(
          s => s._id?.toString() === subId?.toString()
        )

        if (isExisting && subId) {
          await updateSubKPI({
            id: subId,
            name: subKPI.name,
            description: subKPI.name,
          })
        } else if (!isExisting) {
          await createSubKPI({
            kpiId: targetKpiId,
            name: subKPI.name,
            description: subKPI.name,
          })
        }
      }

      if (
        kpiData.status === 'SUBMIT' &&
        editingKpi?.status !== 'SUBMIT' &&
        editingKpi?.status !== 'WAITING_FOR_APPROVAL'
      ) {
        await submitKPIForApproval(targetKpiId)
      }

      setEditingKpi(null)
      await fetchKPIs()
    } catch (error) {
      console.error('Failed to save KPI:', error)
      throw error
    }
  }

  const handleDeleteKPI = async id => {
    if (!window.confirm('Delete this KPI?')) return
    try {
      await deleteKPI(id)
      await fetchKPIs()
    } catch (err) {
      alert(err.message)
    }
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
      <Typography variant="h3">
        Manage KPIs
      </Typography>

      <Typography
        variant="body1"
        gutterBottom
        sx={{
          margin: '10px',
        }}
      >
        Evaluation & Performance Student
        Venture KPIs
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
            <TableRow>
              <TableCell>
                #
              </TableCell>

              <TableCell>
                KPI
              </TableCell>

              <TableCell align="center">
                Score
              </TableCell>

              <TableCell align="center">
                Total
              </TableCell>

              <TableCell align="center">
                Action
              </TableCell>

              <TableCell align="center">
                Status
              </TableCell>

              <TableCell align="center">
                Manage
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {kpis.map((kpi, index) => {
              const isExpanded = expandedKpiId === kpi._id
              return (
                <Fragment key={kpi._id}>
                  <TableRow sx={{ '& > *': { borderBottom: isExpanded ? 'unset' : undefined } }}>
                    <TableCell>
                      {index + 1}
                    </TableCell>

                    <TableCell>
                      <Box
                        onClick={() => toggleExpand(kpi._id)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          cursor: 'pointer',
                          fontWeight: 500,
                          '&:hover': { color: 'primary.main' },
                        }}
                      >
                        <IconButton size="small" onClick={e => { e.stopPropagation(); toggleExpand(kpi._id) }}>
                          {isExpanded ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                        </IconButton>
                        {kpi.title}
                      </Box>
                    </TableCell>

                    <TableCell align="center">
                      -
                    </TableCell>

                    <TableCell align="center">
                      -
                    </TableCell>

                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setSelectedKpiForEvidence(kpi)
                          setEvidenceDialogOpen(true)
                        }}
                        sx={{ textTransform: 'none', fontWeight: 500, borderRadius: 1 }}
                      >
                        Upload Evidence
                      </Button>
                    </TableCell>

                    <TableCell align="center">
                      {kpi.status}
                    </TableCell>

                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handleEditClick(kpi)} title="Edit KPI">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteKPI(kpi._id)} title="Delete KPI">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2.5, m: 1.5, border: '1px solid #e0e0e0', borderRadius: 1.5, backgroundColor: '#fafafa' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 3 }}>

                            <Box sx={{ flex: 1 }}>
                              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.75 }}>
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
                                <Typography variant="body2" color={kpi.description ? 'text.primary' : 'text.secondary'} sx={{ whitespace: 'pre-line' }}>
                                  {kpi.description || 'No description provided.'}
                                </Typography>
                              </Box>

                              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.75 }}>
                                SubKPIs
                              </Typography>
                              {kpi.subKPIs?.length > 0 ? (
                                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                                  <Table size="small">
                                    <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                                      <TableRow>
                                        <TableCell sx={{ fontWeight: 600, width: 60, py: 1 }}>#</TableCell>
                                        <TableCell sx={{ fontWeight: 600, py: 1 }}>SubKPI Name</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {kpi.subKPIs.map((sub, i) => (
                                        <TableRow key={sub._id || i} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                          <TableCell sx={{ py: 1, color: 'text.secondary' }}>{i + 1}</TableCell>
                                          <TableCell sx={{ py: 1, fontWeight: 500 }}>{sub.name}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              ) : (
                                <Box sx={{ p: 2, border: '1px solid #d0d0d0', borderRadius: 1, backgroundColor: '#ffffff', textAlign: 'center' }}>
                                  <Typography variant="body2" color="text.secondary">
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

                            {kpi.dueDate && (
                              <Box sx={{ textAlign: 'right', minWidth: 120, pt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 600 }}>
                                  Due Date
                                </Typography>
                                <Typography variant="body2" fontWeight={600} color="primary.main">
                                  {new Date(kpi.dueDate).toLocaleDateString()}
                                </Typography>
                              </Box>
                            )}
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
                <TableCell
                  colSpan={7}
                  align="center"
                >
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
        onSave={async ({ kpi, file, supportingText }) => {
          if (!kpi?._id) return
          const formData = new FormData()
          if (file) {
            formData.append('file', file)
          }
          if (supportingText) {
            formData.append('supportingText', supportingText)
          }
          await uploadKPIEvidence(kpi._id, formData)
          await fetchKPIs()
        }}
        onDelete={async ({ kpi }) => {
          if (!kpi?._id) return
          await deleteKPIEvidence(kpi._id)
          await fetchKPIs()
        }}
      />
    </>
  )
}

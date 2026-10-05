import { useState, Fragment } from 'react'
import {
  useLoaderData,
  useParams,
  useNavigation,
  useRevalidator,
} from 'react-router'
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'

import AddKpi from '../../components/AddKpi'
import EmptyState from '../../components/EmptyState'
import SectionCard from '../../components/SectionCard'
import StatTile from '../../components/StatTile'
import StatusPill from '../../components/StatusPill'
import UploadEvidenceDialog from '../../components/UploadEvidenceDialog'
import {
  CheckCircleIcon,
  ChevronRightIcon,
  HourglassIcon,
  KpiIcon,
  LockIcon,
  PlusIcon,
  TargetIcon,
} from '../../components/icons'
import { useAuthStore } from '../../stores/auth'
import {
  createKPIWithSubKpis,
  deleteKPI,
  deleteKPIEvidence,
  submitKPIEvidence,
  submitKPIForApproval,
  updateKPIWithSubKpis,
  uploadKPIEvidence,
} from '../../api/kpi'

const STATUS_META = {
  DRAFT: { label: 'Draft', tint: 'gray', plain: true },
  WAITING_FOR_APPROVAL: { label: 'Awaiting Approval', tint: 'orange' },
  ACCEPTED: { label: 'Accepted', tint: 'blue' },
  GRADED: { label: 'Graded', tint: 'green' },
  REJECTED: { label: 'Rejected', tint: 'red' },
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

const idOf = ref => ref?._id || ref

// Why a KPI can't be changed any more, or null if it still can.
function lockReason(kpi) {
  if (kpi.status === 'GRADED') return 'Graded KPIs are locked.'
  if (kpi.dueDate && new Date(kpi.dueDate) < new Date()) {
    return 'The deadline has passed, so this KPI is closed.'
  }
  return null
}

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

function KpiDetails({ kpi, onEdit, onDelete }) {
  const locked = lockReason(kpi)
  const editable = !locked && kpi.status !== 'ACCEPTED'
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
          {!hasEvidence && kpi.status === 'ACCEPTED' && (
            <Typography variant="body2" color="text.secondary" sx={{ pt: 1 }}>
              Add a number and evidence when you have results.
            </Typography>
          )}
        </DetailGroup>

        <DetailGroup title="Evaluation">
          <Fact label="Submitted">{formatDate(kpi.submissionDate)}</Fact>
          <Divider />
          <Fact label="Reviewed">{formatDate(kpi.evaluationDate)}</Fact>
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

      {(editable || locked) && (
        <Box
          sx={{
            gridColumn: '1 / -1',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          {locked && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
            >
              <LockIcon sx={{ fontSize: 16 }} />
              {locked}
            </Typography>
          )}
          {editable && (
            <>
              <Button variant="outlined" onClick={onEdit}>
                Edit KPI
              </Button>
              <Button variant="outlined" color="error" onClick={onDelete}>
                Delete
              </Button>
            </>
          )}
        </Box>
      )}
    </Box>
  )
}

function KpiRow({
  kpi,
  currentUserId,
  expanded,
  onToggle,
  submitting,
  onSubmit,
  onProgress,
  onEdit,
  onDelete,
}) {
  const status = STATUS_META[kpi.status] || STATUS_META.DRAFT
  const locked = lockReason(kpi)
  const isMine = idOf(kpi.founder) === currentUserId
  const owner = !kpi.founder
    ? 'Entire startup'
    : isMine
      ? 'You'
      : kpi.founder.username || 'Member'

  let action = null
  if (!locked && (kpi.status === 'DRAFT' || kpi.status === 'REJECTED')) {
    action = (
      <Button variant="outlined" loading={submitting} onClick={onSubmit}>
        {kpi.status === 'REJECTED' ? 'Resubmit' : 'Submit for Approval'}
      </Button>
    )
  } else if (!locked && kpi.status === 'ACCEPTED') {
    action = (
      <Button variant="outlined" onClick={onProgress}>
        {kpi.actualValue ? 'Update Progress' : 'Add Progress'}
      </Button>
    )
  }

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
              {owner} ·{' '}
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
        <KpiDetails kpi={kpi} onEdit={onEdit} onDelete={onDelete} />
      </Collapse>
    </Box>
  )
}

export default function Kpis() {
  const loaderData = useLoaderData()
  const { ventureId: routeVentureId } = useParams()
  const userProfile = useAuthStore(state => state.user)
  const navigation = useNavigation()
  const revalidator = useRevalidator()

  const ventureId =
    routeVentureId ||
    loaderData?.venture?._id ||
    userProfile?.ventureId ||
    userProfile?.venture?._id
  const kpis = loaderData?.data || []
  // Personal KPIs are private to their owner, so students can only assign
  // one to themselves; the rest of the team sees startup KPIs.
  const members = (loaderData?.members || []).filter(
    member => String(member.id) === String(userProfile?._id ?? userProfile?.id)
  )

  const [tabIndex, setTabIndex] = useState(0)
  const [openAddKpi, setOpenAddKpi] = useState(false)
  const [editingKpi, setEditingKpi] = useState(null)
  const [expandedKpiId, setExpandedKpiId] = useState(null)
  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false)
  const [selectedKpiForEvidence, setSelectedKpiForEvidence] = useState(null)
  const [kpiToDelete, setKpiToDelete] = useState(null)
  const [pendingKpiId, setPendingKpiId] = useState(null)

  const currentUserId = userProfile?._id || userProfile?.id
  const myKpis = kpis.filter(k => idOf(k.founder) === currentUserId)
  const startupKpis = kpis.filter(k => !k.founder)
  const visibleKpis =
    tabIndex === 1 ? myKpis : tabIndex === 2 ? startupKpis : kpis

  const countOf = status => kpis.filter(k => k.status === status).length
  const graded = kpis.filter(k => k.status === 'GRADED' && k.score != null)
  const averageScore = graded.length
    ? Math.round(graded.reduce((sum, k) => sum + k.score, 0) / graded.length)
    : null

  const [busy, setBusy] = useState(false)
  const [actionErrorMsg, setActionErrorMsg] = useState('')

  const isLoading = navigation.state === 'loading'
  const actionError = actionErrorMsg || loaderData?.error || ''
  const noVenture = !ventureId

  // Runs an API operation, surfaces its error, and refreshes the loader data —
  // what the route action used to do via its intent switch.
  // Some API helpers return { error }, others throw — handle both so a failure
  // always surfaces instead of becoming an unhandled rejection.
  const run = async operation => {
    setBusy(true)
    setActionErrorMsg('')

    try {
      const result = await operation()

      if (result?.error) {
        setActionErrorMsg(result.error)
        return false
      }

      revalidator.revalidate()
      return true
    } catch (err) {
      setActionErrorMsg(err.message || 'Action failed')
      return false
    } finally {
      setBusy(false)
    }
  }

  const handleSaveKPI = async kpiData => {
    if (!ventureId) {
      setActionErrorMsg('You need to be part of a startup to save a KPI.')
      return
    }

    const payload = {
      title: kpiData.title,
      description: kpiData.description,
      dueDate: kpiData.dueDate,
      status: kpiData.status,
      founder: kpiData.founder || null,
      subKpis: kpiData.subKpis,
      venture: ventureId,
    }

    setEditingKpi(null)
    setOpenAddKpi(false)

    await run(() =>
      editingKpi
        ? updateKPIWithSubKpis({ ...payload, kpiId: editingKpi._id })
        : createKPIWithSubKpis(payload)
    )
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
        revalidator.revalidate()
      } else {
        await run(() =>
          submitKPIEvidence({
            kpiId: kpi._id,
            actualValue,
            supportingText,
            fileName: fileName || kpi.evidence?.fileName || '',
            fileUrl: kpi.evidence?.fileUrl || '',
          })
        )
      }
    } catch (err) {
      console.error('Failed to save evidence:', err)
      setActionErrorMsg(err.message || 'Failed to save evidence')
    }
    setEvidenceDialogOpen(false)
    setSelectedKpiForEvidence(null)
  }

  const handleDeleteEvidence = async ({ kpi }) => {
    if (!kpi?._id) return
    try {
      await deleteKPIEvidence(kpi._id)
      await run(() =>
        submitKPIEvidence({
          kpiId: kpi._id,
          actualValue: kpi.actualValue || '',
          supportingText: '',
          fileName: '',
          fileUrl: '',
        })
      )
    } catch (err) {
      console.error('Failed to delete evidence:', err)
      setActionErrorMsg(err.message || 'Failed to delete evidence')
    }
    setEvidenceDialogOpen(false)
    setSelectedKpiForEvidence(null)
  }

  const handleSubmit = async kpi => {
    setPendingKpiId(kpi._id)
    await run(() => submitKPIForApproval(kpi._id))
    setPendingKpiId(null)
  }

  const handleConfirmDelete = async () => {
    const ok = await run(() => deleteKPI(kpiToDelete._id))
    if (ok) setKpiToDelete(null)
  }

  const openNewKpi = () => {
    setEditingKpi(null)
    setOpenAddKpi(true)
  }

  const toggleExpand = id => {
    setExpandedKpiId(prev => (prev === id ? null : id))
  }

  const emptyCopy = {
    0: {
      title: 'No KPIs yet',
      description:
        'Add your first KPI. Once a mentor approves it, you can record progress against it.',
    },
    1: {
      title: 'No personal KPIs',
      description: 'KPIs you assign to yourself will show up here.',
    },
    2: {
      title: 'No startup KPIs',
      description: 'KPIs owned by the whole startup will show up here.',
    },
  }[tabIndex]

  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          mb: { xs: 4, sm: 5 },
        }}
      >
        <Box>
          <Typography
            variant="h2"
            component="h1"
            sx={{ fontSize: { xs: '2rem', sm: '2.5rem' }, mb: 1 }}
          >
            KPIs
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Set goals for your startup, get them approved, then record progress.
          </Typography>
        </Box>
        {!noVenture && (
          <Button
            variant="contained"
            startIcon={<PlusIcon />}
            onClick={openNewKpi}
          >
            Add KPI
          </Button>
        )}
      </Box>

      {noVenture && (
        <Alert severity="info">
          Join or create a startup to start setting KPIs.
        </Alert>
      )}

      {!noVenture && (
        <>
          {actionError && (
            <Alert
              severity="error"
              onClose={() => setActionErrorMsg('')}
              sx={{ mb: 3 }}
            >
              {actionError}
            </Alert>
          )}

          <Box
            sx={{
              display: 'grid',
              gap: { xs: 2, sm: 3 },
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
              },
              mb: { xs: 2, sm: 3 },
            }}
          >
            <StatTile
              icon={KpiIcon}
              tint="blue"
              label="Total"
              value={kpis.length}
              detail={`${myKpis.length} yours, ${startupKpis.length} startup-wide`}
            />
            <StatTile
              icon={HourglassIcon}
              tint="orange"
              label="Awaiting approval"
              value={countOf('WAITING_FOR_APPROVAL')}
              detail="Waiting on a mentor"
            />
            <StatTile
              icon={TargetIcon}
              tint="blue"
              label="In progress"
              value={countOf('ACCEPTED')}
              detail="Approved, ready for results"
            />
            <StatTile
              icon={CheckCircleIcon}
              tint="green"
              label="Graded"
              value={countOf('GRADED')}
              detail={
                averageScore != null
                  ? `Average ${averageScore} pts`
                  : 'No scores yet'
              }
            />
          </Box>

          <SectionCard
            title="Your KPIs"
            action={
              <Tabs
                value={tabIndex}
                onChange={(_, val) => setTabIndex(val)}
                aria-label="Filter KPIs"
                variant="scrollable"
                scrollButtons={false}
                sx={{
                  maxWidth: '100%',
                  '& .MuiTab-root': { minWidth: 0, px: { xs: 1.25, sm: 2 } },
                }}
              >
                <Tab label={`All (${kpis.length})`} />
                <Tab label={`Mine (${myKpis.length})`} />
                <Tab label={`Startup (${startupKpis.length})`} />
              </Tabs>
            }
          >
            {isLoading ? (
              <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
                <CircularProgress size={28} />
              </Box>
            ) : visibleKpis.length === 0 ? (
              <EmptyState
                icon={KpiIcon}
                title={emptyCopy.title}
                description={emptyCopy.description}
                action={
                  tabIndex === 0 && (
                    <Button variant="outlined" onClick={openNewKpi}>
                      Add KPI
                    </Button>
                  )
                }
              />
            ) : (
              visibleKpis.map((kpi, index) => (
                <Fragment key={kpi._id}>
                  {index > 0 && <Divider />}
                  <KpiRow
                    kpi={kpi}
                    currentUserId={currentUserId}
                    expanded={expandedKpiId === kpi._id}
                    onToggle={() => toggleExpand(kpi._id)}
                    submitting={pendingKpiId === kpi._id}
                    onSubmit={() => handleSubmit(kpi)}
                    onProgress={() => {
                      setSelectedKpiForEvidence(kpi)
                      setEvidenceDialogOpen(true)
                    }}
                    onEdit={() => {
                      setEditingKpi(kpi)
                      setOpenAddKpi(true)
                    }}
                    onDelete={() => setKpiToDelete(kpi)}
                  />
                </Fragment>
              ))
            )}
          </SectionCard>
        </>
      )}

      <Dialog
        open={Boolean(kpiToDelete)}
        onClose={() => !busy && setKpiToDelete(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete this KPI?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            “{kpiToDelete?.title}” and its sub-KPIs will be removed for your
            whole team. This can&apos;t be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            disabled={busy}
            onClick={() => setKpiToDelete(null)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            loading={busy}
            onClick={handleConfirmDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <AddKpi
        key={editingKpi?._id || (openAddKpi ? 'open' : 'closed')}
        open={openAddKpi}
        members={members}
        onClose={() => {
          setOpenAddKpi(false)
          setEditingKpi(null)
        }}
        onSave={handleSaveKPI}
        initialData={editingKpi}
      />

      <UploadEvidenceDialog
        key={
          selectedKpiForEvidence?._id ||
          (evidenceDialogOpen ? 'open' : 'closed')
        }
        open={evidenceDialogOpen}
        onClose={() => {
          setEvidenceDialogOpen(false)
          setSelectedKpiForEvidence(null)
        }}
        kpi={selectedKpiForEvidence}
        onSave={handleSaveEvidence}
        onDelete={handleDeleteEvidence}
      />
    </Box>
  )
}

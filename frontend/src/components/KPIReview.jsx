import { useState, Fragment } from 'react'
import { useLoaderData, useNavigation, useRevalidator } from 'react-router'

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  MenuItem,
  Tab,
  Tabs,
  TextField,
} from '@mui/material'

import { canAddKpi, canEvaluateKpi } from '@nst/shared/permissions.js'

import {
  createKPIWithSubKpis,
  evaluateKPI,
  lockKPI,
  unlockKPI,
} from '../api/kpi'
import useAccess from '../hooks/useAccess'
import KpiLockAction from './KpiLockAction'
import { mentorIdOf, staffKpiContext } from './kpiAccess'
import AddKpi from './AddKpi'
import EmptyState from './EmptyState'
import KPIEvaluateDialog from './KPIEvaluateDialog'
import { KpiDetails, KpiRow } from './KpiList'
import SectionCard from './SectionCard'
import StatTile from './StatTile'
import {
  CheckCircleIcon,
  HourglassIcon,
  KpiIcon,
  PlusIcon,
  TargetIcon,
} from './icons'

// The review step a staff member takes next on a KPI, by its status.
function ReviewAction({ kpi, busy, approving, onApprove, onOpen }) {
  switch (kpi.status) {
    case 'WAITING_FOR_APPROVAL':
      return (
        <>
          <Button
            variant="outlined"
            color="success"
            loading={approving}
            disabled={busy && !approving}
            onClick={onApprove}
          >
            Approve
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={busy}
            onClick={() => onOpen('REJECTED')}
          >
            Reject
          </Button>
        </>
      )
    case 'ACCEPTED':
      return (
        <Button variant="outlined" onClick={() => onOpen('GRADED')}>
          Grade
        </Button>
      )
    case 'GRADED':
      return (
        <Button variant="text" onClick={() => onOpen('GRADED')}>
          Update Grade
        </Button>
      )
    case 'REJECTED':
      return (
        <Button variant="outlined" onClick={() => onOpen('ACCEPTED')}>
          Review
        </Button>
      )
    default:
      return null
  }
}

export default function KPIReview({
  kpis: propKpis,
  founder,
  venture,
  founders = [],
}) {
  const loaderData = useLoaderData()
  const navigation = useNavigation()
  const revalidator = useRevalidator()

  const kpis = propKpis || loaderData?.kpis || []
  const loading = navigation.state === 'loading'
  const [savingEval, setSavingEval] = useState(false)
  const [lockingId, setLockingId] = useState(null)

  // Who may review, lock or add KPIs depends on whether the startup is
  // assigned to this mentor (the board may always).
  const { actor } = useAccess()
  const contextOf = kpi => staffKpiContext(kpi, venture?.mentor)
  const mayAddKpi = canAddKpi(actor, {
    ventureMentorId: mentorIdOf(venture?.mentor),
    isMember: false,
    founderId: null,
  })

  const members = (
    founders.length > 0
      ? founders
      : founder
        ? [founder]
        : loaderData?.founders || []
  ).map(f => ({
    id: f.user?._id || f._id || f.id,
    username: f.username || f.user?.username || 'Member',
    email: f.email || f.user?.email || '',
  }))

  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const [tabIndex, setTabIndex] = useState(0)
  const [selectedMemberId, setSelectedMemberId] = useState('')

  const currentFounderId =
    founder?._id || founder?.id || founder?.user?._id || founder?.user || null

  const allMembersMap = new Map()
  members.forEach(m => allMembersMap.set(String(m.id), m))
  kpis.forEach(k => {
    if (k.founder) {
      const fid = String(k.founder._id || k.founder)
      if (!allMembersMap.has(fid)) {
        allMembersMap.set(fid, {
          id: fid,
          username: k.founder.username || 'Member',
          email: k.founder.email || '',
        })
      }
    }
  })
  const availableMembers = Array.from(allMembersMap.values())

  const allCount = kpis.length
  const startupKpisCount = kpis.filter(k => !k.founder).length
  const founderKpisCount = founder
    ? kpis.filter(
        k =>
          k.founder &&
          String(k.founder._id || k.founder) === String(currentFounderId)
      ).length
    : kpis.filter(k => Boolean(k.founder)).length

  const filteredKpis = kpis.filter(kpi => {
    const kpiFounderId = kpi.founder?._id || kpi.founder
    if (founder) {
      if (tabIndex === 1) {
        return kpiFounderId && String(kpiFounderId) === String(currentFounderId)
      }
      if (tabIndex === 2) {
        return !kpi.founder
      }
      return true
    }

    if (tabIndex === 1) {
      return !kpi.founder
    }
    if (tabIndex === 2) {
      if (!kpi.founder) return false
      if (selectedMemberId) {
        return String(kpiFounderId) === String(selectedMemberId)
      }
      return true
    }
    return true
  })

  const [evalDialogOpen, setEvalDialogOpen] = useState(false)
  const [selectedKpi, setSelectedKpi] = useState(null)
  const [defaultEvalStatus, setDefaultEvalStatus] = useState(null)
  const [addKpiOpen, setAddKpiOpen] = useState(false)

  const handleCreateKpi = async payload => {
    try {
      const ventureId = venture?.id || venture?._id
      const assignedFounder =
        payload.founder !== undefined
          ? payload.founder
          : founder?._id || founder?.id || null

      const res = await createKPIWithSubKpis({
        ...payload,
        venture: ventureId,
        founder: assignedFounder,
      })
      if (res?.error) {
        throw new Error(res.error)
      }
      setSuccessMsg('KPI created successfully.')
      revalidator.revalidate()
    } catch (err) {
      setErrorMsg(err.message || 'Could not create KPI')
    }
  }

  const handleOpenEvaluate = (kpi, defaultStatus = null) => {
    setSelectedKpi(kpi)
    setDefaultEvalStatus(defaultStatus)
    setEvalDialogOpen(true)
  }

  const handleSaveEvaluation = async ({ kpiId, status, score, feedback }) => {
    setSavingEval(true)
    setErrorMsg('')
    setEvalDialogOpen(false)

    try {
      await evaluateKPI({ kpiId, score, status, feedback })
    } catch (err) {
      setSavingEval(false)
      setErrorMsg(err.message || 'Failed to evaluate KPI')
      return
    }

    setSavingEval(false)

    setSuccessMsg(
      {
        ACCEPTED: 'KPI approved.',
        REJECTED: 'KPI rejected.',
        GRADED: 'KPI graded.',
      }[status] || 'KPI updated.'
    )
    revalidator.revalidate()
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  const setLock = async (kpi, locked) => {
    setLockingId(kpi._id)
    setErrorMsg('')
    try {
      await (locked ? lockKPI(kpi._id) : unlockKPI(kpi._id))
      setSuccessMsg(
        locked
          ? 'KPI locked. Its grade is final.'
          : 'KPI unlocked. Its mentor can change the grade again.'
      )
      revalidator.revalidate()
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setLockingId(null)
    }
  }

  const totalCount = filteredKpis.length
  const [approvingId, setApprovingId] = useState(null)
  const approve = async kpi => {
    setApprovingId(kpi._id)
    await handleSaveEvaluation({
      kpiId: kpi._id,
      status: 'ACCEPTED',
      feedback: kpi.feedback || '',
    })
    setApprovingId(null)
  }

  const countOf = status => filteredKpis.filter(k => k.status === status).length
  const graded = filteredKpis.filter(
    k => k.status === 'GRADED' && typeof k.score === 'number'
  )
  const averageScore = graded.length
    ? Math.round(graded.reduce((sum, k) => sum + k.score, 0) / graded.length)
    : null

  const tabs = founder
    ? [
        `All (${allCount})`,
        `${founder.username?.split(' ')[0] || 'Founder'}'s (${founderKpisCount})`,
        `Startup (${startupKpisCount})`,
      ]
    : [
        `All (${allCount})`,
        `Startup (${startupKpisCount})`,
        `Members (${founderKpisCount})`,
      ]

  const emptyDescription =
    kpis.length === 0
      ? founder
        ? `${founder.username || 'This founder'} hasn't set any KPIs yet.`
        : "This startup hasn't set any KPIs yet."
      : 'No KPIs match this filter.'

  const ownerOf = kpi =>
    kpi.founder?.username || (kpi.founder ? 'Member' : 'Entire startup')

  return (
    <Box>
      {successMsg && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setSuccessMsg('')}
        >
          {successMsg}
        </Alert>
      )}
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMsg('')}>
          {errorMsg}
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
        <StatTile icon={KpiIcon} label="Total" value={totalCount} />
        <StatTile
          icon={HourglassIcon}
          tint="orange"
          label="Awaiting approval"
          value={countOf('WAITING_FOR_APPROVAL')}
        />
        <StatTile
          icon={TargetIcon}
          label="To grade"
          value={countOf('ACCEPTED')}
        />
        <StatTile
          icon={CheckCircleIcon}
          tint="green"
          label="Graded"
          value={countOf('GRADED')}
          detail={averageScore != null ? `Average ${averageScore} pts` : null}
        />
      </Box>

      <SectionCard
        title="KPIs"
        action={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexWrap: 'wrap',
              justifyContent: { xs: 'space-between', sm: 'flex-end' },
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            <Tabs
              value={tabIndex}
              onChange={(_, value) => {
                setTabIndex(value)
                setSelectedMemberId('')
              }}
              aria-label="Filter KPIs"
              variant="scrollable"
              scrollButtons={false}
              sx={{
                maxWidth: '100%',
                '& .MuiTab-root': { minWidth: 0, px: { xs: 1.25, sm: 2 } },
              }}
            >
              {tabs.map(label => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>
            {venture && mayAddKpi && (
              <Button
                variant="contained"
                startIcon={<PlusIcon />}
                onClick={() => setAddKpiOpen(true)}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Add KPI
              </Button>
            )}
          </Box>
        }
      >
        {!founder && tabIndex === 2 && availableMembers.length > 1 && (
          <TextField
            select
            label="Member"
            size="small"
            value={selectedMemberId}
            onChange={event => setSelectedMemberId(event.target.value)}
            sx={{ mb: 2, minWidth: 220 }}
          >
            <MenuItem value="">All members</MenuItem>
            {availableMembers.map(member => (
              <MenuItem key={member.id} value={String(member.id)}>
                {member.username}
              </MenuItem>
            ))}
          </TextField>
        )}

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : filteredKpis.length === 0 ? (
          <EmptyState
            icon={KpiIcon}
            title="No KPIs"
            description={emptyDescription}
          />
        ) : (
          filteredKpis.map((kpi, index) => (
            <Fragment key={kpi._id}>
              {index > 0 && <Divider />}
              <KpiRow
                kpi={kpi}
                owner={ownerOf(kpi)}
                expanded={expandedId === kpi._id}
                onToggle={() =>
                  setExpandedId(prev => (prev === kpi._id ? null : kpi._id))
                }
                action={
                  <>
                    {canEvaluateKpi(actor, contextOf(kpi)) && (
                      <ReviewAction
                        kpi={kpi}
                        busy={savingEval}
                        approving={approvingId === kpi._id}
                        onApprove={() => approve(kpi)}
                        onOpen={status => handleOpenEvaluate(kpi, status)}
                      />
                    )}
                    <KpiLockAction
                      actor={actor}
                      ctx={contextOf(kpi)}
                      busy={lockingId === kpi._id}
                      onLock={() => setLock(kpi, true)}
                      onUnlock={() => setLock(kpi, false)}
                    />
                  </>
                }
              >
                <KpiDetails kpi={kpi} showEvaluator />
              </KpiRow>
            </Fragment>
          ))
        )}
      </SectionCard>

      <KPIEvaluateDialog
        open={evalDialogOpen}
        onClose={() => setEvalDialogOpen(false)}
        kpi={selectedKpi}
        initialStatus={defaultEvalStatus}
        founder={founder || selectedKpi?.founder}
        venture={venture || selectedKpi?.venture}
        onSave={handleSaveEvaluation}
        saving={savingEval}
      />

      <AddKpi
        open={addKpiOpen}
        members={members}
        onClose={() => setAddKpiOpen(false)}
        onSave={handleCreateKpi}
      />
    </Box>
  )
}

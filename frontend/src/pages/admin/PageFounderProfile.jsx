import * as React from 'react'
import { Link as RouterLink, useLoaderData, useParams } from 'react-router'

import { Alert, Box, Link, Tab, Tabs } from '@mui/material'

import CheckInsSection from '../../components/CheckInsSection'
import KPIReview from '../../components/KPIReview'
import PageHeader from '../../components/PageHeader'
import useAccess from '../../hooks/useAccess'
import BiWeekly from './PageReportBiWeekly'

const breadcrumbs = name => [
  { label: 'Overview', to: '/admin' },
  { label: 'Founders', to: '/admin/founders' },
  { label: name || 'Founder' },
]

export default function PageFounderProfile() {
  const [tab, setTab] = React.useState(0)
  const biweeklyData = useLoaderData()
  const params = useParams()
  const { isStaff } = useAccess()

  if (!isStaff) {
    return <BiWeekly data={biweeklyData} />
  }

  const founder = biweeklyData?.founder
  const venture = biweeklyData?.venture

  // A wrong or stale link: say so rather than show an empty KPI dashboard
  // whose Add KPI button belongs to nobody.
  if (!founder) {
    return (
      <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
        <PageHeader breadcrumbs={breadcrumbs()} title="Founder not found" />
        <Alert severity="warning">
          No founder was found for this link. Pick someone from{' '}
          <Link component={RouterLink} to="/admin/founders">
            Founders
          </Link>
          .
        </Alert>
      </Box>
    )
  }

  const founderId = params?.userid || founder._id

  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
      <PageHeader
        breadcrumbs={breadcrumbs(founder.username)}
        title={founder.username}
        subtitle={
          <>
            {founder.email} ·{' '}
            {venture ? (
              <Link component={RouterLink} to={`/admin/venture/${venture._id}`}>
                {venture.name}
              </Link>
            ) : (
              'Not in a startup right now'
            )}
          </>
        }
      />

      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        aria-label="Founder sections"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="KPIs" />
        <Tab label="Bi-weekly" />
        <Tab label="Check-Ins" />
      </Tabs>

      {tab === 0 && (
        <KPIReview
          kpis={biweeklyData?.kpis}
          founderId={founderId}
          founder={founder}
          venture={venture}
          founders={[founder, ...(biweeklyData?.coFounders || [])]}
        />
      )}
      {tab === 1 && <BiWeekly data={biweeklyData} />}
      {tab === 2 && (
        <CheckInsSection checkIns={biweeklyData?.checkIns} showVenture />
      )}
    </Box>
  )
}

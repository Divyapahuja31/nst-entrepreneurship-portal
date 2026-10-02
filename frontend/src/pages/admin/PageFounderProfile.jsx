import * as React from 'react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { Link as RouterLink, useLoaderData, useParams } from 'react-router'

import { useAuthStore } from '../../stores/auth'

import BiWeekly from './PageReportBiWeekly'
import KPIReview from '../../components/KPIReview'

function CustomTabPanel(props) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      tabIndex={0}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

// Overview / Founders / <name>, plus who this is and which startup they're in.
function ProfileHeader({ founder, venture }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <Link
          component={RouterLink}
          underline="hover"
          color="inherit"
          to="/admin"
        >
          Overview
        </Link>
        <Link
          component={RouterLink}
          underline="hover"
          color="inherit"
          to="/admin/founders"
        >
          Founders
        </Link>
        <Typography color="text.primary">
          {founder?.username || 'Founder'}
        </Typography>
      </Breadcrumbs>

      {founder && (
        <>
          <Typography variant="h4">{founder.username}</Typography>
          <Typography variant="body1" color="text.secondary">
            {founder.email} ·{' '}
            {venture ? (
              <Link component={RouterLink} to={`/admin/venture/${venture._id}`}>
                {venture.name}
              </Link>
            ) : (
              'Not in a startup right now'
            )}
          </Typography>
        </>
      )}
    </Box>
  )
}

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  }
}

export default function BasicTabs() {
  const [value, setValue] = React.useState(0)
  const biweeklyData = useLoaderData()
  const currentUser = useAuthStore(state => state.user)
  const params = useParams()

  const roleName = currentUser?.role?.name?.toLowerCase()
  const isEvaluator = ['admin'].includes(roleName)

  const handleChange = (event, newValue) => {
    setValue(newValue)
  }

  if (!isEvaluator) {
    return (
      <Box sx={{ width: '100%' }}>
        <BiWeekly data={biweeklyData} />
      </Box>
    )
  }

  // A wrong or stale link: say so rather than show an empty KPI dashboard
  // whose Add KPI button belongs to nobody.
  if (!biweeklyData?.founder) {
    return (
      <Box sx={{ width: '100%' }}>
        <ProfileHeader />
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

  const founderId = params?.userid || biweeklyData?.founder?._id

  return (
    <Box sx={{ width: '100%' }}>
      <ProfileHeader
        founder={biweeklyData.founder}
        venture={biweeklyData.venture}
      />
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="founder profile evaluation tabs"
        >
          <Tab label="KPIs" {...a11yProps(0)} />
          <Tab label="Bi-weekly" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0}>
        <KPIReview
          kpis={biweeklyData?.kpis}
          founderId={founderId}
          founder={biweeklyData?.founder}
          venture={biweeklyData?.venture}
          founders={
            biweeklyData?.founder
              ? [biweeklyData.founder, ...(biweeklyData.coFounders || [])]
              : []
          }
        />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <BiWeekly data={biweeklyData} />
      </CustomTabPanel>
    </Box>
  )
}

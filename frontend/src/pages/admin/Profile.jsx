import * as React from 'react'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import { useLoaderData, useOutletContext, useParams } from 'react-router'

import BiWeekly from './BiWeekly'
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

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  }
}

export default function BasicTabs() {
  const [value, setValue] = React.useState(0)
  const biweeklyData = useLoaderData()
  const currentUser = useOutletContext()
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

  const founderId = params?.userid || biweeklyData?.founder?._id

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="founder profile evaluation tabs"
        >
          <Tab label="KPIS" {...a11yProps(0)} />
          <Tab label="Bi-Weekly" {...a11yProps(1)} />
        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0}>
        <KPIReview
          kpis={biweeklyData?.kpis}
          founderId={founderId}
          founder={biweeklyData?.founder}
          venture={biweeklyData?.venture}
        />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <BiWeekly data={biweeklyData} />
      </CustomTabPanel>
    </Box>
  )
}

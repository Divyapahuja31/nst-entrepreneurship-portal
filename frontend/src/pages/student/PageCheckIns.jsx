import { useLoaderData } from 'react-router'

import { Box } from '@mui/material'

import CheckInsSection from '../../components/CheckInsSection'
import PageHeader from '../../components/PageHeader'

// The student's bi-weekly meetings with their mentor.
export default function PageCheckIns() {
  const data = useLoaderData()

  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
      <PageHeader
        title="Check-Ins"
        subtitle="Your bi-weekly meetings with your mentor. They’re on your Google Calendar too."
      />
      <CheckInsSection checkIns={data ? data.checkIns : null} />
    </Box>
  )
}

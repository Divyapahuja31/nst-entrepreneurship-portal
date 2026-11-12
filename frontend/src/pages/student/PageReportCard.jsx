import { Box } from '@mui/material'
import { useLoaderData } from 'react-router'
import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import ReportCard from '../../components/ReportCard'
import SectionCard from '../../components/SectionCard'
import { DocTextIcon } from '../../components/icons'
import { useAuthStore } from '../../stores/auth'

export default function PageReportCard() {
  const { report } = useLoaderData()
  const studentName = useAuthStore(state => state.user?.username)

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto' }}>
      <PageHeader title="My Report Card" />
      {report ? (
        <ReportCard studentName={studentName} report={report} />
      ) : (
        <SectionCard>
          <EmptyState
            icon={DocTextIcon}
            title="No report card yet"
            description="Your report card will appear here once it is published."
          />
        </SectionCard>
      )}
    </Box>
  )
}

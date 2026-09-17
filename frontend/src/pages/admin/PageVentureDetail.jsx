import { useLoaderData } from 'react-router'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import CustomizedTable from '../../components/Table'

const founderColumns = ['username', 'email', 'joinedAt']
const pastFounderColumns = ['username', 'email', 'joinedAt', 'leftAt']

const formatDate = value => {
  if (!value) return '-'

  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function DetailItem({ label, value }) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1">{value || '-'}</Typography>
    </Grid>
  )
}

export default function PageVentureDetail() {
  const { venture, founders, pastFounders } = useLoaderData()

  const toRow = founder => ({
    ...founder,
    joinedAt: formatDate(founder.joinedAt),
    leftAt: formatDate(founder.leftAt),
  })

  return (
    <>
      <Typography variant="h4" gutterBottom>
        {venture.name}
      </Typography>

      {venture.description && (
        <Typography variant="body1" color="text.secondary">
          {venture.description}
        </Typography>
      )}

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <DetailItem label="CAMPUS" value={venture.campus} />
        <DetailItem label="INDUSTRY" value={venture.industry} />
        <DetailItem label="STAGE" value={venture.stage} />
        <DetailItem label="WEBSITE" value={venture.website} />
        <DetailItem label="TEAM SIZE" value={founders.length} />
        <DetailItem label="CREATED" value={formatDate(venture.createdAt)} />
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Founders
        </Typography>

        {founders.length ? (
          <CustomizedTable
            columnNames={founderColumns}
            data={founders.map(toRow)}
            targetRoute="/admin/profile"
          />
        ) : (
          <Alert severity="info">
            This startup has no active founders right now.
          </Alert>
        )}
      </Box>

      {pastFounders.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Past founders
          </Typography>

          <CustomizedTable
            columnNames={pastFounderColumns}
            data={pastFounders.map(toRow)}
            targetRoute="/admin/profile"
          />
        </Box>
      )}
    </>
  )
}

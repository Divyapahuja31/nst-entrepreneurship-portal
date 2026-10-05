import { useState } from 'react'
import { Link as RouterLink, useLoaderData } from 'react-router'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Chip from '@mui/material/Chip'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'

import CustomizedTable from '../../components/Table'
import BiWeekly from './PageReportBiWeekly'
import KPIReview from '../../components/KPIReview'
import { normalizeWebsite } from '../../components/proposalFormConfig.js'

const founderColumns = [
  { key: 'username', label: 'Founder' },
  { key: 'email', label: 'Email' },
  { key: 'joinedAt', label: 'Joined' },
]
const pastFounderColumns = [...founderColumns, { key: 'leftAt', label: 'Left' }]

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
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1">{value || '-'}</Typography>
    </Grid>
  )
}

export default function PageVentureDetail() {
  const [tabIndex, setTabIndex] = useState(0)
  const {
    venture,
    founders = [],
    pastFounders = [],
    biweekly,
    kpis = [],
  } = useLoaderData()

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue)
  }

  const toRow = founder => ({
    ...founder,
    joinedAt: formatDate(founder.joinedAt),
    leftAt: formatDate(founder.leftAt),
  })

  return (
    <Box sx={{ minHeight: '100vh', py: 2 }}>
      <Container maxWidth="lg">
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
            to="/admin/venture"
          >
            Startups
          </Link>
          <Typography color="text.primary">
            {venture?.name || 'Startup'}
          </Typography>
        </Breadcrumbs>

        {/* Top Profile Header Section */}
        <Paper
          elevation={0}
          sx={{
            p: 4,
            mb: 3,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Grid
            container
            spacing={2}
            sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            {/* Left: Name */}
            <Grid size={{ xs: 12, sm: 7 }}>
              <Typography
                variant="h4"
                component="h1"
                fontWeight="bold"
                gutterBottom
              >
                {venture.name}
              </Typography>
            </Grid>

            {/* Right: Stage, Campus, Industry Chips */}
            <Grid size={{ xs: 12, sm: 5 }} sx={{ textAlign: { sm: 'right' } }}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  justifyContent: { sm: 'flex-end' },
                  flexWrap: 'wrap',
                }}
              >
                {venture.stage && (
                  <Chip
                    label={`Stage: ${venture.stage}`}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {venture.campus && (
                  <Chip
                    label={`Campus: ${venture.campus}`}
                    color="secondary"
                    variant="outlined"
                  />
                )}
                {venture.industry && (
                  <Chip
                    label={`Industry: ${venture.industry}`}
                    variant="outlined"
                  />
                )}
              </Box>
            </Grid>

            {/* Description */}
            {venture.description && (
              <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ maxWidth: '900px', lineHeight: 1.6 }}
                >
                  {venture.description}
                </Typography>
              </Grid>
            )}

            {/* Details row */}
            <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <DetailItem
                  label="WEBSITE"
                  value={
                    venture.website ? (
                      <Link
                        href={normalizeWebsite(venture.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        underline="hover"
                      >
                        {venture.website}
                      </Link>
                    ) : null
                  }
                />
                <DetailItem label="TEAM SIZE" value={founders.length} />
                <DetailItem
                  label="CREATED"
                  value={formatDate(venture.createdAt)}
                />
              </Grid>
            </Grid>
          </Grid>
        </Paper>

        {/* Tab Navigation & Content Section */}
        <Paper
          elevation={0}
          sx={{ borderRadius: 2, border: 1, borderColor: 'divider' }}
        >
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, pt: 1 }}>
            <Tabs
              value={tabIndex}
              onChange={handleTabChange}
              aria-label="venture detail navigation tabs"
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab
                label="Founders"
                sx={{ fontWeight: 'bold', fontSize: '1rem' }}
              />
              <Tab label="KPIs" sx={{ fontWeight: 'bold', fontSize: '1rem' }} />
              <Tab
                label="Bi-weekly"
                sx={{ fontWeight: 'bold', fontSize: '1rem' }}
              />
            </Tabs>
          </Box>

          {/* Tab Panel Content */}
          <Box sx={{ p: 4 }}>
            {tabIndex === 0 && (
              <Box>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
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
                    This venture has no active founders right now.
                  </Alert>
                )}

                {pastFounders.length > 0 && (
                  <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Past founders
                    </Typography>

                    <CustomizedTable
                      columnNames={pastFounderColumns}
                      data={pastFounders.map(toRow)}
                      targetRoute="/admin/profile"
                    />
                  </Box>
                )}
              </Box>
            )}

            {tabIndex === 1 && (
              <Box>
                <KPIReview kpis={kpis} venture={venture} founders={founders} />
              </Box>
            )}

            {tabIndex === 2 && (
              <Box>
                {biweekly ? (
                  <BiWeekly data={biweekly} />
                ) : (
                  <Alert severity="warning">
                    Bi-weekly reports for this startup could not be loaded.
                    Refresh the page to try again.
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

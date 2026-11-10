import { Link as RouterLink } from 'react-router'

import {
  Box,
  Link,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'

import EmptyState from './EmptyState'
import SectionCard from './SectionCard'
import StatusPill from './StatusPill'
import { CheckCircleIcon, PeopleIcon } from './icons'

const DAY_MS = 24 * 60 * 60 * 1000

const daysSince = date =>
  Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS)

const lastActivity = date => {
  if (!date) {
    return 'Never'
  }
  const days = daysSince(date)
  return days < 1 ? 'Today' : `${days} day${days === 1 ? '' : 's'} ago`
}

const countReason = (checkIns, reason) =>
  checkIns.filter(v => v.reasons.includes(reason)).length

const summarize = (checkIns, ventureCount, inactiveDays) => {
  const notStarted = countReason(checkIns, 'NO_KPIS')
  const idle = countReason(checkIns, 'INACTIVE')
  const solo = countReason(checkIns, 'SOLO_FOUNDER')
  return [
    notStarted &&
      `${notStarted} of ${ventureCount} startups haven't set a KPI yet.`,
    idle && `${idle} had no KPI activity in the last ${inactiveDays} days.`,
    solo && `${solo} ${solo === 1 ? 'has' : 'have'} a solo founder.`,
  ]
    .filter(Boolean)
    .join(' ')
}

// Startups to check in on, each with the reasons it is listed.
export default function VentureCheckIns({
  checkIns = [],
  ventureCount,
  inactiveDays,
}) {
  const reasonLabels = {
    NO_KPIS: { label: 'No KPIs yet', tint: 'gray' },
    INACTIVE: { label: `Quiet ${inactiveDays}+ days`, tint: 'orange' },
    SOLO_FOUNDER: { label: 'Solo founder', tint: 'blue' },
  }

  return (
    <SectionCard
      icon={PeopleIcon}
      title="Startups to Check In On"
      subtitle={
        checkIns.length > 0
          ? summarize(checkIns, ventureCount, inactiveDays)
          : null
      }
    >
      {checkIns.length === 0 ? (
        <EmptyState
          icon={CheckCircleIcon}
          title="Every startup is active"
          description={`All startups have KPI activity in the last ${inactiveDays} days and more than one founder.`}
        />
      ) : (
        <Box sx={{ overflowX: 'auto', mx: { xs: -2.5, sm: -3 } }}>
          <Table sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ pl: { xs: 2.5, sm: 3 } }}>Startup</TableCell>
                <TableCell>Stage</TableCell>
                <TableCell align="right">Team</TableCell>
                <TableCell>Last KPI activity</TableCell>
                <TableCell sx={{ pr: { xs: 2.5, sm: 3 } }}>Why</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {checkIns.map(venture => (
                <TableRow
                  key={venture.id}
                  sx={{ '&:last-child td': { border: 0 } }}
                >
                  <TableCell sx={{ pl: { xs: 2.5, sm: 3 } }}>
                    <Link
                      component={RouterLink}
                      to={`/admin/venture/${venture.id}`}
                      sx={{ fontWeight: 500 }}
                    >
                      {venture.name}
                    </Link>
                  </TableCell>
                  <TableCell>{venture.stage ?? '-'}</TableCell>
                  <TableCell align="right">{venture.team}</TableCell>
                  <TableCell>{lastActivity(venture.lastActivityAt)}</TableCell>
                  <TableCell sx={{ pr: { xs: 2.5, sm: 3 } }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {venture.reasons.map(reason => (
                        <StatusPill key={reason} {...reasonLabels[reason]} />
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </SectionCard>
  )
}

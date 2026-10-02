import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router'

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
  if (checkIns.length === 0) {
    return `Every venture has KPI activity in the last ${inactiveDays} days and more than one founder.`
  }
  const notStarted = countReason(checkIns, 'NO_KPIS')
  const idle = countReason(checkIns, 'INACTIVE')
  const solo = countReason(checkIns, 'SOLO_FOUNDER')
  return [
    notStarted &&
      `${notStarted} of ${ventureCount} ventures haven't set a KPI yet.`,
    idle && `${idle} had no KPI activity in the last ${inactiveDays} days.`,
    solo && `${solo} ${solo === 1 ? 'has' : 'have'} a solo founder.`,
  ]
    .filter(Boolean)
    .join(' ')
}

// Ventures to check in on, each with the reasons it is listed.
export default function VentureCheckIns({
  checkIns = [],
  ventureCount,
  inactiveDays,
}) {
  const reasonLabels = {
    NO_KPIS: { label: 'No KPIs yet', color: 'default' },
    INACTIVE: {
      label: `No KPI activity in ${inactiveDays}+ days`,
      color: 'warning',
    },
    SOLO_FOUNDER: { label: 'Solo founder', color: 'info' },
  }
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" component="h2" fontWeight={600}>
          Ventures to check in on
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {summarize(checkIns, ventureCount, inactiveDays)}
        </Typography>
        {checkIns.length > 0 && (
          <TableContainer sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Venture</TableCell>
                  <TableCell>Stage</TableCell>
                  <TableCell align="right">Team</TableCell>
                  <TableCell>Last KPI activity</TableCell>
                  <TableCell>Why</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {checkIns.map(venture => (
                  <TableRow key={venture.id}>
                    <TableCell>
                      <Link
                        component={RouterLink}
                        to={`/admin/venture/${venture.id}`}
                      >
                        {venture.name}
                      </Link>
                    </TableCell>
                    <TableCell>{venture.stage ?? '-'}</TableCell>
                    <TableCell align="right">{venture.team}</TableCell>
                    <TableCell>
                      {lastActivity(venture.lastActivityAt)}
                    </TableCell>
                    <TableCell>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        useFlexGap
                        sx={{ flexWrap: 'wrap' }}
                      >
                        {venture.reasons.map(reason => (
                          <Chip
                            key={reason}
                            size="small"
                            variant="outlined"
                            {...reasonLabels[reason]}
                          />
                        ))}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  )
}

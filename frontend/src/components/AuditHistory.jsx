import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { api } from '../api/client'
import toError from '../api/toError'
import SectionCard from './SectionCard'

const formatTime = value =>
  new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium',
  })

const queryFor = form => {
  const query = Object.fromEntries(new FormData(form))
  if (query.from) {
    query.from = new Date(query.from + 'T00:00:00+05:30').toISOString()
  }
  if (query.until) {
    query.until = new Date(query.until + 'T23:59:59.999+05:30').toISOString()
  }
  return query
}

export default function AuditHistory() {
  const [query, setQuery] = useState({})
  const [data, setData] = useState({ entries: [] })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    api
      .get('/admin/audit-log', { params: query, signal: controller.signal })
      .then(result => {
        setData(result.data)
        setError('')
      })
      .catch(failure => {
        if (!controller.signal.aborted) {
          setData({ entries: [] })
          setError(toError(failure, 'Could not load the audit history.').error)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [query])

  return (
    <Stack spacing={2}>
      <SectionCard
        title="Activity log"
        subtitle="Portal actions and changes. Times are shown in IST."
      >
        <Box
          component="form"
          onSubmit={event => {
            event.preventDefault()
            setLoading(true)
            setQuery(queryFor(event.currentTarget))
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 1.5,
            }}
          >
            {[
              ['action', 'Action'],
              ['resourceType', 'Resource type'],
              ['resourceId', 'Resource ID'],
              ['ventureId', 'Startup ID'],
              ['studentId', 'Student ID'],
              ['requestId', 'Request reference'],
              ['actorId', 'Actor ID'],
              ['identityEmail', 'Sign-in email'],
            ].map(([name, label]) => (
              <TextField
                key={name}
                name={name}
                label={label}
                size="small"
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
            ))}
            <TextField
              name="from"
              label="From (IST)"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              size="small"
            />
            <TextField
              name="until"
              label="Until (IST)"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              size="small"
            />
            <Button type="submit" variant="outlined" disabled={loading}>
              Search
            </Button>
          </Box>
        </Box>
      </SectionCard>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <CircularProgress size={24} aria-label="Loading activity log" />
      ) : (
        <SectionCard>
          <TableContainer>
            <Table
              size="small"
              sx={{ minWidth: 720 }}
              aria-label="Activity log"
            >
              <TableHead>
                <TableRow>
                  {[
                    'When (IST)',
                    'Action',
                    'Actor',
                    'Resource',
                    'Outcome',
                    'Details',
                  ].map(label => (
                    <TableCell key={label}>{label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.entries.map(entry => (
                  <TableRow key={entry._id}>
                    <TableCell>{formatTime(entry.createdAt)}</TableCell>
                    <TableCell>{entry.action}</TableCell>
                    <TableCell>
                      {entry.actor?.email ??
                        entry.actor?.id ??
                        entry.source ??
                        'System'}
                    </TableCell>
                    <TableCell>
                      {entry.resourceType ?? 'User'}
                      <br />
                      {entry.resourceId ?? entry.target?.email}
                    </TableCell>
                    <TableCell>{entry.outcome ?? 'success'}</TableCell>
                    <TableCell>
                      <Box component="details">
                        <Box component="summary" sx={{ cursor: 'pointer' }}>
                          View change
                        </Box>
                        <Box
                          component="pre"
                          sx={{
                            maxWidth: 480,
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'anywhere',
                            fontSize: 12,
                          }}
                        >
                          {JSON.stringify(
                            {
                              requestId: entry.requestId,
                          sequence: entry.sequence,
                          source: entry.source,
                          job: entry.job,
                          instance: entry.instance,
                              ventureId: entry.ventureId,
                              cycle: entry.cycle,
                              before: entry.before,
                              after: entry.after,
                              metadata: entry.metadata,
                              previousRole: entry.previousRole,
                              newRole: entry.newRole,
                            },
                            null,
                            2
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {!data.entries.length && (
            <Typography sx={{ p: 2 }}>No matching activity.</Typography>
          )}
          {data.nextCursor && (
            <Button
              onClick={() => {
                setLoading(true)
                setQuery(current => ({ ...current, cursor: data.nextCursor }))
              }}
            >
              Older activity
            </Button>
          )}
        </SectionCard>
      )}
      {data.writer?.dropped > 0 && (
        <Alert severity="warning">
          Some audit events were dropped by this server. Check server logs for
          the affected period.
        </Alert>
      )}
    </Stack>
  )
}

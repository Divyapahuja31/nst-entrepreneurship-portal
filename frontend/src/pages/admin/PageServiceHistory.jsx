import {
  Form,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from 'react-router'
import {
  Alert,
  Box,
  Button,
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
import PageHeader from '../../components/PageHeader'
import SectionCard from '../../components/SectionCard'
import StatusPill from '../../components/StatusPill'

const timeFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const daySeconds = 24 * 60 * 60

const checkStatus = {
  pass: { label: 'Checks passed', tint: 'green' },
  fail: { label: 'Checks failed', tint: 'red' },
  mixed: { label: 'Mixed results', tint: 'orange' },
  missing: { label: 'Insufficient evidence', tint: 'gray' },
}

function HistoryTable({ headings, label, children }) {
  return (
    <TableContainer tabIndex={0} role="region" aria-label={label}>
      <Table size="small" aria-label={label}>
        <TableHead>
          <TableRow>
            {headings.map(heading => (
              <TableCell key={heading} scope="col">
                {heading}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>{children}</TableBody>
      </Table>
    </TableContainer>
  )
}

function CheckHistory({ data, dayStart }) {
  if (data.state === 'setup-required') {
    return (
      <Alert severity="info">
        Connect an external uptime monitor to see check history.
      </Alert>
    )
  }
  if (data.state === 'unavailable') {
    return (
      <Alert severity="warning">
        Uptime history is temporarily unavailable.
      </Alert>
    )
  }
  return (
    <Stack spacing={2}>
      {data.items.map(({ job, name, intervals }) => (
        <Box key={job}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {name}
          </Typography>
          {intervals.length ? (
            <HistoryTable
              label={name}
              headings={['From (IST)', 'Until (IST)', 'Observed result']}
            >
              {intervals.map(interval => (
                <TableRow key={interval.start}>
                  <TableCell>
                    {timeFormat.format(interval.start * 1000)}
                  </TableCell>
                  <TableCell>
                    {interval.end === dayStart + daySeconds
                      ? '24:00'
                      : timeFormat.format(interval.end * 1000)}
                  </TableCell>
                  <TableCell>
                    <StatusPill {...checkStatus[interval.state]} />
                  </TableCell>
                </TableRow>
              ))}
            </HistoryTable>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No completed checks for this date yet.
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  )
}

function FailureHistory({ data }) {
  if (data.state === 'setup-required') {
    return (
      <Alert severity="info">
        Connect the log source to look up failed requests.
      </Alert>
    )
  }
  if (data.state === 'unavailable') {
    return (
      <Alert severity="warning">
        Request history is temporarily unavailable.
      </Alert>
    )
  }
  if (!data.items.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No matching failures in the available logs.
      </Typography>
    )
  }
  return (
    <Stack spacing={1}>
      {data.truncated && (
        <Typography variant="body2">
          Showing up to 100 requests. Use a reference to find a specific
          failure.
        </Typography>
      )}
      <HistoryTable
        label="Failed requests"
        headings={[
          'Time (IST)',
          'Feature',
          'Method',
          'HTTP status',
          'Reference',
        ]}
      >
        {data.items.map((item, index) => (
          <TableRow key={`${item.reference}-${index}`}>
            <TableCell>{timeFormat.format(new Date(item.time))}</TableCell>
            <TableCell>{item.feature}</TableCell>
            <TableCell>{item.method}</TableCell>
            <TableCell>{item.status}</TableCell>
            <TableCell>{item.reference}</TableCell>
          </TableRow>
        ))}
      </HistoryTable>
    </Stack>
  )
}

export default function PageServiceHistory() {
  const data = useLoaderData()
  const [params] = useSearchParams()
  const busy = useNavigation().state !== 'idle'
  const date = params.get('day') ?? data.date ?? ''
  const reference = params.get('reference') ?? ''

  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
      <PageHeader
        title="Service History"
        subtitle="Check reported outages and failed requests on the production portal."
      />
      <Stack spacing={2.5}>
        <SectionCard>
          <Form method="get" key={`${date}:${reference}`}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                type="date"
                name="day"
                label="Date (IST)"
                defaultValue={date}
                required
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { max: data.today },
                }}
              />
              <TextField
                name="reference"
                label="Request reference (optional)"
                defaultValue={reference}
                slotProps={{ htmlInput: { maxLength: 36 } }}
                fullWidth
              />
              <Button
                type="submit"
                variant="contained"
                loading={busy}
                sx={{ minWidth: 112 }}
              >
                Look up
              </Button>
            </Stack>
          </Form>
        </SectionCard>
        {data.error ? (
          <Alert severity="error">{data.error}</Alert>
        ) : (
          <>
            <SectionCard
              title="Availability"
              subtitle="One-minute checks. Intervals without a recorded check show insufficient evidence."
            >
              <CheckHistory data={data.checks} dayStart={data.start} />
            </SectionCard>
            <SectionCard
              title="Failed requests"
              subtitle="Server errors recorded by the portal. Use the date and reference from the student’s error message."
            >
              <FailureHistory data={data.failures} />
            </SectionCard>
          </>
        )}
      </Stack>
    </Box>
  )
}

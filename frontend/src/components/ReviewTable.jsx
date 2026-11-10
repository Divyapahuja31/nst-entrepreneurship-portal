import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import StatusPill from './StatusPill'
import { StyledTableCell, StyledTableRow } from './Table.style'
import TableCard from './TableCard'
import { kpiStatus } from './kpiStatus'

export default function ReviewTable({
  columns,
  rows,
  onApprove,
  onReject,
  onView,
  busyId,
  renderActions,
  actionsLabel = 'actions',
}) {
  return (
    <TableCard>
      <Table sx={{ minWidth: 700 }}>
        <TableHead>
          <TableRow>
            {columns.map(column => (
              <StyledTableCell key={column.key}>{column.label}</StyledTableCell>
            ))}
            <StyledTableCell align="right">{actionsLabel}</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => (
            <StyledTableRow key={row.id}>
              {columns.map(column => (
                <StyledTableCell key={column.key}>
                  {column.key === 'status' && row.rawStatus ? (
                    <StatusPill
                      label={kpiStatus(row.rawStatus).label}
                      tint={kpiStatus(row.rawStatus).tint}
                      plain={kpiStatus(row.rawStatus).plain}
                    />
                  ) : (
                    row[column.key] || '-'
                  )}
                </StyledTableCell>
              ))}
              <StyledTableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                {renderActions ? (
                  renderActions(row)
                ) : (
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ justifyContent: 'flex-end' }}
                  >
                    {onView && (
                      <Button variant="text" onClick={() => onView(row)}>
                        View
                      </Button>
                    )}
                    {onApprove && (
                      <Button
                        variant="outlined"
                        color="success"
                        disabled={Boolean(busyId)}
                        onClick={() => onApprove(row)}
                      >
                        Approve
                      </Button>
                    )}
                    {onReject && (
                      <Button
                        variant="outlined"
                        color="error"
                        disabled={Boolean(busyId)}
                        onClick={() => onReject(row)}
                      >
                        Reject
                      </Button>
                    )}
                  </Stack>
                )}
              </StyledTableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </TableCard>
  )
}

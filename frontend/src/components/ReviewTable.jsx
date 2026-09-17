import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import { StyledTableCell, StyledTableRow } from './Table.style'

const STATUS_CHIP_COLORS = {
  ACCEPTED: 'info',
  GRADED: 'success',
  REJECTED: 'error',
  WAITING_FOR_APPROVAL: 'warning',
  DRAFT: 'default',
}

export default function ReviewTable({
  columns,
  rows,
  onApprove,
  onReject,
  onView,
  busyId,
  renderActions,
}) {
  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 700 }} aria-label="review table">
        <TableHead>
          <TableRow>
            {columns.map(column => (
              <StyledTableCell key={column.key}>{column.label}</StyledTableCell>
            ))}
            <StyledTableCell align="right">actions</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => (
            <StyledTableRow key={row.id}>
              {columns.map(column => (
                <StyledTableCell key={column.key}>
                  {column.key === 'status' && row.rawStatus ? (
                    <Chip
                      label={row.status}
                      size="small"
                      color={STATUS_CHIP_COLORS[row.rawStatus] || 'default'}
                      sx={{ fontWeight: 600 }}
                    />
                  ) : (
                    row[column.key] || '-'
                  )}
                </StyledTableCell>
              ))}
              <StyledTableCell align="right">
                {renderActions ? (
                  renderActions(row)
                ) : (
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {onView && (
                      <Button size="small" onClick={() => onView(row)}>
                        View
                      </Button>
                    )}
                    {onApprove && (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={Boolean(busyId)}
                        onClick={() => onApprove(row)}
                      >
                        Approve
                      </Button>
                    )}
                    {onReject && (
                      <Button
                        size="small"
                        variant="outlined"
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
    </TableContainer>
  )
}

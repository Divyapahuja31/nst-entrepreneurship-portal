import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'

import { StyledTableCell, StyledTableRow } from './Table.style'

export default function ReviewTable({
  columns,
  rows,
  onApprove,
  onReject,
  onView,
  busyId,
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
                  {row[column.key] || '-'}
                </StyledTableCell>
              ))}
              <StyledTableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  {onView && (
                    <Button size="small" onClick={() => onView(row)}>
                      View
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="contained"
                    disabled={Boolean(busyId)}
                    onClick={() => onApprove(row)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={Boolean(busyId)}
                    onClick={() => onReject(row)}
                  >
                    Reject
                  </Button>
                </Stack>
              </StyledTableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

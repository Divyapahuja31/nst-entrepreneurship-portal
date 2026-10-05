import { Link as RouterLink } from 'react-router'
import Link from '@mui/material/Link'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Checkbox from '@mui/material/Checkbox'
import { StyledTableCell, StyledTableRow } from './Table.style'
import TableCard from './TableCard'

// A column is either a data key (shown as its own header, right-aligned after
// the first column, as before) or { key, label, align }.
const toColumn = (column, index) =>
  typeof column === 'string'
    ? { key: column, label: column, align: index === 0 ? 'left' : 'right' }
    : { align: 'left', ...column }

// Rows link to `${targetRoute}/${row.id}` from the first column. Selection
// checkboxes appear only when the page handles selection (setSelectedRows).
export default function CustomizedTable({
  data,
  selectedRows = [],
  setSelectedRows,
  columnNames,
  targetRoute,
}) {
  const columns = columnNames.map(toColumn)
  const [first, ...rest] = columns
  const selectable = typeof setSelectedRows === 'function'

  const handleRowSelect = rowId => {
    if (selectedRows.includes(rowId)) {
      setSelectedRows(selectedRows.filter(i => i !== rowId))
    } else {
      setSelectedRows([...selectedRows, rowId])
    }
  }
  const handleSelectAll = () => {
    const allIds = data.map((r, idx) => r.id ?? idx)
    if (data.length > 0 && selectedRows.length === data.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(allIds)
    }
  }
  return (
    <TableCard>
      <Table sx={{ minWidth: 640 }}>
        <TableHead>
          <TableRow>
            {selectable && (
              <StyledTableCell padding="checkbox">
                <Checkbox
                  checked={
                    data.length > 0 && data.length === selectedRows.length
                  }
                  indeterminate={
                    selectedRows.length > 0 && selectedRows.length < data.length
                  }
                  data-testid="select-all-checkbox"
                  onClick={handleSelectAll}
                  slotProps={{ input: { 'aria-label': 'Select all rows' } }}
                />
              </StyledTableCell>
            )}
            {columns.map(column => (
              <StyledTableCell key={column.key} align={column.align}>
                {column.label}
              </StyledTableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data &&
            data.map((row, idx) => {
              const id = row.id
              return (
                <StyledTableRow key={id ?? idx}>
                  {selectable && (
                    <StyledTableCell padding="checkbox">
                      <Checkbox
                        checked={selectedRows.includes(id)}
                        onClick={() => handleRowSelect(id)}
                        data-testid={`select-row-checkbox-${idx}`}
                      />
                    </StyledTableCell>
                  )}
                  <StyledTableCell
                    component="th"
                    scope="row"
                    align={first.align}
                  >
                    <Link
                      component={RouterLink}
                      to={`${targetRoute}/${row.id}`}
                      sx={{ fontWeight: 500 }}
                    >
                      {row[first.key]}
                    </Link>
                  </StyledTableCell>
                  {rest.map(column => (
                    <StyledTableCell key={column.key} align={column.align}>
                      {row[column.key]}
                    </StyledTableCell>
                  ))}
                </StyledTableRow>
              )
            })}
        </TableBody>
      </Table>
    </TableCard>
  )
}

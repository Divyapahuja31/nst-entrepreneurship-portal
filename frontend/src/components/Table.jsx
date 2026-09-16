import { Link as RouterLink } from 'react-router'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Checkbox from '@mui/material/Checkbox'
import { StyledTableCell, StyledTableRow } from './Table.style'

export default function CustomizedTable({
  data,
  selectedRows = [],
  setSelectedRows = () => {},
  columnNames,
}) {
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
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 700 }} aria-label="customized table">
        <TableHead>
          <TableRow>
            <StyledTableCell style={{ maxWidth: '160px' }}>
              <Checkbox
                checked={data.length > 0 && data.length === selectedRows.length}
                indeterminate={
                  selectedRows.length > 0 && selectedRows.length < data.length
                }
                data-testid="select-all-checkbox"
                onClick={handleSelectAll}
              />{' '}
              <span
                style={{
                  visibility: selectedRows.length > 0 ? 'visible' : 'hidden',
                }}
              >{`${selectedRows.length} selected`}</span>
            </StyledTableCell>
            <StyledTableCell>{columnNames[0]}</StyledTableCell>
            {columnNames.slice(1).map((columnName, idx) => (
              <StyledTableCell key={idx} align="right">
                {columnName}
              </StyledTableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, idx) => {
            const userId = row.id ?? idx
            return (
              <StyledTableRow key={userId}>
                <StyledTableCell>
                  <Checkbox
                    checked={selectedRows.includes(userId)}
                    onClick={() => handleRowSelect(userId)}
                    data-testid={`select-row-checkbox-${idx}`}
                  />
                </StyledTableCell>
                <StyledTableCell component="th" scope="row">
                  <Link
                    component={RouterLink}
                    to={`/profile/${row.id}`}
                    underline="hover"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {row[columnNames[0]]}
                  </Link>
                </StyledTableCell>
                {columnNames.slice(1).map(columnName => (
                  <StyledTableCell align="right">
                    {row[columnName]}
                  </StyledTableCell>
                ))}
              </StyledTableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

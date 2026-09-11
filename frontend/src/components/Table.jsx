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
}) {
  const columnName = [
    'founder',
    'startup',
    'campus',
    'stage',
    'team',
    'score',
    'status',
  ]

  const handleRowSelect = (e) => {
    const idx = parseInt(e.currentTarget.getAttribute("data-testid").split('-').pop());
    if (selectedRows.includes(idx)) {
      setSelectedRows(selectedRows.filter(i => i !== idx))
    } else {
      setSelectedRows([...selectedRows, idx])
    }
  }
  const handleSelectAll = () => {
    if (selectedRows.length === data.length) {
      setSelectedRows([])
    } else {
      setSelectedRows(data.map((_, idx) => idx))
    }
  }
  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 700 }} aria-label="customized table">
        <TableHead>
          <TableRow>
            <StyledTableCell style={{maxWidth: '160px'}}><Checkbox checked={data.length > 0 && data.length === selectedRows.length}
            indeterminate={selectedRows.length > 0 && selectedRows.length < data.length}
            data-testid="select-all-checkbox"
            onClick={handleSelectAll}/> <span style={{visibility: selectedRows.length > 0 ? 'visible' : 'hidden'}}>{`${selectedRows.length} selected`}</span></StyledTableCell>
            <StyledTableCell>{columnName[0]}</StyledTableCell>
            {columnName.slice(1).map((column, idx) => (
              <StyledTableCell key={idx} align="right">
                {column}
              </StyledTableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, idx) => {
            const userId = row.id
            return (
              <StyledTableRow key={userId ?? idx}>
                <StyledTableCell>
                  <Checkbox
                    checked={selectedRows.includes(idx)}
                    onClick={handleRowSelect}
                    data-testid={`select-row-checkbox-${idx}`}
                  />
                </StyledTableCell>
                <StyledTableCell component="th" scope="row">
                  <Link
                    component={RouterLink}
                    to={`/profile/${userId}`}
                    underline="hover"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {row.founder}
                  </Link>
                </StyledTableCell>
                <StyledTableCell align="right">{row.startup}</StyledTableCell>
                <StyledTableCell align="right">{row.campus}</StyledTableCell>
                <StyledTableCell align="right">{row.stage}</StyledTableCell>
                <StyledTableCell align="right">{row.team}</StyledTableCell>
                <StyledTableCell align="right">
                  {row.score ? row.score : '-'}
                </StyledTableCell>
                <StyledTableCell align="right">
                  {row.status ? row.status : '-'}
                </StyledTableCell>
              </StyledTableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

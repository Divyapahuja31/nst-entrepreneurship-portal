import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import Paper from '@mui/material/Paper'
import TableRow from '@mui/material/TableRow'

import { StyledTableCell } from './Table.style'
import { StyledTableRow } from './Table.style'

export default function CustomizedTable({ data }) {
  const columnName = [
    'founder',
    'startup',
    'campus',
    'stage',
    'team',
    'score',
    'status',
  ]

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 700 }} aria-label="customized table">
        <TableHead>
          <TableRow>
            <StyledTableCell>{columnName[0]}</StyledTableCell>
            {columnName.slice(1).map((column, idx) => (
              <StyledTableCell key={idx} align="right">
                {column}
              </StyledTableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, idx) => (
            <StyledTableRow key={idx}>
              <StyledTableCell component="th" scope="row">
                {row.founder}
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
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

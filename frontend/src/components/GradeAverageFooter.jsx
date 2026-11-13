import { TableCell, TableFooter, TableRow } from '@mui/material'
import { reportColumnAverages } from '@nst/shared/reportCards.js'
import { SubjectCell } from './GradeTableHead'

const markFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
})

export default function GradeAverageFooter({ layout, rows, actions = false }) {
  const averages = reportColumnAverages(layout, rows)
  if (!averages.some(average => average !== undefined)) {
    return null
  }

  const emphasis = { fontWeight: 600, color: 'text.primary' }
  return (
    <TableFooter>
      <TableRow sx={{ bgcolor: 'background.default' }}>
        <SubjectCell
          component="th"
          scope="row"
          sx={{ ...emphasis, bgcolor: 'background.default' }}
        >
          Average mark
        </SubjectCell>
        {averages.map((average, index) => (
          <TableCell key={index} align="center" sx={emphasis}>
            {average === null
              ? '—'
              : average === undefined
                ? ''
                : markFormat.format(average)}
          </TableCell>
        ))}
        {actions && <TableCell />}
      </TableRow>
    </TableFooter>
  )
}

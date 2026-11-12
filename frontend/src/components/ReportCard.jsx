import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import {
  reportAssessments,
  subjectMarkMaximum,
} from '@nst/shared/reportCards.js'
import GradeLegend from './GradeLegend'
import GradeTableHead, { SubjectCell, SubjectMaximum } from './GradeTableHead'
import SectionCard from './SectionCard'

const formatDate = date =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(
    new Date(date)
  )

function FlatHead({ columns }) {
  return (
    <TableHead sx={{ bgcolor: 'background.default' }}>
      <TableRow>
        {columns.map(column => (
          <TableCell key={column} scope="col">
            {column}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  )
}

function ReportRow({ row, layout }) {
  if (!layout) {
    return row.map((cell, index) => (
      <TableCell
        key={index}
        sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}
      >
        {cell || '—'}
      </TableCell>
    ))
  }

  const [subject, ...grades] = row
  return (
    <>
      <SubjectCell
        component="th"
        scope="row"
        sx={{
          bgcolor: 'background.paper',
          fontWeight: 600,
          overflowWrap: 'anywhere',
        }}
      >
        {subject}
        <SubjectMaximum maximum={subjectMarkMaximum(layout, subject)} />
      </SubjectCell>
      {grades.map((grade, index) => (
        <TableCell
          key={index}
          align="center"
          sx={{
            fontVariantNumeric: 'tabular-nums',
            color: grade ? 'text.primary' : 'text.secondary',
          }}
        >
          {layout.mode === 'letter' ? grade.toUpperCase() || '—' : grade || '—'}
        </TableCell>
      ))}
    </>
  )
}

export default function ReportCard({ studentName, report }) {
  const { title, columns, rows, publishedAt, layout } = report
  return (
    <SectionCard title={title} subtitle={studentName}>
      <Stack spacing={2.5}>
        {publishedAt && (
          <Typography variant="body2" color="text.secondary">
            Published {formatDate(publishedAt)}
          </Typography>
        )}
        {layout && reportAssessments(layout).length > 1 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { sm: 'none' } }}
          >
            Scroll the table to see all assessments.
          </Typography>
        )}
        <TableContainer
          tabIndex={layout ? 0 : undefined}
          role={layout ? 'region' : undefined}
          aria-label={layout ? 'Report card grades' : undefined}
          sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
        >
          <Table size="small" aria-label={title}>
            {layout && <colgroup span={1} />}
            {layout?.terms.map(term => (
              <colgroup key={term.id} span={term.assessments.length} />
            ))}
            {layout ? (
              <GradeTableHead layout={layout} />
            ) : (
              <FlatHead columns={columns} />
            )}
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  <ReportRow row={row} layout={layout} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {layout?.mode === 'letter' && <GradeLegend legend={layout.legend} />}
      </Stack>
    </SectionCard>
  )
}

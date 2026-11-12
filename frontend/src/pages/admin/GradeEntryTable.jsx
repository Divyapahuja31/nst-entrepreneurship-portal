import {
  Button,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
} from '@mui/material'
import {
  LETTER_GRADES,
  REPORT_CARD_LIMITS as limits,
  reportAssessments,
  reportGradeError,
  subjectMarkMaximum,
} from '@nst/shared/reportCards.js'
import GradeTableHead, {
  SubjectCell,
  SubjectMaximum,
} from '../../components/GradeTableHead'
import { PlusIcon, TrashIcon } from '../../components/icons'

function GradeInput({
  value,
  layout,
  assessment,
  subject,
  label,
  onChange,
  disabled,
}) {
  const letters = layout.mode === 'letter'
  const problem = reportGradeError(
    value,
    layout.mode,
    assessment,
    subjectMarkMaximum(layout, subject)
  )
  const selected = letters && !problem ? value.trim().toUpperCase() : value
  return (
    <TextField
      select={letters}
      hiddenLabel
      size="small"
      value={selected}
      error={Boolean(problem)}
      disabled={disabled}
      onChange={onChange}
      slotProps={{
        htmlInput: {
          'aria-label': label,
          inputMode: 'decimal',
          maxLength: limits.cell,
        },
        select: {
          SelectDisplayProps: { 'aria-label': label },
          displayEmpty: true,
        },
      }}
      fullWidth
    >
      {letters && <MenuItem value="">—</MenuItem>}
      {letters &&
        LETTER_GRADES.map(grade => (
          <MenuItem key={grade} value={grade}>
            {grade}
          </MenuItem>
        ))}
      {letters && problem && (
        <MenuItem value={value} disabled>
          {value}
        </MenuItem>
      )}
    </TextField>
  )
}

export default function GradeEntryTable({ layout, rows, setRows, disabled }) {
  const assessments = reportAssessments(layout)
  const gradeLabels = layout.terms.flatMap(term =>
    term.assessments.map(assessment => `${term.name}, ${assessment.name}`)
  )
  const changeCell = (rowIndex, columnIndex, value) =>
    setRows(current =>
      current.map((row, index) =>
        index === rowIndex
          ? row.map((cell, column) => (column === columnIndex ? value : cell))
          : row
      )
    )

  return (
    <Stack spacing={1.5}>
      <TableContainer
        sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
      >
        <Table size="small" aria-label="Subjects and grades">
          <colgroup span={1} />
          {layout.terms.map(term => (
            <colgroup key={term.id} span={term.assessments.length} />
          ))}
          <colgroup span={1} />
          <GradeTableHead layout={layout} actions />
          <TableBody>
            {rows.map(([subject, ...grades], rowIndex) => (
              <TableRow key={rowIndex}>
                <SubjectCell
                  sx={{
                    minWidth: 164,
                    bgcolor: 'background.paper',
                    p: 1,
                  }}
                >
                  <TextField
                    hiddenLabel
                    size="small"
                    placeholder="Subject name"
                    value={subject}
                    disabled={disabled}
                    onChange={event =>
                      changeCell(rowIndex, 0, event.target.value)
                    }
                    slotProps={{
                      htmlInput: {
                        'aria-label': `Subject, row ${rowIndex + 1}`,
                        maxLength: limits.cell,
                      },
                    }}
                    fullWidth
                  />
                  <SubjectMaximum
                    maximum={subjectMarkMaximum(layout, subject)}
                  />
                </SubjectCell>
                {assessments.map((assessment, index) => (
                  <TableCell key={assessment.id} sx={{ minWidth: 104, p: 1 }}>
                    <GradeInput
                      value={grades[index]}
                      assessment={assessment}
                      subject={subject}
                      layout={layout}
                      label={`${gradeLabels[index]}, ${subject.trim() || `row ${rowIndex + 1}`}`}
                      onChange={event =>
                        changeCell(rowIndex, index + 1, event.target.value)
                      }
                      disabled={disabled}
                    />
                  </TableCell>
                ))}
                <TableCell align="center">
                  <IconButton
                    aria-label={`Remove subject ${subject.trim() || rowIndex + 1}`}
                    disabled={disabled}
                    onClick={() =>
                      setRows(current =>
                        current.filter((_, index) => index !== rowIndex)
                      )
                    }
                  >
                    <TrashIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={assessments.length + 2}>
                  Add a subject to start entering grades.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Button
        variant="outlined"
        startIcon={<PlusIcon />}
        sx={{ alignSelf: 'flex-start' }}
        disabled={disabled || rows.length >= limits.rows}
        onClick={() =>
          setRows(current => [...current, ['', ...assessments.map(() => '')]])
        }
      >
        Add Subject
      </Button>
    </Stack>
  )
}

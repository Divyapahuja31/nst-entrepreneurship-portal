import { useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material'
import {
  gradeLayoutError,
  normalizeGradeLayout,
  reportAssessments,
} from '@nst/shared/reportCards.js'
import GradeLayoutFields from '../../components/GradeLayoutFields'
import { newGradeLayout } from '../../components/gradeLayout'

const fromColumns = columns => {
  const layout = newGradeLayout()
  const [first] = layout.terms
  const assessments = columns
    .slice(1)
    .map(name => ({ id: crypto.randomUUID(), name, max: 100 }))
  return {
    ...layout,
    terms: [
      {
        ...first,
        assessments: assessments.length ? assessments : first.assessments,
      },
    ],
  }
}

export default function GradeSetupDialog({
  layout,
  columns,
  rows,
  onClose,
  onApply,
}) {
  const [original] = useState(() => layout ?? fromColumns(columns))
  const [draft, setDraft] = useState(original)
  const [error, setError] = useState('')
  const previous = reportAssessments(original)
  const next = reportAssessments(draft)
  const sourceColumn = new Map(
    previous.map((item, index) => [item.id, index + 1])
  )
  const remaining = new Set(next.map(item => item.id))
  const removingGrades = previous.some(
    (item, index) =>
      !remaining.has(item.id) && rows.some(row => row[index + 1]?.trim())
  )

  function apply() {
    const problem = gradeLayoutError(draft)
    if (problem) {
      setError(problem)
      return
    }
    const mapped = rows.map(row => [
      row[0],
      ...next.map(item => row[sourceColumn.get(item.id)] ?? ''),
    ])
    onApply(normalizeGradeLayout(draft), mapped)
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {layout ? 'Grading Setup' : 'Switch to Term Layout'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {!layout && (
            <Alert severity="info">
              The first column becomes Subject. Other columns become assessments
              in Term 1.
            </Alert>
          )}
          {removingGrades && (
            <Alert severity="warning">
              Applying this setup removes the grades in deleted assessment
              columns.
            </Alert>
          )}
          {layout && draft.mode !== original.mode && (
            <Alert severity="info">
              Existing grades are kept in the draft. Replace grades that don’t
              fit the new mode before publishing.
            </Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          <GradeLayoutFields layout={draft} onChange={setDraft} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={apply}>
          Apply Setup
        </Button>
      </DialogActions>
    </Dialog>
  )
}

import { useState } from 'react'
import { Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { REPORT_CARD_LIMITS as limits } from '@nst/shared/reportCards.js'
import { SparklesIcon } from '../../components/icons'
import {
  ALL_GRADE_ASSESSMENTS,
  gradeSuggestionSelection,
} from './applyGradeSuggestions'

export default function ReportObservationFields({
  layout,
  rows,
  observation,
  onChange,
  onSuggest,
  pending,
}) {
  const [selected, setSelected] = useState(null)
  const assessments =
    layout?.terms.flatMap(term =>
      term.assessments.map(item => ({
        id: item.id,
        label: `${term.name} · ${item.name}`,
      }))
    ) ?? []
  const selection = layout && gradeSuggestionSelection(layout, rows, selected)
  const canSuggest = Boolean(selection?.blankCount && observation.trim())

  return (
    <Stack spacing={1.5}>
      <TextField
        label="Student observations (optional)"
        value={observation}
        onChange={event => onChange(event.target.value)}
        disabled={Boolean(pending)}
        helperText={
          layout
            ? 'Private grading notes. Suggest Grades sends this text to Gemini. Include only details relevant to grading.'
            : 'Private grading notes. Switch to Term Layout to get grade suggestions.'
        }
        slotProps={{ htmlInput: { maxLength: limits.observation } }}
        minRows={3}
        multiline
        fullWidth
      />
      {layout && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ alignItems: { sm: 'center' } }}
        >
          {assessments.length > 1 && (
            <TextField
              select
              size="small"
              label="Assessments to grade"
              value={selection.assessmentId}
              onChange={event => setSelected(event.target.value)}
              disabled={Boolean(pending)}
              sx={{ minWidth: 220 }}
            >
              {assessments.map(item => (
                <MenuItem key={item.id} value={item.id}>
                  {item.label}
                </MenuItem>
              ))}
              <MenuItem value={ALL_GRADE_ASSESSMENTS}>All assessments</MenuItem>
            </TextField>
          )}
          <Button
            variant="outlined"
            startIcon={<SparklesIcon />}
            disabled={Boolean(pending) || !canSuggest}
            loading={pending === 'suggest'}
            onClick={() => {
              const { assessmentId } = selection
              setSelected(assessmentId)
              onSuggest(
                assessmentId === ALL_GRADE_ASSESSMENTS
                  ? undefined
                  : assessmentId
              )
            }}
            sx={{ alignSelf: 'flex-start' }}
          >
            Suggest Grades
          </Button>
        </Stack>
      )}
      {selection && (
        <Typography variant="body2" color="text.secondary">
          {suggestionHint(selection)}
        </Typography>
      )}
    </Stack>
  )
}

const suggestionHint = ({ hasCriteria, blankCount }) => {
  if (!hasCriteria) {
    return 'Add and name a subject in the table below to get suggestions.'
  }
  if (!blankCount) {
    return 'There are no blank grades in this selection.'
  }
  return `Only blank grades can be suggested (${blankCount} available).`
}

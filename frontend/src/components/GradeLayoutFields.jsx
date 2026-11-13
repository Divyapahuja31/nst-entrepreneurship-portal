import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  LETTER_GRADES,
  REPORT_CARD_LIMITS as limits,
  reportAssessments,
} from '@nst/shared/reportCards.js'
import { TrashIcon } from './icons'

import { newAssessment, newTerm } from './gradeLayout'

function TermFields({ term, position, layout, onChange, disabled }) {
  const numeric = layout.mode === 'numeric'
  const update = fields =>
    onChange({
      ...layout,
      terms: layout.terms.map(item =>
        item.id === term.id ? { ...item, ...fields } : item
      ),
    })
  const updateAssessment = (id, fields) =>
    update({
      assessments: term.assessments.map(item =>
        item.id === id ? { ...item, ...fields } : item
      ),
    })

  return (
    <Stack
      spacing={1.5}
      sx={{ bgcolor: 'background.default', borderRadius: '14px', p: 2 }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <TextField
          label={`Term ${position} name`}
          value={term.name}
          onChange={event => update({ name: event.target.value })}
          slotProps={{ htmlInput: { maxLength: limits.column } }}
          disabled={disabled}
          fullWidth
        />
        <IconButton
          aria-label={`Remove term ${position}`}
          disabled={disabled || layout.terms.length === 1}
          onClick={() =>
            onChange({
              ...layout,
              terms: layout.terms.filter(item => item.id !== term.id),
            })
          }
        >
          <TrashIcon fontSize="small" />
        </IconButton>
      </Stack>
      {term.assessments.map((item, index) => (
        <Box key={item.id}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <TextField
              label={`Assessment ${index + 1}`}
              value={item.name}
              onChange={event =>
                updateAssessment(item.id, { name: event.target.value })
              }
              size="small"
              disabled={disabled}
              fullWidth
              slotProps={{ htmlInput: { maxLength: limits.column } }}
            />
            {numeric && (
              <TextField
                label="Max"
                size="small"
                value={item.max}
                disabled={disabled}
                onChange={event =>
                  updateAssessment(item.id, { max: event.target.value })
                }
                slotProps={{
                  htmlInput: { inputMode: 'decimal', maxLength: 10 },
                }}
                sx={{ width: 86, flexShrink: 0 }}
              />
            )}
            <IconButton
              aria-label={`Remove assessment ${index + 1} from term ${position}`}
              disabled={disabled || term.assessments.length === 1}
              onClick={() =>
                update({
                  assessments: term.assessments.filter(
                    entry => entry.id !== item.id
                  ),
                })
              }
            >
              <TrashIcon fontSize="small" />
            </IconButton>
          </Stack>
          {numeric && (
            <FormControlLabel
              label="Show column average"
              disabled={disabled}
              control={
                <Checkbox
                  size="small"
                  checked={item.showAverage !== false}
                  onChange={event =>
                    updateAssessment(item.id, {
                      showAverage: event.target.checked,
                    })
                  }
                  slotProps={{
                    input: {
                      'aria-label': `Show column average for ${term.name || `term ${position}`}, ${item.name || `assessment ${index + 1}`}`,
                    },
                  }}
                />
              }
            />
          )}
        </Box>
      ))}
      <Button
        onClick={() =>
          update({
            assessments: [
              ...term.assessments,
              { ...newAssessment(), name: '' },
            ],
          })
        }
        disabled={
          disabled || reportAssessments(layout).length >= limits.assessments
        }
        sx={{ alignSelf: 'flex-start' }}
      >
        Add Assessment
      </Button>
    </Stack>
  )
}

export default function GradeLayoutFields({
  layout,
  onChange,
  disabled = false,
}) {
  const atLimit = reportAssessments(layout).length >= limits.assessments

  return (
    <Stack spacing={2.5}>
      <TextField
        select
        label="Grading mode"
        value={layout.mode}
        onChange={event => onChange({ ...layout, mode: event.target.value })}
        disabled={disabled}
        sx={{ maxWidth: 260 }}
      >
        <MenuItem value="numeric">Numeric marks</MenuItem>
        <MenuItem value="letter">Letter grades (A–D)</MenuItem>
      </TextField>
      {layout.mode === 'letter' && (
        <Stack spacing={1.5}>
          <Typography variant="subtitle1">Grade meanings</Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 1.5,
            }}
          >
            {LETTER_GRADES.map(grade => (
              <TextField
                key={grade}
                label={`Grade ${grade} meaning`}
                value={layout.legend[grade]}
                disabled={disabled}
                size="small"
                onChange={event =>
                  onChange({
                    ...layout,
                    legend: { ...layout.legend, [grade]: event.target.value },
                  })
                }
                slotProps={{ htmlInput: { maxLength: limits.cell } }}
              />
            ))}
          </Box>
        </Stack>
      )}
      <Stack spacing={1.5}>
        <Typography variant="subtitle1">Terms and assessments</Typography>
        <Typography variant="body2" color="text.secondary">
          Each term groups its assessments. Subject is always the first column.
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: 1.5,
          }}
        >
          {layout.terms.map((term, index) => (
            <TermFields
              key={term.id}
              term={term}
              position={index + 1}
              layout={layout}
              onChange={onChange}
              disabled={disabled}
            />
          ))}
        </Box>
        <Button
          variant="outlined"
          onClick={() =>
            onChange({ ...layout, terms: [...layout.terms, newTerm('')] })
          }
          disabled={disabled || atLimit || layout.terms.length >= limits.terms}
          sx={{ alignSelf: 'flex-start' }}
        >
          Add Term
        </Button>
      </Stack>
    </Stack>
  )
}

import { Button, IconButton, Stack, TextField, Typography } from '@mui/material'
import { REPORT_CARD_LIMITS as limits } from '@nst/shared/reportCards.js'
import { TrashIcon } from './icons'

const blankCriterion = { name: '', max: 100 }

export default function TemplateCriteriaFields({ layout, onChange, disabled }) {
  const criteria = layout.subjects ?? []
  const visibleCriteria = criteria.length ? criteria : [blankCriterion]
  const update = (index, fields) =>
    onChange(
      visibleCriteria.map((item, i) =>
        i === index ? { ...item, ...fields } : item
      )
    )

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1">Criteria</Typography>
      <Typography variant="body2" color="text.secondary">
        Criteria become rows in new report cards. Descriptions guide AI grade
        suggestions.
      </Typography>
      {visibleCriteria.map((item, index) => (
        <Stack
          key={index}
          spacing={1}
          sx={{ bgcolor: 'background.default', borderRadius: '14px', p: 2 }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <TextField
              label={`Criterion ${index + 1}`}
              value={item.name}
              onChange={event => update(index, { name: event.target.value })}
              slotProps={{ htmlInput: { maxLength: limits.column } }}
              fullWidth
              disabled={disabled}
            />
            {layout.mode === 'numeric' && (
              <TextField
                label="Max mark"
                value={item.max}
                onChange={event => update(index, { max: event.target.value })}
                slotProps={{
                  htmlInput: { inputMode: 'decimal', maxLength: 10 },
                }}
                sx={{ width: 112, flexShrink: 0 }}
                disabled={disabled}
              />
            )}
            <IconButton
              aria-label={`Remove criterion ${index + 1}`}
              onClick={() => onChange(criteria.filter((_, i) => i !== index))}
              disabled={disabled || !criteria.length}
            >
              <TrashIcon fontSize="small" />
            </IconButton>
          </Stack>
          <TextField
            label={`Criterion ${index + 1} description (optional)`}
            value={item.description ?? ''}
            onChange={event =>
              update(index, { description: event.target.value })
            }
            slotProps={{
              htmlInput: { maxLength: limits.criterionDescription },
            }}
            multiline
            minRows={2}
            fullWidth
            disabled={disabled}
          />
        </Stack>
      ))}
      <Button
        variant="outlined"
        onClick={() => onChange([...visibleCriteria, blankCriterion])}
        disabled={disabled || visibleCriteria.length >= limits.rows}
        sx={{ alignSelf: 'flex-start' }}
      >
        Add Criterion
      </Button>
    </Stack>
  )
}

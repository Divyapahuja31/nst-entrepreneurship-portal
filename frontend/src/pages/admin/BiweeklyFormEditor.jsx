import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
  Checkbox,
} from '@mui/material'
import {
  defaultBiweeklyForm,
  FIELD_TYPES,
  BUILTIN_FIELDS,
  validateForm,
} from '@nst/shared/biweeklyForm.js'
import { api } from '../../api/client'
import toError from '../../api/toError'

const labels = {
  text: 'Short answer',
  textarea: 'Long answer',
  number: 'Number',
  date: 'Date',
  select: 'Dropdown',
  checkbox: 'Checkbox',
  heading: 'Heading',
  paragraph: 'Text block',
  url: 'Web link',
}
export function FormFields({
  definition,
  answers,
  onChange,
  disabled = false,
}) {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h6">{definition.title}</Typography>
        <Typography
          color="text.secondary"
          sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
        >
          {definition.description}
        </Typography>
      </Box>
      {definition.blocks.map(b => {
        const value = answers[b.id] ?? (b.type === 'checkbox' ? false : '')
        if (b.type === 'heading' || b.type === 'paragraph')
          return (
            <Box
              key={b.id}
              sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}
            >
              <Typography variant={b.type === 'heading' ? 'h6' : 'body1'}>
                {b.label}
              </Typography>
              {b.description && (
                <Typography color="text.secondary">{b.description}</Typography>
              )}
            </Box>
          )
        if (b.type === 'checkbox')
          return (
            <Box key={b.id}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={value === true}
                    disabled={disabled}
                    onChange={e => onChange(b.id, e.target.checked)}
                  />
                }
                label={b.label + (b.required ? ' *' : '')}
              />
              {b.description && (
                <Typography variant="body2" color="text.secondary">
                  {b.description}
                </Typography>
              )}
            </Box>
          )
        return (
          <TextField
            key={b.id}
            fullWidth
            label={b.label}
            helperText={b.description}
            required={b.required}
            value={value}
            disabled={disabled}
            multiline={b.type === 'textarea'}
            minRows={b.type === 'textarea' ? 3 : undefined}
            select={b.type === 'select'}
            type={['number', 'date', 'url'].includes(b.type) ? b.type : 'text'}
            slotProps={{
              inputLabel: { shrink: b.type === 'date' || undefined },
              htmlInput: {
                min: b.type === 'number' ? 0 : undefined,
                maxLength: 10000,
              },
            }}
            onChange={e =>
              onChange(
                b.id,
                b.type === 'number' && e.target.value !== ''
                  ? Number(e.target.value)
                  : e.target.value
              )
            }
          >
            {b.type === 'select'
              ? [
                  <MenuItem key="empty" value="">
                    Choose an option
                  </MenuItem>,
                  ...b.options.map(o => (
                    <MenuItem key={o} value={o}>
                      {o}
                    </MenuItem>
                  )),
                ]
              : null}
          </TextField>
        )
      })}
    </Stack>
  )
}

export default function BiweeklyFormEditor({
  ventureId,
  form,
  onClose,
  onSaved,
}) {
  const [definition, setDefinition] = useState(() =>
    structuredClone(form?.definition ?? defaultBiweeklyForm())
  )
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const update = (index, patch) =>
    setDefinition(d => ({
      ...d,
      blocks: d.blocks.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    }))
  const move = (index, direction) =>
    setDefinition(d => {
      const blocks = [...d.blocks]
      ;[blocks[index], blocks[index + direction]] = [
        blocks[index + direction],
        blocks[index],
      ]
      return { ...d, blocks }
    })
  const save = async () => {
    const invalid = validateForm(definition)
    if (invalid) {
      setError(invalid)
      return
    }
    setSaving(true)
    setError('')
    try {
      const { data } = await api.put('/biweekly/form', {
        ventureId,
        revision: form?.revision ?? 0,
        definition,
      })
      onSaved(data.form)
    } catch (e) {
      setError(toError(e).error)
    } finally {
      setSaving(false)
    }
  }
  return (
    <Dialog open fullWidth maxWidth="md" onClose={saving ? undefined : onClose}>
      <DialogTitle>Edit Startup Report Form</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          <Alert severity="info">
            Changes apply to reports this startup has not started yet. Existing
            drafts and submitted reports keep their original form.
          </Alert>
          {error && <Alert severity="error">{error}</Alert>}
          <FormControlLabel
            control={
              <Switch
                checked={preview}
                onChange={e => setPreview(e.target.checked)}
              />
            }
            label="Preview Student Form"
          />
          {preview ? (
            <FormFields
              definition={definition}
              answers={{}}
              onChange={() => {}}
              disabled
            />
          ) : (
            <>
              <TextField
                label="Form title"
                value={definition.title}
                onChange={e =>
                  setDefinition({ ...definition, title: e.target.value })
                }
              />
              <TextField
                label="Introduction"
                multiline
                minRows={2}
                value={definition.description}
                onChange={e =>
                  setDefinition({ ...definition, description: e.target.value })
                }
              />
              {definition.blocks.map((b, i) => (
                <Box
                  key={b.id}
                  sx={{
                    bgcolor: 'background.default',
                    borderRadius: 3,
                    p: { xs: 2, sm: 3 },
                  }}
                >
                  <Stack spacing={2}>
                    <Typography variant="subtitle2">Block {i + 1}</Typography>
                    <TextField
                      label="Block type"
                      select
                      value={b.type}
                      disabled={!!BUILTIN_FIELDS[b.id]}
                      onChange={e =>
                        update(i, {
                          type: e.target.value,
                          options:
                            e.target.value === 'select' ? ['Option 1'] : [],
                        })
                      }
                    >
                      {FIELD_TYPES.map(t => (
                        <MenuItem value={t} key={t}>
                          {labels[t]}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label={
                        ['heading', 'paragraph'].includes(b.type)
                          ? 'Text'
                          : 'Question'
                      }
                      multiline
                      value={b.label}
                      onChange={e => update(i, { label: e.target.value })}
                    />
                    <TextField
                      label="Description"
                      multiline
                      value={b.description}
                      onChange={e => update(i, { description: e.target.value })}
                    />
                    {b.type === 'select' && (
                      <TextField
                        label="Options (one per line)"
                        multiline
                        minRows={3}
                        value={b.options.join('\n')}
                        onChange={e =>
                          update(i, { options: e.target.value.split('\n') })
                        }
                      />
                    )}
                    {!['heading', 'paragraph'].includes(b.type) && (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={b.required}
                            onChange={e =>
                              update(i, { required: e.target.checked })
                            }
                          />
                        }
                        label="Required"
                      />
                    )}
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      sx={{ flexWrap: 'wrap' }}
                    >
                      <Button
                        variant="outlined"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                      >
                        Move Up
                      </Button>
                      <Button
                        variant="outlined"
                        disabled={i === definition.blocks.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        Move Down
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() =>
                          setDefinition({
                            ...definition,
                            blocks: definition.blocks.filter((_, j) => i !== j),
                          })
                        }
                      >
                        Remove Block
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              ))}
              <Button
                variant="outlined"
                disabled={definition.blocks.length >= 60}
                onClick={() =>
                  setDefinition({
                    ...definition,
                    blocks: [
                      ...definition.blocks,
                      {
                        id: 'q_' + crypto.randomUUID().replaceAll('-', ''),
                        label: 'New question',
                        description: '',
                        type: 'text',
                        required: false,
                        options: [],
                      },
                    ],
                  })
                }
              >
                Add Block
              </Button>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" disabled={saving} onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" loading={saving} onClick={save}>
          Save Form
        </Button>
      </DialogActions>
    </Dialog>
  )
}

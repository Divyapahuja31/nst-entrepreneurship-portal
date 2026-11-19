import { useState } from 'react'
import { useLoaderData, useNavigate } from 'react-router'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  REPORT_CARD_LIMITS as limits,
  gradeLayoutError,
} from '@nst/shared/reportCards.js'
import { createTemplate, updateTemplateCriteria } from '../../api/reportCards'
import PageHeader from '../../components/PageHeader'
import SectionCard from '../../components/SectionCard'
import GradeLayoutFields from '../../components/GradeLayoutFields'
import TemplateCriteriaFields from '../../components/TemplateCriteriaFields'
import { newGradeLayout } from '../../components/gradeLayout'

function TemplateDialog({ template, onClose, onSaved }) {
  const [name, setName] = useState(template?.name ?? '')
  const [layout, setLayout] = useState(
    () => template?.layout ?? newGradeLayout()
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(event) {
    event.preventDefault()
    const subjects = layout.subjects?.filter(
      item =>
        item.name.trim() ||
        item.description?.trim() ||
        (layout.mode === 'numeric' && Number(item.max) !== 100)
    )
    const templateLayout = { ...layout, subjects }
    const problem = gradeLayoutError(templateLayout)
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    setError('')
    const result = template
      ? await updateTemplateCriteria(template._id, {
          subjects: subjects ?? [],
          updatedAt: template.updatedAt ?? null,
        })
      : await createTemplate({ name, layout: templateLayout })
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onSaved(result.template)
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="md">
      <form onSubmit={save}>
        <DialogTitle>
          {template ? 'Edit Template Criteria' : 'New Template'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {template ? (
              <Typography variant="body2" color="text.secondary">
                {template.name} · Changes apply to new report cards.
              </Typography>
            ) : (
              <TextField
                label="Template name"
                autoFocus
                required
                value={name}
                onChange={event => setName(event.target.value)}
                slotProps={{ htmlInput: { maxLength: limits.title } }}
              />
            )}
            <TemplateCriteriaFields
              layout={layout}
              onChange={subjects =>
                setLayout(current => ({ ...current, subjects }))
              }
              disabled={saving}
            />
            {!template && (
              <GradeLayoutFields
                layout={layout}
                onChange={setLayout}
                disabled={saving}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" loading={saving}>
            Save Template
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default function PageReportCards() {
  const data = useLoaderData()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState(data.templates)
  const [student, setStudent] = useState(null)
  const [editing, setEditing] = useState(null)

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto' }}>
      <PageHeader title="Report Cards" />
      <Stack spacing={3}>
        <SectionCard title="Find a student">
          <Stack
            spacing={2}
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ sm: 'center' }}
          >
            <Autocomplete
              fullWidth
              options={data.students}
              value={student}
              onChange={(_event, value) => setStudent(value)}
              getOptionLabel={option => `${option.username} (${option.email})`}
              getOptionKey={option => option._id}
              isOptionEqualToValue={(option, value) => option._id === value._id}
              renderInput={params => (
                <TextField {...params} label="Student name or email" />
              )}
              noOptionsText="No students found"
            />
            <Button
              variant="contained"
              disabled={!student}
              onClick={() => navigate(`/admin/report-cards/${student._id}`)}
              sx={{ flexShrink: 0 }}
            >
              Open Report Card
            </Button>
          </Stack>
        </SectionCard>
        <SectionCard
          title="Templates"
          action={
            <Button variant="outlined" onClick={() => setEditing({})}>
              New Template
            </Button>
          }
        >
          {templates.length ? (
            <Stack
              component="ul"
              spacing={1.5}
              sx={{ listStyle: 'none', p: 0, m: 0 }}
            >
              {templates.map(template => (
                <Stack
                  key={template._id}
                  component="li"
                  sx={{
                    p: 2,
                    borderRadius: '14px',
                    bgcolor: 'background.default',
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Typography variant="subtitle1">{template.name}</Typography>
                    {template.layout && (
                      <Button
                        size="small"
                        onClick={() => setEditing({ template })}
                      >
                        Edit Criteria
                      </Button>
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {template.layout
                      ? template.layout.terms
                          .map(
                            term =>
                              `${term.name} (${term.assessments.map(item => item.name).join(', ')})`
                          )
                          .join(' · ')
                      : template.columns.join(' · ')}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Create a template to reuse terms and assessments across students.
            </Typography>
          )}
        </SectionCard>
      </Stack>
      {editing && (
        <TemplateDialog
          template={editing.template}
          onClose={() => setEditing(null)}
          onSaved={template => {
            setTemplates(current =>
              editing.template
                ? current.map(item =>
                    item._id === template._id ? template : item
                  )
                : [...current, template]
            )
            setEditing(null)
          }}
        />
      )}
    </Box>
  )
}

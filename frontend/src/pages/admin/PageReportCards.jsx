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
import { createTemplate } from '../../api/reportCards'
import PageHeader from '../../components/PageHeader'
import SectionCard from '../../components/SectionCard'
import GradeLayoutFields from '../../components/GradeLayoutFields'
import { newGradeLayout } from '../../components/gradeLayout'

function TemplateDialog({ onClose, onSaved }) {
  const [name, setName] = useState('')
  const [layout, setLayout] = useState(newGradeLayout)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(event) {
    event.preventDefault()
    const problem = gradeLayoutError(layout)
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    setError('')
    const result = await createTemplate({ name, layout })
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
        <DialogTitle>New Template</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Template name"
              autoFocus
              required
              value={name}
              onChange={event => setName(event.target.value)}
              slotProps={{ htmlInput: { maxLength: limits.title } }}
            />
            <GradeLayoutFields
              layout={layout}
              onChange={setLayout}
              disabled={saving}
            />
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
  const [addingTemplate, setAddingTemplate] = useState(false)

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
            <Button variant="outlined" onClick={() => setAddingTemplate(true)}>
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
                  <Typography variant="subtitle1">{template.name}</Typography>
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
      {addingTemplate && (
        <TemplateDialog
          onClose={() => setAddingTemplate(false)}
          onSaved={template => {
            setTemplates(current => [...current, template])
            setAddingTemplate(false)
          }}
        />
      )}
    </Box>
  )
}

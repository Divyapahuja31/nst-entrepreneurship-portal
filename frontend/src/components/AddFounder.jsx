import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Box from '@mui/material/Box'

import React from 'react'
import { useLoaderData } from 'react-router'

import { createFounder } from '../api/admin'
import PageHeader from './PageHeader'
import SectionCard from './SectionCard'

const textFields = {
  founder: { label: 'Founder name', type: 'text' },
  email: { label: 'Founder email', type: 'email' },
  startup: { label: 'Startup name', type: 'text' },
}

const selectLabels = {
  industry: 'Industry',
  batch: 'Batch',
  stage: 'Stage',
}

function AddFounder() {
  const labelId = React.useId()
  const options = useLoaderData()

  const [saving, setSaving] = React.useState(false)
  const [result, setResult] = React.useState(null)

  const created = result?.created
  const formError = typeof result?.error === 'string' ? result.error : ''
  const fieldErrors = typeof result?.error === 'object' ? result.error : {}

  const handleSubmit = async event => {
    event.preventDefault()

    const form = event.currentTarget
    const payload = Object.fromEntries(new FormData(form))

    setSaving(true)
    setResult(null)

    const response = await createFounder(payload)

    setSaving(false)
    setResult(response)

    if (response.created) {
      form.reset()
    }
  }

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <PageHeader
        breadcrumbs={[
          { label: 'Founders', to: '/admin/founders' },
          { label: 'Add Founder' },
        ]}
        title="Add Founder"
        subtitle="Create a founder and their startup in one step."
      />

      {formError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {formError}
        </Alert>
      )}

      {created && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {created.founder} was added to {created.startup}.
        </Alert>
      )}

      <SectionCard>
        <form onSubmit={handleSubmit}>
          {Object.keys(textFields).map(key => (
            <TextField
              key={key}
              fullWidth
              required
              margin="normal"
              name={key}
              type={textFields[key].type}
              label={textFields[key].label}
              disabled={saving}
              error={Boolean(fieldErrors[key])}
              helperText={fieldErrors[key] ?? ''}
            />
          ))}

          {Object.keys(selectLabels).map(key => (
            <FormControl
              key={key}
              fullWidth
              required
              margin="normal"
              disabled={saving}
              error={Boolean(fieldErrors[key])}
            >
              <InputLabel id={`${labelId}-${key}`}>
                {selectLabels[key]}
              </InputLabel>

              <Select
                labelId={`${labelId}-${key}`}
                label={selectLabels[key]}
                name={key}
                defaultValue=""
              >
                {options[key].map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>

              {fieldErrors[key] && (
                <FormHelperText>{fieldErrors[key]}</FormHelperText>
              )}
            </FormControl>
          ))}

          <Button
            fullWidth
            size="large"
            variant="contained"
            type="submit"
            loading={saving}
            sx={{ mt: 2 }}
          >
            Create Founder
          </Button>
        </form>
      </SectionCard>
    </Box>
  )
}

export default AddFounder

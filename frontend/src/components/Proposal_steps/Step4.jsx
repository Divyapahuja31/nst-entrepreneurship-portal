import { Box, TextField, Typography } from '@mui/material'

import {
  FIELD_LIMITS,
  isValidWebsite,
  normalizeWebsite,
  validateField,
} from '../proposalFormConfig.js'

export default function Step4({ formData, setFormData, errors = {}, setErrors }) {
  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (setErrors && errors[name]) {
      const error = validateField(name, value, { ...formData, [name]: value })
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }))
    }
  }

  const handleBlur = (event) => {
    const { name, value } = event.target

    if (name === 'website') {
      const trimmed = value.trim()
      if (trimmed) {
        if (!isValidWebsite(trimmed)) {
          if (setErrors) {
            setErrors((prev) => ({
              ...prev,
              website:
                'Please enter a valid website URL (e.g. example.com or https://example.com)',
            }))
          }
          return
        }
        const normalized = normalizeWebsite(trimmed)
        setFormData((prev) => ({
          ...prev,
          website: normalized,
        }))
        if (setErrors) {
          setErrors((prev) => ({
            ...prev,
            website: '',
          }))
        }
        return
      }
    }

    if (setErrors) {
      const error = validateField(name, value, formData)
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }))
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Execution & resources
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 4 }}
      >
        Tell us about the resources and commitment behind the startup.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <TextField
          label="Tech stack / tooling"
          name="techStack"
          value={formData.techStack}
          onChange={handleChange}
          onBlur={handleBlur}
          error={Boolean(errors.techStack)}
          helperText={
            errors.techStack ||
            `${formData.techStack?.length || 0} / ${FIELD_LIMITS.techStack.maxChars}`
          }
          inputProps={{ maxLength: FIELD_LIMITS.techStack.maxChars }}
          fullWidth
          required
          multiline
          rows={3}
          placeholder="e.g. React, Node.js, PostgreSQL, AWS"
        />

        <TextField
          label="Capital status"
          name="capitalStatus"
          value={formData.capitalStatus}
          onChange={handleChange}
          onBlur={handleBlur}
          error={Boolean(errors.capitalStatus)}
          helperText={
            errors.capitalStatus ||
            `${formData.capitalStatus?.length || 0} / ${FIELD_LIMITS.capitalStatus.maxChars}`
          }
          inputProps={{ maxLength: FIELD_LIMITS.capitalStatus.maxChars }}
          fullWidth
          required
          placeholder="e.g. Bootstrapped, Grant, Angel, Seed"
        />

        <TextField
          label="Weekly hours committed"
          name="weeklyHours"
          type="number"
          value={formData.weeklyHours}
          onChange={handleChange}
          onBlur={handleBlur}
          error={Boolean(errors.weeklyHours)}
          helperText={errors.weeklyHours || 'Committed hours per week (0–168)'}
          fullWidth
          required
          slotProps={{
            htmlInput: {
              min: FIELD_LIMITS.weeklyHours.min,
              max: FIELD_LIMITS.weeklyHours.max,
            },
          }}
        />

        <TextField
          label="Website"
          name="website"
          value={formData.website}
          onChange={handleChange}
          onBlur={handleBlur}
          error={Boolean(errors.website)}
          helperText={
            errors.website ||
            `${formData.website?.length || 0} / ${FIELD_LIMITS.website.maxChars}`
          }
          inputProps={{ maxLength: FIELD_LIMITS.website.maxChars }}
          fullWidth
          placeholder="https://example.com"
        />
      </Box>
    </Box>
  )
}

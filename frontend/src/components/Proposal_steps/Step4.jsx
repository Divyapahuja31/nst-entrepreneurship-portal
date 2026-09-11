import { Box, TextField, Typography } from '@mui/material'

export default function Step4({ formData, setFormData, errors = {}, setErrors }) {
  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (setErrors && errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
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
          error={Boolean(errors.techStack)}
          helperText={errors.techStack}
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
          error={Boolean(errors.capitalStatus)}
          helperText={errors.capitalStatus}
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
          error={Boolean(errors.weeklyHours)}
          helperText={errors.weeklyHours}
          fullWidth
          required
          slotProps={{
            htmlInput: {
              min: 0,
            },
          }}
        />

        <TextField
          label="Website"
          name="website"
          value={formData.website}
          onChange={handleChange}
          error={Boolean(errors.website)}
          helperText={errors.website}
          fullWidth
          placeholder="https://example.com"
        />
      </Box>
    </Box>
  )
}

import { Box, TextField, Typography } from '@mui/material'

import { FIELD_LIMITS, validateField } from '../proposalFormConfig.js'

export default function Step3({ formData, setFormData, errors = {}, setErrors }) {
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
        Assumptions & risks
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 4 }}
      >
        Be honest. These become checkpoints for your reviews.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {[1, 2, 3].map((num) => (
          <TextField
            key={`assumption${num}`}
            label={`Assumption ${num}`}
            name={`assumption${num}`}
            value={formData[`assumption${num}`]}
            onChange={handleChange}
            onBlur={handleBlur}
            error={Boolean(errors[`assumption${num}`])}
            helperText={
              errors[`assumption${num}`] ||
              `${formData[`assumption${num}`]?.length || 0} / ${FIELD_LIMITS[`assumption${num}`].maxChars}`
            }
            inputProps={{ maxLength: FIELD_LIMITS[`assumption${num}`].maxChars }}
            fullWidth
            required
          />
        ))}

        {[1, 2, 3].map((num) => (
          <TextField
            key={`risk${num}`}
            label={`Risk ${num}`}
            name={`risk${num}`}
            value={formData[`risk${num}`]}
            onChange={handleChange}
            onBlur={handleBlur}
            error={Boolean(errors[`risk${num}`])}
            helperText={
              errors[`risk${num}`] ||
              `${formData[`risk${num}`]?.length || 0} / ${FIELD_LIMITS[`risk${num}`].maxChars}`
            }
            inputProps={{ maxLength: FIELD_LIMITS[`risk${num}`].maxChars }}
            fullWidth
            required
          />
        ))}

        <TextField
          label="Six-month goals"
          name="sixMonthGoals"
          value={formData.sixMonthGoals}
          onChange={handleChange}
          onBlur={handleBlur}
          error={Boolean(errors.sixMonthGoals)}
          helperText={
            errors.sixMonthGoals ||
            `${formData.sixMonthGoals?.length || 0} / ${FIELD_LIMITS.sixMonthGoals.maxChars}`
          }
          inputProps={{ maxLength: FIELD_LIMITS.sixMonthGoals.maxChars }}
          fullWidth
          required
          multiline
          rows={4}
          placeholder="What must be true by month 6 for this to be a success?"
        />
      </Box>
    </Box>
  )
}

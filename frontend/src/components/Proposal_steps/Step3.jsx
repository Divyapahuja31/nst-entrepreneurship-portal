import { Box, TextField, Typography } from '@mui/material'

export default function Step3({ formData, setFormData, errors = {}, setErrors }) {
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
        <TextField
          label="Assumption 1"
          name="assumption1"
          value={formData.assumption1}
          onChange={handleChange}
          error={Boolean(errors.assumption1)}
          helperText={errors.assumption1}
          fullWidth
          required
        />

        <TextField
          label="Assumption 2"
          name="assumption2"
          value={formData.assumption2}
          onChange={handleChange}
          error={Boolean(errors.assumption2)}
          helperText={errors.assumption2}
          fullWidth
          required
        />

        <TextField
          label="Assumption 3"
          name="assumption3"
          value={formData.assumption3}
          onChange={handleChange}
          error={Boolean(errors.assumption3)}
          helperText={errors.assumption3}
          fullWidth
          required
        />

        <TextField
          label="Risk 1"
          name="risk1"
          value={formData.risk1}
          onChange={handleChange}
          error={Boolean(errors.risk1)}
          helperText={errors.risk1}
          fullWidth
          required
        />

        <TextField
          label="Risk 2"
          name="risk2"
          value={formData.risk2}
          onChange={handleChange}
          error={Boolean(errors.risk2)}
          helperText={errors.risk2}
          fullWidth
          required
        />

        <TextField
          label="Risk 3"
          name="risk3"
          value={formData.risk3}
          onChange={handleChange}
          error={Boolean(errors.risk3)}
          helperText={errors.risk3}
          fullWidth
          required
        />

        <TextField
          label="Six-month goals"
          name="sixMonthGoals"
          value={formData.sixMonthGoals}
          onChange={handleChange}
          error={Boolean(errors.sixMonthGoals)}
          helperText={errors.sixMonthGoals}
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

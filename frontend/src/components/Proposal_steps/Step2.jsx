import { useEffect, useState } from 'react'

import {
  Box,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'

import { getStages } from '../../api/stage'

export default function Step2({ formData, setFormData, errors = {}, setErrors }) {
  const [stages, setStages] = useState([])
  const [loadingStages, setLoadingStages] = useState(true)

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const data = await getStages()

        setStages(data)
      } catch (error) {
        console.error('Failed to fetch stages:', error)
      } finally {
        setLoadingStages(false)
      }
    }

    fetchStages()
  }, [])

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
      <Typography
        variant="h5"
        fontWeight={600}
        gutterBottom
      >
        Business
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 4 }}
      >
        Where are you today?
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <TextField
          select
          label="Current stage"
          name="stage"
          value={formData.stage}
          onChange={handleChange}
          error={Boolean(errors.stage)}
          helperText={errors.stage}
          fullWidth
          required
          disabled={loadingStages}
        >
          {stages.map((stage) => (
            <MenuItem
              key={stage.key}
              value={stage.key}
            >
              {stage.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Current traction"
          name="currentTraction"
          value={formData.currentTraction}
          onChange={handleChange}
          error={Boolean(errors.currentTraction)}
          helperText={errors.currentTraction}
          fullWidth
          required
          multiline
          rows={3}
          placeholder="Users, revenue, LOIs, waitlist, interviews done. Numbers > adjectives."
        />

        <TextField
          label="Business model"
          name="businessModel"
          value={formData.businessModel}
          onChange={handleChange}
          error={Boolean(errors.businessModel)}
          helperText={errors.businessModel}
          fullWidth
          required
          multiline
          rows={3}
          placeholder="How does money flow? Who pays what, when?"
        />
      </Box>
    </Box>
  )
}

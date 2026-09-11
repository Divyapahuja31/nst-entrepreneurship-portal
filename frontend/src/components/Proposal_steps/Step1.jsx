import { useEffect, useState } from 'react'
import {
  Autocomplete,
  Box,
  TextField,
  Typography,
} from '@mui/material'

import { getIndustries } from '../../api/industry'

export default function Step1({ formData, setFormData, errors = {}, setErrors }) {
  const [industries, setIndustries] = useState([])
  const [loadingIndustries, setLoadingIndustries] = useState(true)

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const data = await getIndustries()
        setIndustries(data)
      } catch (error) {
        console.error('Failed to fetch industries:', error)
      } finally {
        setLoadingIndustries(false)
      }
    }

    fetchIndustries()
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

  const handleIndustryChange = (_, value) => {
    if (setErrors && errors.industry) {
      setErrors((prev) => ({
        ...prev,
        industry: '',
      }))
    }

    if (!value) {
      setFormData((prev) => ({
        ...prev,
        industry: '',
        industryName: '',
      }))

      return
    }

    // Existing industry
    if (!value.isNew) {
      setFormData((prev) => ({
        ...prev,
        industry: value._id,
        industryName: '',
      }))

      return
    }

    // New industry - create only after proposal approval
    setFormData((prev) => ({
      ...prev,
      industry: '',
      industryName: value.name,
    }))
  }

  return (
    <Box>
      <Typography
        variant="h5"
        fontWeight={600}
        gutterBottom
      >
        Startup
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 4 }}
      >
        Tell us about your startup and the problem you're solving.
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <TextField
          label="Startup name"
          name="startupName"
          value={formData.startupName}
          onChange={handleChange}
          error={Boolean(errors.startupName)}
          helperText={errors.startupName}
          fullWidth
          required
          placeholder="e.g. CampusPay"
        />

        <TextField
          label="Problem you're solving"
          name="description"
          value={formData.description}
          onChange={handleChange}
          error={Boolean(errors.description)}
          helperText={errors.description}
          fullWidth
          required
          multiline
          rows={4}
          placeholder="Whose life is worse today, and how?"
        />

        <TextField
          label="Target customer"
          name="targetCustomer"
          value={formData.targetCustomer}
          onChange={handleChange}
          error={Boolean(errors.targetCustomer)}
          helperText={errors.targetCustomer}
          fullWidth
          required
          multiline
          rows={3}
          placeholder="Age, role, geography, buying context. Be concrete."
        />

        <Autocomplete
          options={industries}
          loading={loadingIndustries}
          value={
            industries.find(
              (industry) =>
                industry._id === formData.industry
            ) ||
            (formData.industryName
              ? {
                  name: formData.industryName,
                  isNew: true,
                }
              : null)
          }
          getOptionLabel={(option) => option.name || ''}
          onChange={handleIndustryChange}
          filterOptions={(options, params) => {
            const inputValue = params.inputValue.trim()

            const filtered = options.filter((option) =>
              option.name
                .toLowerCase()
                .includes(inputValue.toLowerCase())
            )

            const exists = options.some(
              (option) =>
                option.name.toLowerCase() ===
                inputValue.toLowerCase()
            )

            if (inputValue && !exists) {
              filtered.push({
                name: inputValue,
                isNew: true,
              })
            }

            return filtered
          }}
          getOptionKey={(option) =>
            option._id || `new-${option.name}`
          }
          renderOption={(props, option) => {
            const { key, ...restProps } = props

            return (
              <li key={key} {...restProps}>
                {option.isNew
                  ? `Create "${option.name}"`
                  : option.name}
              </li>
            )
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Industry"
              required
              error={Boolean(errors.industry)}
              helperText={errors.industry}
              placeholder="Select or create an industry"
            />
          )}
        />
      </Box>
    </Box>
  )
}

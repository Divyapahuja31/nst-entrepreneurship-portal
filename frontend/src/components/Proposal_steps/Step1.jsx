import { useEffect, useState } from 'react'
import {
  Autocomplete,
  Box,
  TextField,
  Typography,
} from '@mui/material'

import { getIndustries } from '../../api/industry'
import {
  FIELD_LIMITS,
  validateField,
} from '../proposalFormConfig.js'

export default function Step1({ formData, setFormData, errors = {}, setErrors }) {
  const [industries, setIndustries] = useState([])
  const [loadingIndustries, setLoadingIndustries] = useState(true)

  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const data = await getIndustries()
        setIndustries(data)
        setFormData((prev) => {
          if (prev.industry && !prev.industryName) {
            const match = data.find((i) => i._id === prev.industry)
            if (match) return { ...prev, industryName: match.name }
          }
          return prev
        })
      } catch (error) {
        console.error('Failed to fetch industries:', error)
      } finally {
        setLoadingIndustries(false)
      }
    }

    fetchIndustries()
  }, [setFormData])

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

    setFormData((prev) => ({
      ...prev,
      industry: value.isNew ? '' : value._id,
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
          onBlur={handleBlur}
          error={Boolean(errors.startupName)}
          helperText={
            errors.startupName ||
            `${formData.startupName?.length || 0} / ${FIELD_LIMITS.startupName.maxChars}`
          }
          inputProps={{ maxLength: FIELD_LIMITS.startupName.maxChars }}
          fullWidth
          required
          placeholder="e.g. CampusPay"
        />

        <TextField
          label="Problem you're solving"
          name="description"
          value={formData.description}
          onChange={handleChange}
          onBlur={handleBlur}
          error={Boolean(errors.description)}
          helperText={
            errors.description ||
            `${formData.description?.length || 0} / ${FIELD_LIMITS.description.maxChars}`
          }
          inputProps={{ maxLength: FIELD_LIMITS.description.maxChars }}
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
          onBlur={handleBlur}
          error={Boolean(errors.targetCustomer)}
          helperText={
            errors.targetCustomer ||
            `${formData.targetCustomer?.length || 0} / ${FIELD_LIMITS.targetCustomer.maxChars}`
          }
          inputProps={{ maxLength: FIELD_LIMITS.targetCustomer.maxChars }}
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
              inputProps={{
                ...params.inputProps,
                maxLength: FIELD_LIMITS.industryName.maxChars,
              }}
            />
          )}
        />
      </Box>
    </Box>
  )
}

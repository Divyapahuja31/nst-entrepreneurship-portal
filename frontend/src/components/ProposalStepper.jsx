import { useState } from 'react'

import {
  Box,
  Button,
  CircularProgress,
  Step,
  StepLabel,
  Stepper,
} from '@mui/material'

import {
  STEP_FIELDS,
  validateForm,
  validateStep,
} from './proposalFormConfig.js'

const getFirstInvalidStep = errs => {
  for (let i = 0; i < STEP_FIELDS.length; i++) {
    if (STEP_FIELDS[i].some(field => errs[field])) {
      return i
    }
  }
  return -1
}

export default function ProposalStepper({
  steps,
  initialData,
  onSubmit,
  isSubmitting = false,
}) {
  const [activeStep, setActiveStep] = useState(0)
  const [formData, setFormData] = useState(initialData)
  const [errors, setErrors] = useState({})

  const CurrentStep = steps[activeStep].component

  const isLastStep = activeStep === steps.length - 1

  const handleNext = () => {
    if (isLastStep) {
      return
    }

    const stepErrors = validateStep(activeStep, formData)
    const currentFields = STEP_FIELDS[activeStep] || []

    if (Object.keys(stepErrors).length > 0) {
      setErrors(prev => {
        const nextErrors = { ...prev }
        for (const field of currentFields) {
          if (stepErrors[field]) {
            nextErrors[field] = stepErrors[field]
          } else {
            delete nextErrors[field]
          }
        }
        return nextErrors
      })
      return
    }

    setErrors(prev => {
      const nextErrors = { ...prev }
      for (const field of currentFields) {
        delete nextErrors[field]
      }
      return nextErrors
    })

    setActiveStep(prev => prev + 1)
  }

  const handlePrevious = () => {
    if (activeStep > 0 && !isSubmitting) {
      setActiveStep(prev => prev - 1)
    }
  }

  const handleSubmit = () => {
    if (isSubmitting) {
      return
    }

    const validationErrors = validateForm(formData)

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      const firstInvalid = getFirstInvalidStep(validationErrors)
      if (firstInvalid !== -1) {
        setActiveStep(firstInvalid)
      }
      return
    }

    setErrors({})
    onSubmit(formData)
  }

  return (
    <Box>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((step, index) => (
          <Step key={index}>
            <StepLabel>Step {index + 1}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ mt: 5 }}>
        <CurrentStep
          formData={formData}
          setFormData={setFormData}
          errors={errors}
          setErrors={setErrors}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mt: 5,
        }}
      >
        <Button
          variant="outlined"
          disabled={activeStep === 0 || isSubmitting}
          onClick={handlePrevious}
        >
          Previous
        </Button>

        {isLastStep ? (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSubmitting}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={18} color="inherit" />
              ) : null
            }
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={isSubmitting}
          >
            Next
          </Button>
        )}
      </Box>
    </Box>
  )
}

import { useState } from 'react'

import {
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material'

const STEP_FIELDS = [
  ['startupName', 'description', 'targetCustomer', 'industry'],
  ['stage', 'currentTraction', 'businessModel'],
  ['assumption1', 'assumption2', 'assumption3', 'risk1', 'risk2', 'risk3', 'sixMonthGoals'],
  ['techStack', 'capitalStatus', 'weeklyHours', 'website'],
]

const validateForm = (data) => {
  const errs = {}

  // Step 1
  if (!data.startupName?.trim()) {
    errs.startupName = 'Startup name is required'
  }
  if (!data.description?.trim()) {
    errs.description = 'Problem description is required'
  }
  if (!data.targetCustomer?.trim()) {
    errs.targetCustomer = 'Target customer is required'
  }
  if (!data.industry && !data.industryName?.trim()) {
    errs.industry = 'Industry is required'
  }

  // Step 2
  if (!data.stage) {
    errs.stage = 'Current stage is required'
  }
  if (!data.currentTraction?.trim()) {
    errs.currentTraction = 'Current traction is required'
  }
  if (!data.businessModel?.trim()) {
    errs.businessModel = 'Business model is required'
  }

  // Step 3
  if (!data.assumption1?.trim()) {
    errs.assumption1 = 'Assumption 1 is required'
  }
  if (!data.assumption2?.trim()) {
    errs.assumption2 = 'Assumption 2 is required'
  }
  if (!data.assumption3?.trim()) {
    errs.assumption3 = 'Assumption 3 is required'
  }
  if (!data.risk1?.trim()) {
    errs.risk1 = 'Risk 1 is required'
  }
  if (!data.risk2?.trim()) {
    errs.risk2 = 'Risk 2 is required'
  }
  if (!data.risk3?.trim()) {
    errs.risk3 = 'Risk 3 is required'
  }
  if (!data.sixMonthGoals?.trim()) {
    errs.sixMonthGoals = 'Six-month goals are required'
  }

  // Step 4
  if (!data.techStack?.trim()) {
    errs.techStack = 'Tech stack is required'
  }
  if (!data.capitalStatus?.trim()) {
    errs.capitalStatus = 'Capital status is required'
  }
  if (
    data.weeklyHours === '' ||
    data.weeklyHours === null ||
    data.weeklyHours === undefined ||
    isNaN(Number(data.weeklyHours)) ||
    Number(data.weeklyHours) < 0
  ) {
    errs.weeklyHours = 'Weekly hours must be a valid non-negative number'
  }
  if (data.website?.trim()) {
    const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/
    if (!urlPattern.test(data.website.trim())) {
      errs.website = 'Please enter a valid website URL'
    }
  }

  return errs
}

const getFirstInvalidStep = (errs) => {
  for (let i = 0; i < STEP_FIELDS.length; i++) {
    if (STEP_FIELDS[i].some((field) => errs[field])) {
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

  const progress = ((activeStep + 1) / steps.length) * 100

  const handleNext = () => {
    if (!isLastStep) {
      setActiveStep((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (activeStep > 0 && !isSubmitting) {
      setActiveStep((prev) => prev - 1)
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
    <Paper
      elevation={2}
      sx={{
        maxWidth: 900,
        mx: 'auto',
        p: 4,
        borderRadius: 3,
      }}
    >
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((step, index) => (
          <Step key={index}>
            <StepLabel>Step {index + 1}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ mt: 3 }}>
        <LinearProgress variant="determinate" value={progress} />

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1 }}
        >
          Step {activeStep + 1} of {steps.length}
        </Typography>
      </Box>

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
    </Paper>
  )
}

import { useState } from "react";

import {
  Box,
  Button,
  LinearProgress,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from "@mui/material";

export default function ProposalStepper({
  steps,
  initialData,
  onSubmit,
}) {
  const [activeStep, setActiveStep] = useState(0);

  const [formData, setFormData] = useState(
    initialData
  );

  const CurrentStep = steps[activeStep].component;

  const isLastStep =
    activeStep === steps.length - 1;

  const progress =
    ((activeStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (!isLastStep) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <Paper
      elevation={2}
      sx={{
        maxWidth: 900,
        mx: "auto",
        p: 4,
        borderRadius: 3,
      }}
    >
      <Stepper
        activeStep={activeStep}
        alternativeLabel
      >
        {steps.map((step, index) => (
          <Step key={index}>
            <StepLabel>
              Step {index + 1}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ mt: 3 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
        />

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
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mt: 5,
        }}
      >
        <Button
          variant="outlined"
          disabled={activeStep === 0}
          onClick={handlePrevious}
        >
          Previous
        </Button>

        {isLastStep ? (
          <Button
            variant="contained"
            onClick={handleSubmit}
          >
            Submit
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
          >
            Next
          </Button>
        )}
      </Box>
    </Paper>
  );
}

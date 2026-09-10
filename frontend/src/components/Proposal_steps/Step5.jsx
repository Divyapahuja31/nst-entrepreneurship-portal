import {
  Box,
  Typography,
} from "@mui/material";

export default function Step5({ formData }) {
  return (
    <Box>
      <Typography variant="h4">
        Review & submit
      </Typography>

      <Typography
        color="text.secondary"
        sx={{ mb: 4 }}
      >
        Once submitted, this becomes the baseline your
        bi-weekly reviews are scored against.
      </Typography>

      <Typography variant="h6">
        One-liner
      </Typography>

      <Typography sx={{ mb: 3 }}>
        {formData.oneLiner}
      </Typography>

      <Typography variant="h6">
        Stage
      </Typography>

      <Typography sx={{ mb: 3 }}>
        {formData.currentStage}
      </Typography>

      <Typography variant="h6">
        Target customer
      </Typography>

      <Typography sx={{ mb: 3 }}>
        {formData.targetCustomer}
      </Typography>

      <Typography variant="h6">
        Traction
      </Typography>

      <Typography sx={{ mb: 3 }}>
        {formData.currentTraction}
      </Typography>

      <Typography variant="h6">
        Six-month goals
      </Typography>

      <Typography sx={{ mb: 3 }}>
        {formData.sixMonthGoals}
      </Typography>

      <Typography variant="h6">
        Weekly hours
      </Typography>

      <Typography>
        {formData.weeklyHours}
      </Typography>
    </Box>
  );
}

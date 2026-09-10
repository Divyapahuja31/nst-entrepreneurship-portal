import { Box, TextField, Typography } from "@mui/material";

export default function Step3({ formData, setFormData }) {
  return (
    <Box>
      <Typography variant="h4">
        Assumptions & risks
      </Typography>

      <Typography color="text.secondary">
        What are you testing and what could kill the startup?
      </Typography>

      <TextField
        fullWidth
        multiline
        rows={6}
        label="Top 3 assumptions you'll test in the next 6 months"
        value={formData.assumptions}
        onChange={(e) =>
          setFormData({
            ...formData,
            assumptions: e.target.value,
          })
        }
        sx={{ mt: 3 }}
      />

      <TextField
        fullWidth
        multiline
        rows={6}
        label="Top 3 risks that could kill this"
        value={formData.risks}
        onChange={(e) =>
          setFormData({
            ...formData,
            risks: e.target.value,
          })
        }
        sx={{ mt: 3 }}
      />

      <TextField
        fullWidth
        multiline
        rows={6}
        label="Six-month goals"
        value={formData.sixMonthGoals}
        onChange={(e) =>
          setFormData({
            ...formData,
            sixMonthGoals: e.target.value,
          })
        }
        sx={{ mt: 3 }}
      />
    </Box>
  );
}

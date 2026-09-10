import { TextField, Box, Typography } from "@mui/material";

export default function Step1({ formData, setFormData }) {
  return (
    <Box>
      <Typography variant="h4">
        The one-liner
      </Typography>

      <Typography color="text.secondary">
        Tell us about your startup in simple terms.
      </Typography>

      <TextField
        fullWidth
        label="Startup one-liner"
        value={formData.oneLiner}
        onChange={(e) =>
          setFormData({
            ...formData,
            oneLiner: e.target.value,
          })
        }
        inputProps={{ maxLength: 140 }}
        sx={{ mt: 3 }}
      />

      <TextField
        fullWidth
        multiline
        rows={4}
        label="The problem you're solving"
        value={formData.problem}
        onChange={(e) =>
          setFormData({
            ...formData,
            problem: e.target.value,
          })
        }
        sx={{ mt: 3 }}
      />

      <TextField
        fullWidth
        multiline
        rows={4}
        label="Target customer (who, specifically)"
        value={formData.targetCustomer}
        onChange={(e) =>
          setFormData({
            ...formData,
            targetCustomer: e.target.value,
          })
        }
        sx={{ mt: 3 }}
      />
    </Box>
  );
}
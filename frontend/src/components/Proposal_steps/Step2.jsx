import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
} from "@mui/material";

export default function Step2({ formData, setFormData }) {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Temporary mock API
    async function fetchStages() {
      const data = [
        {
          id: "discovery",
          name: "Discovery",
          description:
            "Talking to users, validating problem",
        },
        {
          id: "validation",
          name: "Validation",
          description:
            "Testing the solution with real users",
        },
        {
          id: "traction",
          name: "Traction",
          description:
            "Getting consistent users or revenue",
        },
        {
          id: "growth",
          name: "Growth",
          description:
            "Scaling the business",
        },
      ];

      setStages(data);
      setLoading(false);
    }

    fetchStages();
  }, []);

  return (
    <Box>
      <Typography variant="h4">
        Where you are today
      </Typography>

      <Typography color="text.secondary">
        Help us understand your current stage.
      </Typography>

      <TextField
        select
        fullWidth
        label="Current stage"
        value={formData.currentStage}
        onChange={(e) =>
          setFormData({
            ...formData,
            currentStage: e.target.value,
          })
        }
        disabled={loading}
        sx={{ mt: 3 }}
      >
        {stages.map((stage) => (
          <MenuItem
            key={stage.id}
            value={stage.id}
          >
            {stage.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        fullWidth
        multiline
        rows={4}
        label="Current traction"
        value={formData.currentTraction}
        onChange={(e) =>
          setFormData({
            ...formData,
            currentTraction: e.target.value,
          })
        }
        sx={{ mt: 3 }}
      />

      <TextField
        fullWidth
        multiline
        rows={4}
        label="Business model"
        value={formData.businessModel}
        onChange={(e) =>
          setFormData({
            ...formData,
            businessModel: e.target.value,
          })
        }
        sx={{ mt: 3 }}
      />
    </Box>
  );
}

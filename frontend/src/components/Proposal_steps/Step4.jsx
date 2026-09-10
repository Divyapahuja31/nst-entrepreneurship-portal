import { Box, Grid, TextField, Typography } from "@mui/material";

export default function Step4({ formData, setFormData }) {
  const update = (field, value) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };

  return (
    <Box>
      <Typography variant="h4">
        Team, capital, links
      </Typography>

      <Typography color="text.secondary">
        Tell us about the people and resources behind your startup.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Co-founders (name, role)"
            value={formData.coFounders}
            onChange={(e) =>
              update("coFounders", e.target.value)
            }
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Tech stack / tooling"
            value={formData.techStack}
            onChange={(e) =>
              update("techStack", e.target.value)
            }
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Capital status"
            value={formData.capitalStatus}
            onChange={(e) =>
              update("capitalStatus", e.target.value)
            }
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            type="number"
            label="Weekly hours committed"
            value={formData.weeklyHours}
            onChange={(e) =>
              update("weeklyHours", e.target.value)
            }
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Website"
            value={formData.website}
            onChange={(e) =>
              update("website", e.target.value)
            }
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Demo / product link"
            value={formData.demoLink}
            onChange={(e) =>
              update("demoLink", e.target.value)
            }
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Deck"
            value={formData.deck}
            onChange={(e) =>
              update("deck", e.target.value)
            }
          />
        </Grid>
      </Grid>
    </Box>
  );
}

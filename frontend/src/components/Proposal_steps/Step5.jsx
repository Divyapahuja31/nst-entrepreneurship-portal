import {
  Box,
  Divider,
  Typography,
} from '@mui/material'

export default function Step5({ formData }) {
  return (
    <Box>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Review & submit
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 4 }}
      >
        Once submitted, this becomes the baseline your bi-weekly
        reviews are scored against.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography>
          <strong>Startup name:</strong>{' '}
          {formData.startupName || '-'}
        </Typography>

        <Typography>
          <strong>Problem:</strong>{' '}
          {formData.description || '-'}
        </Typography>

        <Typography>
          <strong>Target customer:</strong>{' '}
          {formData.targetCustomer || '-'}
        </Typography>

        <Typography>
          <strong>Industry:</strong>{' '}
          {formData.industryName || formData.industry || '-'}
        </Typography>

        <Divider />

        <Typography>
          <strong>Stage:</strong>{' '}
          {formData.stage || '-'}
        </Typography>

        <Typography>
          <strong>Traction:</strong>{' '}
          {formData.currentTraction || '-'}
        </Typography>

        <Typography>
          <strong>Business model:</strong>{' '}
          {formData.businessModel || '-'}
        </Typography>

        <Divider />

        <Typography>
          <strong>Assumptions:</strong>
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          {formData.assumption1 && <li>{formData.assumption1}</li>}
          {formData.assumption2 && <li>{formData.assumption2}</li>}
          {formData.assumption3 && <li>{formData.assumption3}</li>}
        </Box>

        <Typography>
          <strong>Risks:</strong>
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          {formData.risk1 && <li>{formData.risk1}</li>}
          {formData.risk2 && <li>{formData.risk2}</li>}
          {formData.risk3 && <li>{formData.risk3}</li>}
        </Box>

        <Typography>
          <strong>Six-month goals:</strong>{' '}
          {formData.sixMonthGoals || '-'}
        </Typography>

        <Typography>
          <strong>Tech stack:</strong>{' '}
          {formData.techStack || '-'}
        </Typography>

        <Typography>
          <strong>Capital:</strong>{' '}
          {formData.capitalStatus || '-'}
        </Typography>

        <Typography>
          <strong>Weekly hours:</strong>{' '}
          {formData.weeklyHours || '-'}
        </Typography>

        <Typography>
          <strong>Website:</strong>{' '}
          {formData.website || '-'}
        </Typography>
      </Box>
    </Box>
  )
}

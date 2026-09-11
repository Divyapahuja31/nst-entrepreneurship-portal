import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'

const formatDate = dateStr => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '-'
  }
}

export default function KPIExpandedDetails({ kpi }) {
  if (!kpi) return null

  return (
    <Box
      sx={{
        p: 2.5,
        m: 1.5,
        border: '1px solid #e2e8f0',
        borderRadius: 2,
        backgroundColor: '#f8fafc',
      }}
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ fontWeight: 700, mb: 0.5 }}
          >
            Description
          </Typography>
          <Paper
            variant="outlined"
            sx={{ p: 1.5, mb: 2, backgroundColor: '#ffffff' }}
          >
            <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
              {kpi.description || 'No description provided.'}
            </Typography>
          </Paper>

          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ fontWeight: 700, mb: 0.5 }}
          >
            SubKPIs ({kpi.subKPIs?.length || 0})
          </Typography>
          {kpi.subKPIs?.length > 0 ? (
            <Paper variant="outlined" sx={{ backgroundColor: '#ffffff' }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 40 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>SubKPI Name</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {kpi.subKPIs.map((sub, sIdx) => (
                    <TableRow key={sub._id || sIdx}>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {sIdx + 1}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{sub.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          ) : (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              No granular sub-KPIs attached.
            </Typography>
          )}
        </Grid>

        <Grid item xs={12} md={5}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ fontWeight: 700, mb: 0.5 }}
          >
            Teacher Review & Grade Record
          </Typography>
          <Paper
            variant="outlined"
            sx={{ p: 2, mb: 2, backgroundColor: '#ffffff' }}
          >
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
            >
              <Typography variant="caption" color="text.secondary">
                Submission Date:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {formatDate(kpi.submissionDate)}
              </Typography>
            </Box>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
            >
              <Typography variant="caption" color="text.secondary">
                Graded Date:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {formatDate(kpi.evaluationDate)}
              </Typography>
            </Box>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
            >
              <Typography variant="caption" color="text.secondary">
                Evaluator / Mentor:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {kpi.evaluatedBy?.username || kpi.evaluatedBy?.email || 'N/A'}
              </Typography>
            </Box>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
            >
              <Typography variant="caption" color="text.secondary">
                Grade / Score:
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, color: 'success.main' }}
              >
                {kpi.status === 'GRADED' &&
                kpi.score !== undefined &&
                kpi.score !== null
                  ? `${kpi.score} pts`
                  : 'Not graded yet'}
              </Typography>
            </Box>

            <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed #e2e8f0' }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ fontWeight: 600 }}
              >
                Teacher Feedback / Remarks:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontStyle: kpi.feedback ? 'normal' : 'italic',
                  color: kpi.feedback ? 'text.primary' : 'text.secondary',
                  mt: 0.5,
                }}
              >
                {kpi.feedback || 'No remarks recorded yet.'}
              </Typography>
            </Box>
          </Paper>

          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ fontWeight: 700, mb: 0.5 }}
          >
            Student Progress & Attached Evidence
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#ffffff' }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
            >
              <Typography variant="caption" color="text.secondary">
                Achieved Number:
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, color: 'primary.main' }}
              >
                {kpi.actualValue || 'Not yet recorded by student'}
              </Typography>
            </Box>
            {kpi.evidence?.fileName && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Attached File:
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {kpi.evidence.fileName}
                </Typography>
              </Box>
            )}
            {kpi.evidence?.supportingText && (
              <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed #e2e8f0' }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ fontWeight: 600 }}
                >
                  Student Notes & Feedback:
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {kpi.evidence.supportingText}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

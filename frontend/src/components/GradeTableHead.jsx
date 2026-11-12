import { TableCell, TableHead, TableRow, Typography } from '@mui/material'

const subjectColumnStyle = {
  position: 'sticky',
  left: 0,
  zIndex: 1,
  borderRight: 1,
  borderColor: 'divider',
}

export function SubjectCell({ sx, ...props }) {
  return <TableCell {...props} sx={{ ...subjectColumnStyle, ...sx }} />
}

export function SubjectMaximum({ maximum }) {
  return maximum == null ? null : (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: 'block', mt: 0.25 }}
    >
      Out of {maximum}
    </Typography>
  )
}

const groupDivider = { borderLeft: 1, borderColor: 'divider' }

export default function GradeTableHead({ layout, actions = false }) {
  const numeric = layout.mode === 'numeric'
  return (
    <TableHead>
      <TableRow sx={{ bgcolor: 'background.default' }}>
        <SubjectCell
          scope="col"
          rowSpan={2}
          sx={{
            bgcolor: 'background.default',
            minWidth: { xs: 100, sm: 140 },
          }}
        >
          Subject
        </SubjectCell>
        {layout.terms.map((term, index) => (
          <TableCell
            key={term.id}
            align="center"
            scope="colgroup"
            colSpan={term.assessments.length}
            sx={{
              ...(index > 0 && groupDivider),
              textAlign: { xs: 'left', sm: 'center' },
            }}
          >
            <Typography variant="subtitle2" color="text.primary">
              {term.name}
            </Typography>
          </TableCell>
        ))}
        {actions && (
          <TableCell scope="col" rowSpan={2} align="center">
            Actions
          </TableCell>
        )}
      </TableRow>
      <TableRow>
        {layout.terms.flatMap((term, termIndex) =>
          term.assessments.map((assessment, index) => (
            <TableCell
              key={assessment.id}
              scope="col"
              align="center"
              sx={{
                minWidth: { xs: 80, sm: 96 },
                ...(termIndex > 0 && index === 0 && groupDivider),
              }}
            >
              {assessment.name}
              {numeric && (!layout.subjects || assessment.max !== 100) && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.25 }}
                >
                  Out of {assessment.max}
                </Typography>
              )}
            </TableCell>
          ))
        )}
      </TableRow>
    </TableHead>
  )
}

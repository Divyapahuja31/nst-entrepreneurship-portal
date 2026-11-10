import Paper from '@mui/material/Paper'

// A white card that scrolls wide tables sideways inside itself, so the page
// never does.
export default function TableCard({ sx, ...props }) {
  return (
    <Paper
      elevation={1}
      sx={[
        { borderRadius: '18px', overflowX: 'auto' },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    />
  )
}

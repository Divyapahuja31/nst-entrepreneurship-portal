import { tokens } from '../theme'

// Recessive chrome: hairline grid lines, no axis lines or ticks, secondary
// text. Shared with HorizontalBars.
export const quietChart = {
  '& .MuiChartsGrid-line': { stroke: tokens.hairline },
  '& .MuiChartsAxis-tickLabel': { fill: tokens.secondary },
  '& .MuiBarLabel-root': { fill: tokens.text, fontWeight: 600 },
}

import { BarChart } from '@mui/x-charts/BarChart'

import { tints } from '../theme'

export default function BarGraph({ kpiDistribution }) {
  const kpiData = Object.entries(kpiDistribution ?? {}).map(
    ([month, value]) => {
      // null means nothing was graded that month; keep it empty, not 0.
      const score = typeof value === 'number' ? value : null
      return {
        month: month.charAt(0).toUpperCase() + month.slice(1, 3),
        score,
      }
    }
  )

  return (
    <BarChart
      dataset={kpiData}
      xAxis={[{ dataKey: 'month', scaleType: 'band' }]}
      yAxis={[{ min: 0, max: 100, width: 32 }]}
      series={[
        {
          dataKey: 'score',
          label: 'Average score',
          color: tints.blue.fg,

          valueFormatter: value =>
            value == null ? 'No grades' : `${value}/100`,
        },
      ]}
      height={260}
      borderRadius={4}
      hideLegend
    />
  )
}

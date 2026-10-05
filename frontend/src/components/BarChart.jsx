import { BarChart } from '@mui/x-charts/BarChart'

import { quietChart } from './chartStyles'
import { tints } from '../theme'

// Average graded score per month, January to this month. Months with nothing
// graded stay empty rather than reading as 0.
export default function BarGraph({ kpiDistribution }) {
  const months = Object.entries(kpiDistribution ?? {}).slice(
    0,
    new Date().getMonth() + 1
  )
  const kpiData = months.map(([month, value]) => ({
    month: month.charAt(0).toUpperCase() + month.slice(1, 3),
    score: typeof value === 'number' ? Math.round(value) : null,
  }))

  return (
    <BarChart
      dataset={kpiData}
      xAxis={[
        {
          dataKey: 'month',
          scaleType: 'band',
          disableLine: true,
          disableTicks: true,
          categoryGapRatio: 0.55,
        },
      ]}
      yAxis={[
        {
          min: 0,
          max: 100,
          width: 32,
          tickNumber: 3,
          disableLine: true,
          disableTicks: true,
        },
      ]}
      series={[
        {
          dataKey: 'score',
          label: 'Average score',
          color: tints.blue.fg,
          barLabel: item => (item.value == null ? null : String(item.value)),
          barLabelPlacement: 'outside',
          valueFormatter: (value, { dataIndex }) =>
            value == null
              ? null
              : `${kpiData[dataIndex]?.month}: ${value} / 100`,
        },
      ]}
      grid={{ horizontal: true }}
      axisHighlight={{ x: 'none' }}
      slotProps={{ tooltip: { trigger: 'item' } }}
      height={340}
      borderRadius={4}
      hideLegend
      sx={quietChart}
    />
  )
}

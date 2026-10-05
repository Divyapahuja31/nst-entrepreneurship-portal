import { BarChart } from '@mui/x-charts/BarChart'

import { tints } from '../theme'

// One labelled bar per category, in the order given. `data` is
// [{ label, count }].
export default function HorizontalBars({ data, label }) {
  // Each bar shows its count, so the value axis is hidden; the headroom
  // keeps the longest bar's count from being clipped.
  const max = Math.max(1, ...data.map(item => item.count))
  return (
    <BarChart
      dataset={data}
      layout="horizontal"
      yAxis={[{ scaleType: 'band', dataKey: 'label', width: 100 }]}
      xAxis={[{ min: 0, max: max * 1.15, position: 'none' }]}
      series={[
        {
          dataKey: 'count',
          label,
          color: tints.blue.fg,
          barLabel: 'value',
          barLabelPlacement: 'outside',
        },
      ]}
      height={Math.max(120, data.length * 40 + 40)}
      borderRadius={4}
      hideLegend
    />
  )
}

import { BarChart } from '@mui/x-charts/BarChart'

import { quietChart } from './chartStyles'
import { tints } from '../theme'

// One labelled bar per category, in the order given. `data` is
// [{ label, count }]. Every row shows its count, including 0, so an empty
// stage reads as empty rather than missing.
export default function HorizontalBars({ data, label }) {
  // The value axis is hidden; the headroom keeps the longest bar's count
  // from being clipped.
  const max = Math.max(1, ...data.map(item => item.count))
  return (
    <BarChart
      dataset={data}
      layout="horizontal"
      yAxis={[
        {
          scaleType: 'band',
          dataKey: 'label',
          width: 100,
          disableLine: true,
          disableTicks: true,
          categoryGapRatio: 0.45,
        },
      ]}
      xAxis={[{ min: 0, max: max * 1.15, position: 'none' }]}
      series={[
        {
          dataKey: 'count',
          label,
          color: tints.blue.fg,
          minBarSize: 2,
          barLabel: item => String(item.value ?? 0),
          barLabelPlacement: 'outside',
          valueFormatter: (value, { dataIndex }) =>
            `${data[dataIndex]?.label}: ${value ?? 0}`,
        },
      ]}
      axisHighlight={{ y: 'none' }}
      slotProps={{ tooltip: { trigger: 'item' } }}
      height={Math.max(120, data.length * 40 + 40)}
      borderRadius={4}
      hideLegend
      sx={quietChart}
    />
  )
}

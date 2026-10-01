import { BarChart } from '@mui/x-charts/BarChart'

const chartSetting = {
  series: [
    {
      dataKey: 'score',
      label: 'Monthly Average Score',
      valueFormatter: value => (value != null ? `${value} pts` : '-'),
    },
  ],
  height: 300,
  margin: { left: 40 },
}

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
    <div style={{ width: '100%' }}>
      <BarChart
        dataset={kpiData}
        xAxis={[{ dataKey: 'month', scaleType: 'band' }]}
        yAxis={[{ min: 0, max: 100 }]}
        {...chartSetting}
      />
    </div>
  )
}

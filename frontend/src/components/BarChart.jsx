import { BarChart } from '@mui/x-charts/BarChart'

const chartSetting = {
  series: [{ dataKey: 'count' }],
  height: 300,
  margin: { left: 0 },
}

export default function BarGraph({ kpiDistribution }) {
  const kpiData = Object.entries(kpiDistribution ?? {}).map(
    ([month, count]) => ({
      month,
      count,
    })
  )

  console.log(kpiData)
  return (
    <div style={{ width: '100%' }}>
      <BarChart
        dataset={kpiData}
        xAxis={[{ dataKey: 'month' }]}
        {...chartSetting}
      />
    </div>
  )
}

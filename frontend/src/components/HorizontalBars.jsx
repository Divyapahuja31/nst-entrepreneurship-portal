import { BarChart } from '@mui/x-charts/BarChart'

const chartSetting = {
  height: 400,
  margin: { left: 0 },
}

export default function HorizontalBars({ campus }) {
  const campusData = Object.entries(campus ?? {}).map(([name, count]) => ({
    campus: name,
    count: count,
  }))
  return (
    <BarChart
      dataset={campusData}
      yAxis={[{ scaleType: 'band', dataKey: 'campus' }]}
      series={[{ dataKey: 'count', label: 'Student' }]}
      layout="horizontal"
      {...chartSetting}
    />
  )
}

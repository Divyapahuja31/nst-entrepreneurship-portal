import { PieChart } from '@mui/x-charts/PieChart'

const settings = {
  margin: { right: 5 },
  width: 200,
  height: 200,
  hideLegend: true,
}

export default function DonutChart({ stage }) {
  const stageData = Object.entries(stage ?? {}).map(([label, count]) => ({
    label,
    value: count,
  }))

  return (
    <PieChart
      series={[
        {
          innerRadius: 50,
          outerRadius: 100,
          data: stageData,
          arcLabel: 'value',
        },
      ]}
      {...settings}
    />
  )
}

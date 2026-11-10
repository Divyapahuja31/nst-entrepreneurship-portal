import EmptyState from './EmptyState'
import SectionCard from './SectionCard'
import { ChartIcon } from './icons'

// A titled panel for a chart. When there is nothing to plot it explains why,
// rather than drawing an empty or all-zero chart.
export default function ChartCard({
  title,
  subtitle,
  empty = false,
  emptyMessage,
  children,
}) {
  return (
    <SectionCard title={title} subtitle={subtitle}>
      {empty ? (
        <EmptyState
          icon={ChartIcon}
          title="Nothing to show yet"
          description={emptyMessage}
        />
      ) : (
        children
      )}
    </SectionCard>
  )
}

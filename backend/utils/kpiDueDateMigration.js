import KPI from '../models/kpi.js'

// A day picked on the KPI form used to be saved as UTC midnight, so the KPI
// closed at 5:30 am India time on its due day. New ones are due at the end
// of the day in India (kpiDueDate in utils/kpiHelper.js); this moves the old
// ones there too. Only due dates at exactly UTC midnight are moved, so it is
// safe to run again. Returns how many KPIs moved.

// UTC midnight to 11:59:59.999 pm the same day in India (UTC+5:30).
const TO_END_OF_DAY_IN_INDIA_MS = (18 * 60 + 29) * 60 * 1000 + 59999

export const migrateKpiDueDates = async () => {
  const { modifiedCount } = await KPI.collection.updateMany(
    {
      dueDate: { $type: 'date' },
      $expr: {
        $and: [
          { $eq: [{ $hour: '$dueDate' }, 0] },
          { $eq: [{ $minute: '$dueDate' }, 0] },
          { $eq: [{ $second: '$dueDate' }, 0] },
          { $eq: [{ $millisecond: '$dueDate' }, 0] },
        ],
      },
    },
    [{ $set: { dueDate: { $add: ['$dueDate', TO_END_OF_DAY_IN_INDIA_MS] } } }]
  )
  return modifiedCount
}

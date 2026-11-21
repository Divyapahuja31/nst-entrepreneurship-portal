import KPI from '../models/kpi.js'
import { DEFAULT_TIME_ZONE } from './programme.js'
import { auditCollectionMutation } from './auditModel.js'

// Idempotent normalization of historical deadlines to the end of their
// calendar day. Use a pipeline so concurrent edits keep their own date.
export const migrateKpiDueDates = async ({
  confirmedDateOnly = false,
} = {}) => {
  if (!confirmedDateOnly) {
    throw new Error(
      'Review legacy deadline semantics first and pass confirmedDateOnly explicitly.'
    )
  }
  const endOfDay = {
    $subtract: [
      {
        $dateAdd: {
          startDate: {
            $dateTrunc: {
              date: '$dueDate',
              unit: 'day',
              timezone: DEFAULT_TIME_ZONE,
            },
          },
          unit: 'day',
          amount: 1,
          timezone: DEFAULT_TIME_ZONE,
        },
      },
      1,
    ],
  }
  const filter = {
    dueDate: { $type: 'date' },
    dueDateKind: { $ne: 'timestamp' },
    $expr: { $ne: ['$dueDate', endOfDay] },
  }
  const { modifiedCount } = await auditCollectionMutation(KPI, filter, () =>
    KPI.collection.updateMany(filter, [{ $set: { dueDate: endOfDay } }])
  )
  return modifiedCount
}

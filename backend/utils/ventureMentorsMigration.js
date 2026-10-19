import Venture from '../models/venture.js'

// A startup had one `mentor`; it now has a list of `mentors`. Copies the old
// field into the list for startups that have no list yet. The old field is
// left as it was, so a server still running the previous version against
// the same database keeps working; this one ignores it. Safe to run again.
// Returns how many startups changed.
export const migrateVentureMentors = async () => {
  const { modifiedCount } = await Venture.collection.updateMany(
    { mentors: { $exists: false } },
    [
      {
        $set: {
          mentors: {
            $cond: [
              { $eq: [{ $ifNull: ['$mentor', null] }, null] },
              [],
              ['$mentor'],
            ],
          },
        },
      },
    ]
  )
  return modifiedCount
}

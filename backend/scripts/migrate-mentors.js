// Usage: npm run migrate:mentors -w backend
// A startup had one `mentor`; it now has a list of `mentors`. Copies the old
// field into the list for startups that have no list yet. The old field is
// left as it was, so a server still on the previous version keeps working.
// Safe to run again.
import Venture from '../models/venture.js'
import { runWithDatabase } from './connect.js'

runWithDatabase(async () => {
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
  console.info(`Startups given a list of mentors: ${modifiedCount}`)
})

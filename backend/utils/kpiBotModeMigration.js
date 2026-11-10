import CheckIn from '../models/checkIn.js'
import ProgrammeSession from '../models/programmeSession.js'

// Gives every check-in made before CheckIn.kpiBotMode existed its mode: AUTO
// for a bi-weekly session's meeting, ON for one the bot had already started
// on (so its record and any retry stay as they were), OFF for the rest.
// Only check-ins with no mode are touched, so it is safe to run again.
// Returns how many check-ins got each mode.
export const migrateKpiBotModes = async () => {
  const unset = { kpiBotMode: { $exists: false } }
  const biWeekly = await ProgrammeSession.find({
    extra: { $exists: false },
  }).distinct('_id')
  const set = async (filter, mode) =>
    (
      await CheckIn.collection.updateMany(
        { ...unset, ...filter },
        { $set: { kpiBotMode: mode } }
      )
    ).modifiedCount
  return {
    AUTO: await set({ session: { $in: biWeekly } }, 'AUTO'),
    ON: await set(
      {
        $or: [
          { 'kpiExtraction.attempts': { $gt: 0 } },
          { 'kpiExtraction.status': { $in: ['DONE', 'SKIPPED', 'FAILED'] } },
        ],
      },
      'ON'
    ),
    OFF: await set({}, 'OFF'),
  }
}

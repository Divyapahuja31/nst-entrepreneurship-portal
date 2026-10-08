import mongoose from 'mongoose'
import BiWeeklySubmission from '../models/biWeeklySubmission.js'
import Founder from '../models/founder.js'
import { ventureCycleKey } from './biweeklyHelper.js'

// Bi-weekly reports used to be filed per founder, then per startup. This
// moves every report onto a startup: one report per startup per cycle, keyed
// as the API now expects. Nothing is deleted: a report that can't be kept
// (a second report for the same startup and cycle, or a founder's report
// when they never joined a startup) is copied to ARCHIVE first.
// Safe to run again.

export const ARCHIVE = 'biweeklysubmissions_archive'

// The startup a founder is in, or the one they were in most recently.
const ventureOfFounder = async userId => {
  if (!userId) {
    return null
  }
  const membership =
    (await Founder.findOne({ user: userId, status: 'ACTIVE' }).lean()) ??
    (await Founder.findOne({ user: userId }).sort({ joinedAt: -1 }).lean())
  return membership?.venture ?? null
}

// The report to keep comes first: submitted, then reviewed, then the most
// recently edited.
const reviews = row =>
  Number(Boolean(row.biWeeklyEvaluation)) +
  Number(Boolean(row.biWeeklyObservationSchema))
const rank = (a, b) =>
  Number(Boolean(b.submitted_at)) - Number(Boolean(a.submitted_at)) ||
  reviews(b) - reviews(a) ||
  new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0)

// The kept report takes over a review only a duplicate has.
const takeOverReviews = (keeper, duplicates) => {
  const moved = {}
  for (const field of ['biWeeklyEvaluation', 'biWeeklyObservationSchema']) {
    const donor = duplicates.find(row => row[field])
    if (!keeper[field] && donor) {
      moved[field] = donor[field]
    }
  }
  return moved
}

// Works out every change without making any.
const plan = async rows => {
  const groups = new Map()
  const archive = []
  for (const row of rows) {
    const venture = row.venture ?? (await ventureOfFounder(row.founder))
    if (!venture) {
      archive.push({ row, reason: 'The founder has no startup' })
      continue
    }
    const key = ventureCycleKey(venture, row.cycle_number)
    groups.set(key, [...(groups.get(key) ?? []), { ...row, venture }])
  }

  const updates = []
  for (const [key, group] of groups) {
    const [keeper, ...duplicates] = group.sort(rank)
    for (const row of duplicates) {
      archive.push({ row, reason: `A second report for ${key}` })
    }
    updates.push({
      row: keeper,
      $set: {
        venture: keeper.venture,
        custom_id: key,
        ...takeOverReviews(keeper, duplicates),
      },
    })
  }
  return { archive, updates }
}

const isUpToDate = ({ row, $set }) =>
  row.custom_id === $set.custom_id &&
  !row.founder &&
  !row.scope &&
  Object.keys($set).length === 2 &&
  String(row.venture) === String($set.venture)

// Returns what it did (or, with dryRun, what it would do).
export const migrateBiweeklyToVentures = async ({ dryRun = false } = {}) => {
  const collection = BiWeeklySubmission.collection
  const { archive, updates } = await plan(await collection.find().toArray())
  const changes = updates.filter(update => !isUpToDate(update))

  if (!dryRun) {
    // Archived reports go first, so the kept ones can take their keys.
    for (const { row, reason } of archive) {
      await mongoose.connection
        .collection(ARCHIVE)
        .insertOne({ ...row, archivedAt: new Date(), archiveReason: reason })
      await collection.deleteOne({ _id: row._id })
    }
    for (const { row, $set } of changes) {
      await collection.updateOne(
        { _id: row._id },
        { $set, $unset: { founder: '', scope: '' } }
      )
    }
    await BiWeeklySubmission.syncIndexes()
  }

  return {
    updated: changes.length,
    reviewsMoved: changes.filter(({ $set }) => Object.keys($set).length > 2)
      .length,
    archived: archive.map(({ row, reason }) => ({ id: row._id, reason })),
  }
}

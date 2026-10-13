import mongoose from 'mongoose'

import Batch from '../models/batch.js'
import Campus from '../models/campus.js'
import EmailDomain from '../models/emailDomain.js'
import User from '../models/user.js'
import Venture from '../models/venture.js'
import VentureProposal from '../models/ventureProposal.js'
import {
  domainOf,
  listEmailDomains,
  normalizeDomain,
} from '../utils/emailDomains.js'

// School Setup, for admins only (routes/admin.js): the campuses and batches
// students choose from when they sign up, and the email domains anyone may
// sign up and sign in with. Each change answers with the whole page, as the
// Programme page does.

// Matches names that differ only in case, so "adypu" can't sit beside
// "ADYPU".
const ANY_CASE = { locale: 'en', strength: 2 }

const tidy = value =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''

const countBy = async (Model, field) => {
  const rows = await Model.aggregate([
    { $match: { [field]: { $ne: null } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ])
  return new Map(rows.map(row => [String(row._id), row.count]))
}

const loadPage = async () => {
  const [
    campuses,
    batches,
    domains,
    batchesPerCampus,
    peoplePerCampus,
    startupsPerCampus,
    peoplePerBatch,
  ] = await Promise.all([
    Campus.find().sort({ name: 1 }).lean(),
    Batch.find()
      .populate('campus', 'name')
      .sort({ startYear: -1, name: 1 })
      .lean(),
    listEmailDomains(),
    countBy(Batch, 'campus'),
    countBy(User, 'campus'),
    countBy(Venture, 'campus'),
    countBy(User, 'batch'),
  ])
  const count = (map, id) => map.get(String(id)) ?? 0
  return {
    campuses: campuses.map(campus => ({
      _id: campus._id,
      name: campus.name,
      location: campus.location,
      batches: count(batchesPerCampus, campus._id),
      people: count(peoplePerCampus, campus._id),
      startups: count(startupsPerCampus, campus._id),
    })),
    batches: batches.map(batch => ({
      _id: batch._id,
      name: batch.name,
      startYear: batch.startYear,
      endYear: batch.endYear,
      campus: batch.campus,
      people: count(peoplePerBatch, batch._id),
    })),
    domains: domains.map(({ _id, domain, staff }) => ({ _id, domain, staff })),
  }
}

const sendPage = async (res, status = 200) =>
  res.status(status).json(await loadPage())

// Wraps a handler so an unexpected error answers 500 with `failure`.
const handle = (failure, handler) => async (req, res) => {
  try {
    return await handler(req, res)
  } catch (error) {
    console.error(`${failure}:`, error)
    return res.status(500).json({ error: failure })
  }
}

const notFound = (res, what) =>
  res.status(404).json({ error: `That ${what} no longer exists` })

export const getSetupPage = handle('Could not load School Setup', (req, res) =>
  sendPage(res)
)

// ---------------------------------------------------------------- campuses

export const createCampus = handle(
  'Could not add the campus',
  async (req, res) => {
    const name = tidy(req.body?.name)
    const location = tidy(req.body?.location)
    const error = {
      ...(!name && { name: 'Campus name is required' }),
      ...(name.length > 80 && { name: 'Keep the name under 80 characters' }),
      ...(!location && { location: 'Location is required' }),
      ...(location.length > 80 && {
        location: 'Keep the location under 80 characters',
      }),
    }
    if (Object.keys(error).length) {
      return res.status(400).json({ error })
    }
    if (await Campus.findOne({ name }).collation(ANY_CASE)) {
      return res
        .status(409)
        .json({ error: { name: 'A campus with this name already exists' } })
    }
    await Campus.create({ name, location })
    return sendPage(res, 201)
  }
)

// Only a campus nothing points at yet, so no student, startup or proposal
// loses theirs.
export const deleteCampus = handle(
  'Could not remove the campus',
  async (req, res) => {
    const { campusId } = req.params
    if (
      !mongoose.isValidObjectId(campusId) ||
      !(await Campus.exists({ _id: campusId }))
    ) {
      return notFound(res, 'campus')
    }
    const uses = { campus: campusId }
    const [batches, people, pending, startups, proposals] = await Promise.all([
      Batch.exists(uses),
      User.exists(uses),
      User.exists({ 'pendingSignup.campus': campusId }),
      Venture.exists(uses),
      VentureProposal.exists(uses),
    ])
    if (batches) {
      return res
        .status(409)
        .json({ error: 'Remove this campus’s batches first' })
    }
    if (people || pending || startups || proposals) {
      return res.status(409).json({
        error:
          'People or startups belong to this campus, so it can’t be removed',
      })
    }
    await Campus.deleteOne({ _id: campusId })
    return sendPage(res)
  }
)

// ----------------------------------------------------------------- batches

const MIN_YEAR = 2000
const MAX_YEAR = 2100

const parseYear = value => {
  const year = Number(value)
  return Number.isInteger(year) && year >= MIN_YEAR && year <= MAX_YEAR
    ? year
    : null
}

const yearErrors = (startYear, endYear) => {
  const message = `Enter a year from ${MIN_YEAR} to ${MAX_YEAR}`
  if (!startYear || !endYear) {
    return {
      ...(!startYear && { startYear: message }),
      ...(!endYear && { endYear: message }),
    }
  }
  return endYear < startYear
    ? { endYear: 'The batch can’t end before it starts' }
    : {}
}

// The batch to create, or { error }. It is named after its years unless the
// admin gives it a name.
const readBatch = async body => {
  const startYear = parseYear(body.startYear)
  const endYear = parseYear(body.endYear)
  const name = tidy(body.name) || `${startYear}-${endYear}`
  const campusOk =
    mongoose.isValidObjectId(body.campus) &&
    (await Campus.exists({ _id: body.campus }))
  const error = {
    ...(!campusOk && { campus: 'Choose a campus' }),
    ...yearErrors(startYear, endYear),
    ...(name.length > 60 && { name: 'Keep the name under 60 characters' }),
  }
  return Object.keys(error).length
    ? { error }
    : { batch: { name, startYear, endYear, campus: body.campus } }
}

export const createBatch = handle(
  'Could not add the batch',
  async (req, res) => {
    const { batch, error } = await readBatch(req.body ?? {})
    if (error) {
      return res.status(400).json({ error })
    }
    if (
      await Batch.findOne({ name: batch.name, campus: batch.campus }).collation(
        ANY_CASE
      )
    ) {
      return res.status(409).json({
        error: { name: 'This campus already has a batch with this name' },
      })
    }
    await Batch.create(batch)
    return sendPage(res, 201)
  }
)

// Only a batch no one is in yet.
export const deleteBatch = handle(
  'Could not remove the batch',
  async (req, res) => {
    const { batchId } = req.params
    if (
      !mongoose.isValidObjectId(batchId) ||
      !(await Batch.exists({ _id: batchId }))
    ) {
      return notFound(res, 'batch')
    }
    const [people, pending] = await Promise.all([
      User.exists({ batch: batchId }),
      User.exists({ 'pendingSignup.batch': batchId }),
    ])
    if (people || pending) {
      return res.status(409).json({
        error: 'Students belong to this batch, so it can’t be removed',
      })
    }
    await Batch.deleteOne({ _id: batchId })
    return sendPage(res)
  }
)

// ----------------------------------------------------------- email domains

export const createDomain = handle(
  'Could not add the domain',
  async (req, res) => {
    const domain = normalizeDomain(req.body?.domain)
    if (!domain) {
      return res.status(400).json({
        error: { domain: 'Enter a domain such as adypu.edu.in' },
      })
    }
    // Reading the list first adds the defaults to a new database, so they
    // aren't lost when the admin's first change is an addition.
    const domains = await listEmailDomains()
    if (domains.some(entry => entry.domain === domain)) {
      return res
        .status(409)
        .json({ error: { domain: 'This domain is already allowed' } })
    }
    await EmailDomain.create({ domain, staff: req.body?.staff === true })
    return sendPage(res, 201)
  }
)

// Who signs up from here on starts as a mentor or a student. Existing
// accounts keep their roles.
export const updateDomain = handle(
  'Could not change the domain',
  async (req, res) => {
    const { domainId } = req.params
    if (typeof req.body?.staff !== 'boolean') {
      return res.status(400).json({ error: 'staff must be true or false' })
    }
    const updated =
      mongoose.isValidObjectId(domainId) &&
      (await EmailDomain.findByIdAndUpdate(domainId, {
        staff: req.body.staff,
      }))
    if (!updated) {
      return notFound(res, 'domain')
    }
    return sendPage(res)
  }
)

// New sign-ups and Google sign-in from the domain stop. The admin can't
// remove their own domain, which would lock them out of Google sign-in, or
// the last one, which would let no one new in.
export const deleteDomain = handle(
  'Could not remove the domain',
  async (req, res) => {
    const { domainId } = req.params
    const entry =
      mongoose.isValidObjectId(domainId) &&
      (await EmailDomain.findById(domainId))
    if (!entry) {
      return notFound(res, 'domain')
    }
    if (domainOf(req.user.email) === entry.domain) {
      return res.status(409).json({
        error: `Your own account uses @${entry.domain}, so you can’t remove it`,
      })
    }
    if ((await EmailDomain.countDocuments()) <= 1) {
      return res
        .status(409)
        .json({ error: 'Keep at least one domain people can sign up with' })
    }
    await EmailDomain.deleteOne({ _id: entry._id })
    return sendPage(res)
  }
)

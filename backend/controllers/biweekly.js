import BiweeklyForm from '../models/biweeklyForm.js'
import {
  validateForm,
  cleanForm,
  validateAnswers,
  BUILTIN_FIELDS,
} from '@nst/shared/biweeklyForm.js'
import { isAdmin } from '@nst/shared/permissions.js'
import { deadlineLabel } from '@nst/shared/deadlines.js'
import mongoose from 'mongoose'
import Venture from '../models/venture.js'
import { biweeklyClosesAt, isBiweeklyOpen } from '@nst/shared/biweeklyCycles.js'
import {
  canAuthorBiweeklyReview,
  canReadVenture,
  canReopenBiweekly,
  isStaff,
  isStudent,
} from '@nst/shared/permissions.js'
import BiWeeklyEvaluation from '../models/biWeeklyEvaluation.js'
import BiWeeklyObservation from '../models/biWeeklyObservation.js'
import BiWeeklySubmission from '../models/biWeeklySubmission.js'
import { findVentureForUser } from '../utils/founderHelper.js'
import { cycleOrigin, reportsOrigin } from '../utils/programme.js'
import startupStage from '../models/enums/startupStage.js'
import {
  validateCycleNumber,
  parseStudentSubmission,
  hasCycleStarted,
  parseEvaluationScores,
  parseObservation,
  resolveVentureAndContext,
  loadVentureSubmissions,
  updateOrCreateVentureSubmission,
  findTargetVenture,
  ventureCycleKey,
} from '../utils/biweeklyHelper.js'

// Adds the readable stage ("Fund Raising") next to the stored key.
const withStageLabel = venture =>
  venture && {
    ...venture.toJSON(),
    stageLabel: startupStage[venture.stage] ?? venture.stage,
  }

export const getBiWeeklyData = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Staff pick the startup; students always get their own startup's.
    const { venture, founder, coFounders } = await resolveVentureAndContext(
      req.user,
      req.query
    )

    if (
      isStaff(req.user) &&
      !canReadVenture(req.user, {
        mentorIds: venture?.mentors,
        isMember: false,
      })
    ) {
      return res
        .status(403)
        .json({ error: 'This startup is not assigned to you' })
    }

    const submissions = venture ? await loadVentureSubmissions(venture._id) : []

    const evaluations = submissions
      .map(sub => sub.biWeeklyEvaluation)
      .filter(Boolean)
    const observations = submissions
      .map(sub => sub.biWeeklyObservationSchema)
      .filter(Boolean)

    return res.json({
      form: venture
        ? await BiweeklyForm.findOne({ venture: venture._id }).lean()
        : null,
      founder,
      venture: withStageLabel(venture),
      coFounders,
      submissions,
      evaluations,
      observations,
      // Where every startup's cycles count from, once an admin has set it.
      reportsStart: await reportsOrigin(),
    })
  } catch (err) {
    console.error('Get biweekly error:', err)
    return res.status(500).json({
      error: 'Failed to load bi-weekly data',
    })
  }
}

// The student's venture, as long as the cycle has opened for it.
const findVentureForCycle = async userId => {
  const venture = await findVentureForUser(userId)
  if (!venture) {
    return {
      error:
        'You must belong to an active venture to submit bi-weekly progress.',
    }
  }
  const origin = await cycleOrigin(venture)
  return { venture, origin }
}

const closedCycleRefusal = (existing, origin, cycleNum) => {
  if (!existing?.reopened_until && !hasCycleStarted(origin, cycleNum)) {
    return { status: 400, error: `Cycle ${cycleNum} hasn't opened yet.` }
  }
  return {
    status: 403,
    error: `The deadline for cycle ${cycleNum} has passed. It was ${deadlineLabel(new Date(biweeklyClosesAt(origin, cycleNum, existing).getTime() - 1))}. Ask faculty to reopen it.`,
  }
}

// Why a student can't save this cycle now, as { status, error }, or null.
const submissionRefusal = ({ existing, origin, cycleNum, data, isSubmit }) => {
  if (existing?.submitted_at) {
    return {
      status: 403,
      error: 'This cycle has already been submitted and is locked.',
    }
  }
  if (!isBiweeklyOpen(origin, cycleNum, existing)) {
    return closedCycleRefusal(existing, origin, cycleNum)
  }
  const summary = data.progress_summary ?? existing?.progress_summary
  if (!data.form_snapshot && isSubmit && !String(summary ?? '').trim()) {
    return { status: 400, error: 'Add a progress summary before submitting.' }
  }
  return null
}

// The student and their cycle, or { status, error }.
const studentCycle = async req => {
  if (!isStudent(req.user)) {
    return { status: 403, error: 'Only students submit bi-weekly progress' }
  }
  const parsed = parseStudentSubmission(req.body)
  if (parsed.error) {
    return { status: 400, error: parsed.error }
  }
  const found = await findVentureForCycle(req.user.id)
  if (found.error) {
    return { status: 400, error: found.error }
  }
  return { ...parsed, ...found }
}

const applyReportForm = async (body, existing, venture, data, isSubmit) => {
  const currentForm = !existing
    ? await BiweeklyForm.findOne({ venture: venture._id }).lean()
    : null
  const definition = existing?.form_snapshot ?? currentForm?.definition
  if (!definition) {
    return null
  }
  const revision = existing?.form_revision ?? currentForm.revision
  if (body.form_revision !== revision) {
    return { status: 409, error: 'The form changed. Reload before saving.' }
  }
  return assignFormAnswers(body, existing, data, isSubmit, definition, revision)
}
const assignFormAnswers = (
  body,
  existing,
  data,
  isSubmit,
  definition,
  revision
) => {
  const incoming = body.custom_answers ?? {}
  const invalid = validateAnswers(definition, incoming, false)
  if (invalid) {
    return { status: 400, error: invalid }
  }
  const answers = { ...(existing?.custom_answers ?? {}), ...incoming }
  const error = validateAnswers(definition, answers, isSubmit)
  if (error) {
    return { status: 400, error }
  }
  for (const key of Object.keys(data)) {
    delete data[key]
  }
  Object.assign(data, {
    form_snapshot: definition,
    form_revision: revision,
    custom_answers: answers,
  })
  mapStandardAnswers(definition, answers, data)
  return null
}
const mapStandardAnswers = (definition, answers, data) => {
  for (const b of definition.blocks) {
    if (!BUILTIN_FIELDS[b.id] || answers[b.id] === undefined) {
      continue
    }
    data[b.id] = answers[b.id] === '' && b.type === 'number' ? 0 : answers[b.id]
  }
}

export const submitBiWeeklyCycle = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const target = await studentCycle(req)
    if (target.error) {
      return res.status(target.status).json({ error: target.error })
    }
    const { cycleNum, data, isSubmit, venture, origin } = target

    const existing = await BiWeeklySubmission.findOne({
      custom_id: ventureCycleKey(venture._id, cycleNum),
    })
    const formError = await applyReportForm(
      req.body,
      existing,
      venture,
      data,
      isSubmit
    )
    if (formError) {
      return res.status(formError.status).json({ error: formError.error })
    }
    const refusal = submissionRefusal({
      existing,
      origin,
      cycleNum,
      data,
      isSubmit,
    })
    if (refusal) {
      return res.status(refusal.status).json({ error: refusal.error })
    }

    const submission = await updateOrCreateVentureSubmission({
      ventureId: venture._id,
      userId: req.user.id,
      cycle_number: cycleNum,
      data,
      isSubmit,
      expected: existing,
      closesAt: biweeklyClosesAt(origin, cycleNum, existing),
    })
    if (!submission) {
      return res.status(409).json({
        error:
          'This report or its access window changed. Reload and try again.',
      })
    }

    return res.status(200).json({
      success: true,
      message: isSubmit
        ? 'Submitted to faculty on behalf of venture'
        : 'Venture draft saved',
      submission,
    })
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ error: 'This report changed. Reload and try again.' })
    }
    console.error('Submit biweekly cycle error:', err)
    return res.status(500).json({ error: 'Failed to save submission' })
  }
}

const availableForReview = (origin, cycleNum, existing) =>
  hasCycleStarted(origin, cycleNum) ||
  Boolean(existing?.submitted_at) ||
  isBiweeklyOpen(origin, cycleNum, existing)

// For staff acting on a startup's report. parseBody checks the rest of the
// request before anything is created; it returns { error } or values passed
// back as `parsed`. isAllowed(user, ventureMentorIds) says whether this
// caller may act on that startup.
const getOrCreateSubmissionForStaff = async (
  req,
  res,
  { parseBody, isAllowed, allowFuture = false }
) => {
  if (!isStaff(req.user)) {
    res.status(403).json({ error: 'Forbidden: staff access required' })
    return null
  }

  const { ventureId, cycle_number } = req.body
  const cycleNum = validateCycleNumber(cycle_number)

  if (!cycleNum) {
    res.status(400).json({ error: 'Valid cycle_number (1-13) is required' })
    return null
  }

  const parsed = parseBody ? parseBody(req.body) : {}
  if (parsed.error) {
    res.status(400).json({ error: parsed.error })
    return null
  }

  // Reports belong to a startup, so staff always name one.
  const venture = await findTargetVenture(ventureId)
  if (!venture) {
    res.status(404).json({ error: 'Startup not found' })
    return null
  }

  if (!isAllowed(req.user, venture.mentors)) {
    res.status(403).json({
      error: "Only this startup's mentors or the academic board can do this",
    })
    return null
  }

  const existing = await BiWeeklySubmission.findOne({
    custom_id: ventureCycleKey(venture._id, cycleNum),
  })
  const origin = await cycleOrigin(venture)
  if (!allowFuture && !availableForReview(origin, cycleNum, existing)) {
    res.status(400).json({ error: `Cycle ${cycleNum} hasn't opened yet.` })
    return null
  }

  const submission = await updateOrCreateVentureSubmission({
    ventureId: venture._id,
    cycle_number: cycleNum,
  })

  return { venture, submission, cycleNum, parsed }
}

export const saveBiWeeklyObservation = async (req, res) => {
  try {
    const target = await getOrCreateSubmissionForStaff(req, res, {
      parseBody: parseObservation,
      isAllowed: canAuthorBiweeklyReview,
    })
    if (!target) {
      return null
    }

    const { submission, cycleNum, parsed } = target
    const observationData = {
      cycle_number: cycleNum,
      author_id: req.user.id,
      ...parsed.fields,
    }

    let observationDoc
    if (submission.biWeeklyObservationSchema) {
      observationDoc = await BiWeeklyObservation.findByIdAndUpdate(
        submission.biWeeklyObservationSchema,
        observationData,
        { returnDocument: 'after', runValidators: true }
      )
    } else {
      observationDoc = await BiWeeklyObservation.create(observationData)
      submission.biWeeklyObservationSchema = observationDoc._id
      await submission.save()
    }

    return res.status(200).json({
      success: true,
      message: 'Observation saved',
      observation: observationDoc,
    })
  } catch (err) {
    console.error('Save observation error:', err)
    return res.status(500).json({ error: 'Failed to save observation' })
  }
}

export const saveBiWeeklyEvaluation = async (req, res) => {
  try {
    const target = await getOrCreateSubmissionForStaff(req, res, {
      parseBody: parseEvaluationScores,
      isAllowed: canAuthorBiweeklyReview,
    })
    if (!target) {
      return null
    }

    const { submission, cycleNum, parsed } = target
    const evaluationData = {
      checklist_id: cycleNum,
      month_number: Math.ceil(cycleNum / 2),
      year: new Date().getFullYear(),
      ...parsed.scores,
    }

    let evaluationDoc
    if (submission.biWeeklyEvaluation) {
      evaluationDoc = await BiWeeklyEvaluation.findByIdAndUpdate(
        submission.biWeeklyEvaluation,
        evaluationData,
        { returnDocument: 'after', runValidators: true }
      )
    } else {
      evaluationDoc = await BiWeeklyEvaluation.create(evaluationData)
      submission.biWeeklyEvaluation = evaluationDoc._id
      await submission.save()
    }

    return res.status(200).json({
      success: true,
      message: 'Evaluation saved',
      evaluation: evaluationDoc,
    })
  } catch (err) {
    console.error('Save evaluation error:', err)
    return res.status(500).json({ error: 'Failed to save evaluation' })
  }
}

const parseWindowExpiry = body => {
  const until =
    typeof body.reopened_until === 'string' &&
    /T.*(?:Z|[+-]\d{2}:\d{2})$/u.test(body.reopened_until)
      ? new Date(body.reopened_until)
      : new Date(NaN)
  return Number.isFinite(until.getTime()) && until.getTime() > Date.now()
    ? { until }
    : { error: 'Choose a future closing date and time with a timezone.' }
}

export const reopenBiWeeklySubmission = async (req, res) => {
  try {
    // Reopening unlocks a submitted report, which only the board may do.
    const target = await getOrCreateSubmissionForStaff(req, res, {
      isAllowed: canReopenBiweekly,
      allowFuture: true,
      parseBody: parseWindowExpiry,
    })
    if (!target) {
      return null
    }

    const { submission, parsed } = target
    const opened = await BiWeeklySubmission.findByIdAndUpdate(
      submission._id,
      {
        $set: {
          submitted_at: null,
          reopened_at: new Date(),
          reopened_until: parsed.until,
        },
        $inc: { __v: 1 },
      },
      { returnDocument: 'after' }
    )

    return res.status(200).json({
      success: true,
      message: 'Cycle opened until the selected closing time',
      submission: opened,
    })
  } catch (err) {
    console.error('Reopen submission error:', err)
    return res.status(500).json({ error: 'Failed to reopen submission' })
  }
}

const parseWindowTargets = body => {
  const cycle = validateCycleNumber(body.cycle_number)
  if (!cycle) {
    return { error: 'Valid cycle_number (1-13) is required' }
  }
  const expiry = parseWindowExpiry(body)
  if (expiry.error) {
    return expiry
  }
  if (
    !Array.isArray(body.ventureIds) ||
    !body.ventureIds.length ||
    !body.ventureIds.every(
      id => typeof id === 'string' && mongoose.isObjectIdOrHexString(id)
    )
  ) {
    return { error: 'Select at least one valid startup.' }
  }
  return {
    cycle,
    until: expiry.until,
    ids: [...new Set(body.ventureIds.map(id => id.toLowerCase()))],
  }
}

const openVentureWindow = async (ventureId, cycle, until) => {
  const query = { custom_id: ventureCycleKey(ventureId, cycle) }
  const update = {
    $set: {
      venture: ventureId,
      cycle_number: cycle,
      submitted_at: null,
      reopened_at: new Date(),
      reopened_until: until,
    },
    $inc: { __v: 1 },
  }
  try {
    return await BiWeeklySubmission.findOneAndUpdate(query, update, {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
    })
  } catch (error) {
    if (error.code !== 11000) {
      throw error
    }
    // A concurrent first opening created the same unique startup/cycle.
    return BiWeeklySubmission.findOneAndUpdate(query, update, {
      returnDocument: 'after',
      runValidators: true,
    })
  }
}

export const openBiWeeklyWindows = async (req, res) => {
  if (!canReopenBiweekly(req.user)) {
    return res.status(403).json({
      error: 'Only admins and the academic board can open submission windows.',
    })
  }
  const parsed = parseWindowTargets(req.body ?? {})
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error })
  }
  try {
    const ventures = await Venture.find({ _id: { $in: parsed.ids } })
      .select('_id')
      .lean()
    if (ventures.length !== parsed.ids.length) {
      return res.status(404).json({
        error: 'A selected startup no longer exists. Refresh the startup list.',
      })
    }
    const results = await Promise.allSettled(
      parsed.ids.map(id => openVentureWindow(id, parsed.cycle, parsed.until))
    )
    const openedVentureIds = []
    const failedVentureIds = []
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        openedVentureIds.push(parsed.ids[index])
      } else {
        failedVentureIds.push(parsed.ids[index])
      }
    })
    return res
      .status(failedVentureIds.length ? 207 : 200)
      .json({ openedVentureIds, failedVentureIds })
  } catch (error) {
    console.error('Open biweekly windows error:', error)
    return res
      .status(500)
      .json({ error: 'Could not open submission windows. Please try again.' })
  }
}

// Admin-only editing is enforced here independently of the visible edit button.
export const saveBiweeklyForm = async (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Only admins can edit report forms.' })
  }
  try {
    const venture = await findTargetVenture(req.body.ventureId)
    if (!venture) {
      return res.status(404).json({ error: 'Startup not found.' })
    }
    const error = validateForm(req.body.definition)
    if (error) {
      return res.status(400).json({ error })
    }
    if (!Number.isInteger(req.body.revision) || req.body.revision < 0) {
      return res
        .status(400)
        .json({ error: 'A valid form revision is required.' })
    }
    const definition = cleanForm(req.body.definition)
    const cleanedError = validateForm(definition)
    if (cleanedError) {
      return res.status(400).json({ error: cleanedError })
    }
    const form = await BiweeklyForm.findOneAndUpdate(
      { venture: venture._id, revision: req.body.revision },
      { $set: { definition, updatedBy: req.user.id }, $inc: { revision: 1 } },
      {
        upsert: req.body.revision === 0,
        returnDocument: 'after',
        runValidators: true,
      }
    )
    if (!form) {
      return res
        .status(409)
        .json({ error: 'The form changed. Reload before editing.' })
    }
    return res.json({ form })
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ error: 'The form changed. Reload before editing.' })
    }
    console.error('Save biweekly form error:', error)
    return res.status(500).json({ error: 'Could not save the report form.' })
  }
}

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
  isPastDeadline,
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
      !canReadVenture(req.user, { mentorId: venture?.mentor, isMember: false })
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
const findVentureForCycle = async (userId, cycleNum) => {
  const venture = await findVentureForUser(userId)
  if (!venture) {
    return {
      error:
        'You must belong to an active venture to submit bi-weekly progress.',
    }
  }
  const origin = await cycleOrigin(venture)
  if (!hasCycleStarted(origin, cycleNum)) {
    return { error: `Cycle ${cycleNum} hasn't opened yet.` }
  }
  return { venture, origin }
}

// After the deadline only a cycle the board reopened can be changed.
const isClosed = (existing, origin, cycleNum) =>
  isPastDeadline(origin, cycleNum) && !existing?.reopened_at

// Why a student can't save this cycle now, as { status, error }, or null.
const submissionRefusal = ({ existing, origin, cycleNum, data, isSubmit }) => {
  if (existing?.submitted_at) {
    return {
      status: 403,
      error: 'This cycle has already been submitted and is locked.',
    }
  }
  if (isClosed(existing, origin, cycleNum)) {
    return {
      status: 403,
      error: `The deadline for cycle ${cycleNum} has passed. Ask faculty to reopen it.`,
    }
  }
  const summary = data.progress_summary ?? existing?.progress_summary
  if (isSubmit && !String(summary ?? '').trim()) {
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
  const found = await findVentureForCycle(req.user.id, parsed.cycleNum)
  if (found.error) {
    return { status: 400, error: found.error }
  }
  return { ...parsed, ...found }
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
    })

    return res.status(200).json({
      success: true,
      message: isSubmit
        ? 'Submitted to faculty on behalf of venture'
        : 'Venture draft saved',
      submission,
    })
  } catch (err) {
    console.error('Submit biweekly cycle error:', err)
    return res.status(500).json({ error: 'Failed to save submission' })
  }
}

// For staff acting on a startup's report. parseBody checks the rest of the
// request before anything is created; it returns { error } or values passed
// back as `parsed`. isAllowed(user, ventureMentorId) says whether this
// caller may act on that startup.
const getOrCreateSubmissionForStaff = async (
  req,
  res,
  { parseBody, isAllowed }
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

  if (!isAllowed(req.user, venture.mentor)) {
    res.status(403).json({
      error: "Only this startup's mentor or the academic board can do this",
    })
    return null
  }

  // Nothing to review or reopen before the cycle has begun.
  if (!hasCycleStarted(await cycleOrigin(venture), cycleNum)) {
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

export const reopenBiWeeklySubmission = async (req, res) => {
  try {
    // Reopening unlocks a submitted report, which only the board may do.
    const target = await getOrCreateSubmissionForStaff(req, res, {
      isAllowed: canReopenBiweekly,
    })
    if (!target) {
      return null
    }

    const { submission } = target
    submission.submitted_at = null
    submission.reopened_at = new Date()
    await submission.save()

    return res.status(200).json({
      success: true,
      message: 'Cycle unlocked for venture team',
      submission,
    })
  } catch (err) {
    console.error('Reopen submission error:', err)
    return res.status(500).json({ error: 'Failed to reopen submission' })
  }
}

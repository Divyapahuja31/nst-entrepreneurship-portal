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
import CheckIn from '../models/checkIn.js'
import { findVentureForUser } from '../utils/founderHelper.js'
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
      !canReadVenture(req.user, { mentorId: venture?.mentor, isMember: false })
    ) {
      return res
        .status(403)
        .json({ error: 'This startup is not assigned to you' })
    }

    const [submissions, checkIns] = venture
      ? await Promise.all([
          loadVentureSubmissions(venture._id),
          // Each cycle's check-in, shown beside its report.
          CheckIn.find({ venture: venture._id, status: { $ne: 'CANCELLED' } })
            .select('cycle_number scheduledAt meetUrl status')
            .sort({ scheduledAt: 1 }),
        ])
      : [[], []]

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
      checkIns,
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
  if (!hasCycleStarted(venture.createdAt, cycleNum)) {
    return { error: `Cycle ${cycleNum} hasn't opened yet.` }
  }
  return { venture }
}

export const submitBiWeeklyCycle = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!isStudent(req.user)) {
      return res
        .status(403)
        .json({ error: 'Only students submit bi-weekly progress' })
    }

    const parsed = parseStudentSubmission(req.body)
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error })
    }
    const { cycleNum, data, isSubmit } = parsed

    const { venture, error } = await findVentureForCycle(req.user.id, cycleNum)
    if (error) {
      return res.status(400).json({ error })
    }

    const existing = await BiWeeklySubmission.findOne({
      custom_id: ventureCycleKey(venture._id, cycleNum),
    })
    if (existing?.submitted_at) {
      return res.status(403).json({
        error: 'This cycle has already been submitted and is locked.',
      })
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

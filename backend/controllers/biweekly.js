import mongoose from 'mongoose'
import User from '../models/user.js'
import BiWeeklySubmission from '../models/biWeeklySubmission.js'
import BiWeeklyEvaluation from '../models/biWeeklyEvaluation.js'
import BiWeeklyObservation from '../models/biWeeklyObservation.js'

const resolveTargetFounderId = (user, query) => {
  if (user?.role === 'admin') {
    return query.founderId || user?.id
  }
  return user?.id
}

const validateCycleNumber = n => {
  const num = Number(n)
  return num >= 1 && num <= 13 ? num : null
}

const isValidAdminTarget = (founderId, cycleNum) =>
  Boolean(
    founderId &&
    mongoose.isValidObjectId(founderId) &&
    cycleNum &&
    cycleNum >= 1 &&
    cycleNum <= 13
  )

export const getBiWeeklyData = async (req, res) => {
  try {
    const targetFounderId = resolveTargetFounderId(req.user, req.query)

    if (!targetFounderId || !mongoose.isValidObjectId(targetFounderId)) {
      return res.status(400).json({ error: 'Valid founderId is required' })
    }

    const founder = await User.findById(targetFounderId)
      .populate({
        path: 'biWeeklySubmission',
        populate: [
          { path: 'biWeeklyEvaluation' },
          { path: 'biWeeklyObservationSchema' },
        ],
      })
      .exec()

    if (!founder) {
      return res.status(404).json({ error: 'Founder not found' })
    }

    const submissions = founder.biWeeklySubmission || []
    const evaluations = submissions
      .map(sub => sub.biWeeklyEvaluation)
      .filter(Boolean)
    const observations = submissions
      .map(sub => sub.biWeeklyObservationSchema)
      .filter(Boolean)

    return res.json({
      founder,
      submissions,
      evaluations,
      observations,
    })
  } catch (err) {
    console.error('Get biweekly error:', err)
    return res.status(500).json({
      error: 'Failed to load bi-weekly data',
    })
  }
}

const updateOrCreateSubmission = async (user, cycleNum, data, isSubmit) => {
  let submission = user.biWeeklySubmission?.find(
    s => s.cycle_number === cycleNum
  )

  if (isSubmit) {
    data.submitted_at = new Date()
  }

  if (submission) {
    Object.assign(submission, data)
    await submission.save()
    return submission
  }

  const custom_id = `${user._id}_cycle_${cycleNum}`
  submission = await BiWeeklySubmission.create({
    ...data,
    custom_id,
    cycle_number: cycleNum,
  })
  user.biWeeklySubmission.push(submission._id)
  await user.save()
  return submission
}

export const submitBiWeeklyCycle = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (req.user.role === 'admin') {
      return res
        .status(403)
        .json({ error: 'Admins cannot submit student bi-weekly progress' })
    }

    const { cycle_number, isSubmit, ...data } = req.body
    const cycleNum = validateCycleNumber(cycle_number)

    if (!cycleNum) {
      return res.status(400).json({ error: 'Invalid cycle number (1-13)' })
    }

    const user = await User.findById(req.user.id).populate('biWeeklySubmission')
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const submission = await updateOrCreateSubmission(
      user,
      cycleNum,
      data,
      isSubmit
    )

    return res.status(200).json({
      success: true,
      message: isSubmit ? 'Submitted to faculty' : 'Draft saved',
      submission,
    })
  } catch (err) {
    console.error('Submit biweekly cycle error:', err)
    return res.status(500).json({ error: 'Failed to save submission' })
  }
}

const getOrCreateSubmissionForAdmin = async (req, res) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: Admin access required' })
    return null
  }

  const { founderId, cycle_number } = req.body
  const cycleNum = Number(cycle_number)

  if (!isValidAdminTarget(founderId, cycleNum)) {
    res
      .status(400)
      .json({ error: 'Valid founderId and cycle_number (1-13) are required' })
    return null
  }

  const founder = await User.findById(founderId).populate('biWeeklySubmission')
  if (!founder) {
    res.status(404).json({ error: 'Founder not found' })
    return null
  }

  let submission = founder.biWeeklySubmission?.find(
    s => s.cycle_number === cycleNum
  )

  if (!submission) {
    const custom_id = `${founderId}_cycle_${cycleNum}`
    submission = await BiWeeklySubmission.create({
      custom_id,
      cycle_number: cycleNum,
    })
    founder.biWeeklySubmission.push(submission._id)
    await founder.save()
  }

  return { founder, submission, cycleNum }
}

export const saveBiWeeklyObservation = async (req, res) => {
  try {
    const target = await getOrCreateSubmissionForAdmin(req, res)
    if (!target) {
      return null
    }

    const { submission, cycleNum } = target
    const {
      observation,
      strengths,
      concerns,
      action_items,
      evidence_reviewed,
    } = req.body

    const observationData = {
      cycle_number: cycleNum,
      author_id: req.user.id,
      observation,
      strengths,
      concerns,
      action_items,
      evidence_reviewed,
    }

    let observationDoc
    if (submission.biWeeklyObservationSchema) {
      observationDoc = await BiWeeklyObservation.findByIdAndUpdate(
        submission.biWeeklyObservationSchema,
        observationData,
        { returnDocument: 'after' }
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
    const target = await getOrCreateSubmissionForAdmin(req, res)
    if (!target) {
      return null
    }

    const { submission, cycleNum } = target
    const { execution_score, customer_score, business_score, behavior_score } =
      req.body

    const evaluationData = {
      checklist_id: cycleNum,
      month_number: Math.ceil(cycleNum / 2),
      year: new Date().getFullYear(),
      execution_score,
      customer_score,
      business_score,
      behavior_score,
    }

    let evaluationDoc
    if (submission.biWeeklyEvaluation) {
      evaluationDoc = await BiWeeklyEvaluation.findByIdAndUpdate(
        submission.biWeeklyEvaluation,
        evaluationData,
        { returnDocument: 'after' }
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
    const target = await getOrCreateSubmissionForAdmin(req, res)
    if (!target) {
      return null
    }

    const { submission } = target
    submission.submitted_at = null
    await submission.save()

    return res.status(200).json({
      success: true,
      message: 'Cycle unlocked for student',
      submission,
    })
  } catch (err) {
    console.error('Reopen submission error:', err)
    return res.status(500).json({ error: 'Failed to reopen submission' })
  }
}

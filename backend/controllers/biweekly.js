import mongoose from 'mongoose'
import User from '../models/user.js'
import Venture from '../models/venture.js'
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

    const venture = await Venture.findOne({ founders: targetFounderId })

    const submissions = founder.biWeeklySubmission || []
    const evaluations = submissions
      .map(sub => sub.biWeeklyEvaluation)
      .filter(Boolean)
    const observations = submissions
      .map(sub => sub.biWeeklyObservationSchema)
      .filter(Boolean)

    return res.json({
      founder,
      venture,
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

const updateOrCreateSubmission = async (
  userId,
  cycle_number,
  data = {},
  isSubmit = false
) => {
  const custom_id = `${userId}_cycle_${cycle_number}`
  const updateData = { ...data, cycle_number }

  if (isSubmit) {
    updateData.submitted_at = new Date()
  }

  const submission = await BiWeeklySubmission.findOneAndUpdate(
    { custom_id },
    { $set: updateData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  await User.updateOne(
    { _id: userId },
    { $addToSet: { biWeeklySubmission: submission._id } }
  )

  return submission
}

export const submitBiWeeklyCycle = async (req, res) => {
  try {
    // This isn't for protecting route. This
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

    const submission = await updateOrCreateSubmission(
      req.user.id,
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
  const cycleNum = validateCycleNumber(cycle_number)

  if (!mongoose.isValidObjectId(founderId) || !cycleNum) {
    res
      .status(400)
      .json({ error: 'Valid founderId and cycle_number (1-13) are required' })
    return null
  }

  const founder = await User.findById(founderId)
  if (!founder) {
    res.status(404).json({ error: 'Founder not found' })
    return null
  }

  const submission = await updateOrCreateSubmission(founderId, cycleNum)

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

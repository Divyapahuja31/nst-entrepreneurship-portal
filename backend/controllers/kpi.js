import mongoose from 'mongoose'
import SubKPI from '../models/subKPI.js'
import KPI from '../models/kpi.js'
import Venture from '../models/venture.js'
import { validateCreateKPI } from '../utils/kpiValidator.js'
import { uploadToS3 } from '../config/s3.js'

export const createKPI = async (req, res) => {
  try {
    const { title, description, dueDate, venture, status } = req.body
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      })
    }

    const validationError = validateCreateKPI({
      title,
      description,
      venture,
      userId: req.user.id,
    })

    if (validationError) {
      return res.status(validationError.statusCode).json({
        success: false,
        message: validationError.message,
      })
    }

    if (!mongoose.Types.ObjectId.isValid(venture)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid venture ID',
      })
    }

    const isSubmitted = status === 'SUBMIT' || status === 'WAITING_FOR_APPROVAL'
    const kpi = await KPI.create({
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate || null,
      venture,
      createdBy: req.user.id,
      subKPIs: [],
      status: isSubmitted ? 'WAITING_FOR_APPROVAL' : 'DRAFT',
      submissionDate: isSubmitted ? new Date() : null,
    })

    return res.status(201).json({
      success: true,
      message: 'KPI created successfully',
      data: kpi,
    })
  } catch (error) {
    console.error('Create KPI error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to create KPI',
      error: error.message,
    })
  }
}

export const getVentureKPIs = async (req, res) => {
  try {
    const { ventureId } = req.params

    if (!mongoose.Types.ObjectId.isValid(ventureId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid venture ID',
      })
    }

    const kpis = await KPI.find({
      venture: ventureId,
    })
      .populate('createdBy', 'username email')
      .populate('evaluatedBy', 'username email')
      .populate('subKPIs')
      .sort({ createdAt: 1 })

    return res.status(200).json({
      success: true,
      count: kpis.length,
      data: kpis,
    })
  } catch (error) {
    console.error('Get venture KPIs error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch KPIs',
      error: error.message,
    })
  }
}

export const getMyKPIs = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      })
    }

    const venture = await Venture.findOne({ founders: req.user.id })
    const query = venture
      ? { $or: [{ venture: venture._id }, { createdBy: req.user.id }] }
      : { createdBy: req.user.id }

    const kpis = await KPI.find(query)
      .populate('createdBy', 'username email')
      .populate('evaluatedBy', 'username email')
      .populate('subKPIs')
      .sort({ createdAt: 1 })

    return res.status(200).json({
      success: true,
      count: kpis.length,
      venture: venture || null,
      data: kpis,
    })
  } catch (error) {
    console.error('Get my KPIs error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch KPIs',
      error: error.message,
    })
  }
}

export const getFounderKPIs = async (req, res) => {
  try {
    const { founderId } = req.params

    if (!mongoose.Types.ObjectId.isValid(founderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid founder ID',
      })
    }

    const venture = await Venture.findOne({ founders: founderId })
    const query = venture
      ? { $or: [{ venture: venture._id }, { createdBy: founderId }] }
      : { createdBy: founderId }

    const kpis = await KPI.find(query)
      .populate('createdBy', 'username email')
      .populate('evaluatedBy', 'username email')
      .populate('subKPIs')
      .sort({ createdAt: 1 })

    return res.status(200).json({
      success: true,
      count: kpis.length,
      venture: venture || null,
      data: kpis,
    })
  } catch (error) {
    console.error('Get founder KPIs error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch KPIs for founder',
      error: error.message,
    })
  }
}

export const submitKPIForApproval = async (req, res) => {
  try {
    const { kpiId } = req.params
    if (!mongoose.Types.ObjectId.isValid(kpiId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid KPI ID',
      })
    }

    const kpi = await KPI.findById(kpiId)
    if (!kpi) {
      return res.status(404).json({
        success: false,
        message: 'KPI not found',
      })
    }

    if (kpi.status !== 'DRAFT' && kpi.status !== 'REJECTED') {
      return res.status(400).json({
        success: false,
        message: 'Only draft or rejected KPIs can be submitted for approval',
      })
    }

    kpi.status = 'WAITING_FOR_APPROVAL'
    kpi.submissionDate = new Date()

    await kpi.save()

    return res.status(200).json({
      success: true,
      message: 'KPI submitted for mentor approval',
      data: kpi,
    })
  } catch (error) {
    console.error('Submit KPI error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to submit KPI',
      error: error.message,
    })
  }
}

const parseEvaluationScore = score => {
  if (score === undefined || score === null || score === '') {
    return null
  }
  const num = Number(score)
  return !Number.isNaN(num) && num >= 0 ? num : -1
}

const resolveEvaluationStatus = (status, currentStatus, score) => {
  if (status) {
    return status
  }
  if (score !== null && score !== undefined) {
    return 'GRADED'
  }
  if (currentStatus === 'WAITING_FOR_APPROVAL' || currentStatus === 'DRAFT') {
    return 'ACCEPTED'
  }
  return currentStatus
}

export const evaluateKPI = async (req, res) => {
  try {
    const { kpiId } = req.params
    const { score, status, feedback } = req.body

    if (!mongoose.Types.ObjectId.isValid(kpiId)) {
      return res.status(400).json({ success: false, message: 'Invalid KPI ID' })
    }

    const kpi = await KPI.findById(kpiId)
    if (!kpi) {
      return res.status(404).json({ success: false, message: 'KPI not found' })
    }

    const parsedScore = parseEvaluationScore(score)
    if (parsedScore === -1) {
      return res.status(400).json({
        success: false,
        message: 'Score must be a valid non-negative number',
      })
    }
    if (parsedScore !== null) {
      kpi.score = parsedScore
    }

    const targetStatus = resolveEvaluationStatus(
      status,
      kpi.status,
      parsedScore
    )
    kpi.status = targetStatus

    if (targetStatus === 'GRADED') {
      kpi.evaluationDate = new Date()
    }
    kpi.evaluatedBy = req.user?.id || null
    if (feedback !== undefined) {
      kpi.feedback = String(feedback).trim()
    }

    await kpi.save()

    const populatedKPI = await KPI.findById(kpi._id)
      .populate('createdBy', 'username email')
      .populate('evaluatedBy', 'username email')
      .populate('subKPIs')

    return res.status(200).json({
      success: true,
      message: `KPI status updated to ${targetStatus}`,
      data: populatedKPI,
    })
  } catch (error) {
    console.error('Evaluate KPI error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to evaluate KPI',
      error: error.message,
    })
  }
}

export const submitKPIEvidence = async (req, res) => {
  try {
    const { kpiId } = req.params
    const { actualValue, targetValue, supportingText, fileName, fileUrl } =
      req.body

    if (!mongoose.Types.ObjectId.isValid(kpiId)) {
      return res.status(400).json({ success: false, message: 'Invalid KPI ID' })
    }

    const kpi = await KPI.findById(kpiId)
    if (!kpi) {
      return res.status(404).json({ success: false, message: 'KPI not found' })
    }

    if (actualValue !== undefined) {
      kpi.actualValue = String(actualValue).trim()
    }
    if (targetValue !== undefined) {
      kpi.targetValue = String(targetValue).trim()
    }

    kpi.evidence = {
      supportingText: supportingText ? String(supportingText).trim() : '',
      fileName: fileName ? String(fileName).trim() : '',
      fileUrl: fileUrl ? String(fileUrl).trim() : '',
      submittedAt: new Date(),
    }
    kpi.submissionDate = new Date()

    await kpi.save()

    const populatedKPI = await KPI.findById(kpi._id)
      .populate('createdBy', 'username email')
      .populate('evaluatedBy', 'username email')
      .populate('subKPIs')

    return res.status(200).json({
      success: true,
      message: 'Progress and evidence submitted successfully',
      data: populatedKPI,
    })
  } catch (error) {
    console.error('Submit KPI evidence error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to submit evidence',
      error: error.message,
    })
  }
}

const assignIfDefined = (target, key, val) => {
  if (val !== undefined) {
    target[key] = typeof val === 'string' ? val.trim() : val
  }
}

const buildKPIUpdateFields = ({
  title,
  description,
  dueDate,
  status,
  targetValue,
  actualValue,
}) => {
  const fields = {}
  assignIfDefined(fields, 'title', title)
  assignIfDefined(fields, 'description', description)
  if (dueDate !== undefined) {
    fields.dueDate = dueDate || null
  }
  assignIfDefined(fields, 'targetValue', targetValue)
  assignIfDefined(fields, 'actualValue', actualValue)
  if (status !== undefined) {
    const isSubmitting =
      status === 'SUBMIT' || status === 'WAITING_FOR_APPROVAL'
    fields.status = isSubmitting ? 'WAITING_FOR_APPROVAL' : status
    if (isSubmitting) {
      fields.submissionDate = new Date()
    }
  }
  return fields
}

export const updateKPI = async (req, res) => {
  try {
    const { kpiId } = req.params

    if (!mongoose.Types.ObjectId.isValid(kpiId)) {
      return res.status(400).json({ success: false, message: 'Invalid KPI ID' })
    }

    const updateFields = buildKPIUpdateFields(req.body)
    const kpi = await KPI.findByIdAndUpdate(kpiId, updateFields, { new: true })

    if (!kpi) {
      return res.status(404).json({ success: false, message: 'KPI not found' })
    }

    return res
      .status(200)
      .json({ success: true, message: 'KPI updated', data: kpi })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update KPI',
      error: error.message,
    })
  }
}

export const deleteKPI = async (req, res) => {
  try {
    const { kpiId } = req.params
    if (!mongoose.Types.ObjectId.isValid(kpiId)) {
      return res.status(400).json({ success: false, message: 'Invalid KPI ID' })
    }

    const kpi = await KPI.findByIdAndDelete(kpiId)
    if (!kpi) {
      return res.status(404).json({ success: false, message: 'KPI not found' })
    }

    await SubKPI.deleteMany({ parentKPI: kpiId })

    return res.status(200).json({ success: true, message: 'KPI deleted' })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete KPI',
      error: error.message,
    })
  }
}

async function resolveEvidenceData(
  file,
  currentEvidence = {},
  newSupportingText
) {
  let fileUrl = currentEvidence.fileUrl || ''
  let fileName = currentEvidence.fileName || ''

  if (file) {
    fileUrl = await uploadToS3(file.buffer, file.originalname, file.mimetype)
    fileName = file.originalname
  }

  const supportingText = newSupportingText
    ? newSupportingText.trim()
    : currentEvidence.supportingText || ''
  return { fileUrl, fileName, supportingText, uploadedAt: new Date() }
}

export const uploadKPIEvidence = async (req, res) => {
  try {
    const { kpiId } = req.params
    if (!mongoose.Types.ObjectId.isValid(kpiId)) {
      return res.status(400).json({ success: false, message: 'Invalid KPI ID' })
    }

    const kpi = await KPI.findById(kpiId)
    if (!kpi) {
      return res.status(404).json({ success: false, message: 'KPI not found' })
    }

    kpi.evidence = await resolveEvidenceData(
      req.file,
      kpi.evidence,
      req.body.supportingText
    )
    if (req.body.actualValue !== undefined) {
      kpi.actualValue = String(req.body.actualValue).trim()
    }
    kpi.submissionDate = new Date()
    await kpi.save()

    return res.status(200).json({
      success: true,
      message: 'Evidence uploaded successfully',
      data: kpi,
    })
  } catch (error) {
    console.error('Upload KPI evidence error:', error)
    let message = 'Failed to upload evidence'
    if (error.name === 'NoSuchBucket' || error.Code === 'NoSuchBucket') {
      message = `AWS S3 Bucket "${process.env.AWS_S3_BUCKET_NAME || 'nst-evidence-uploads'}" does not exist in your AWS account. Please create the bucket in AWS S3 console or update AWS_S3_BUCKET_NAME in backend/.env`
    }
    return res.status(500).json({
      success: false,
      message,
      error: error.message,
    })
  }
}

export const deleteKPIEvidence = async (req, res) => {
  try {
    const { kpiId } = req.params
    if (!mongoose.Types.ObjectId.isValid(kpiId)) {
      return res.status(400).json({ success: false, message: 'Invalid KPI ID' })
    }

    const kpi = await KPI.findById(kpiId)
    if (!kpi) {
      return res.status(404).json({ success: false, message: 'KPI not found' })
    }

    kpi.evidence = {
      fileUrl: '',
      fileName: '',
      supportingText: '',
      uploadedAt: null,
    }

    await kpi.save()

    return res.status(200).json({
      success: true,
      message: 'Evidence deleted successfully',
      data: kpi,
    })
  } catch (error) {
    console.error('Delete KPI evidence error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to delete evidence',
      error: error.message,
    })
  }
}

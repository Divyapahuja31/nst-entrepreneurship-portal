import mongoose from 'mongoose'
import SubKPI from '../models/subKPI.js'
import KPI from '../models/kpi.js'
import { validateCreateKPI } from '../utils/kpiValidator.js'
import { findVentureForUser } from '../utils/founderHelper.js'
import {
  resolveKPIScope,
  parseEvaluationScore,
  buildEvaluationFields,
  buildKPIUpdateFields,
  resolveEvidenceData,
  checkKPILockStatus,
} from '../utils/kpiHelper.js'
import { downloadFromS3 } from '../config/s3.js'

const kpisVisibleTo = (ventureId, founderId) => ({
  venture: ventureId,
  $or: [{ scope: 'VENTURE' }, { founder: founderId }],
})

export const getAllKPIs = async (req, res) => {
  try {
    const { scope, status } = req.query

    const filter = {}
    if (scope === 'VENTURE' || scope === 'FOUNDER') {
      filter.scope = scope
    }
    if (status) {
      filter.status = status
    }

    const kpis = await KPI.find(filter)
      .populate('venture', 'name')
      .populate('founder', 'username email')
      .populate('createdBy', 'username email')
      .populate('evaluatedBy', 'username email')
      .populate('subKPIs')
      .sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      count: kpis.length,
      data: kpis,
    })
  } catch (error) {
    console.error('Get all KPIs error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch KPIs',
      error: error.message,
    })
  }
}

export const createKPI = async (req, res) => {
  try {
    const { title, description, dueDate, venture, status, scope, founder } =
      req.body
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

    const resolvedScope = resolveKPIScope({ scope, founder })

    if (resolvedScope.error) {
      return res.status(400).json({
        success: false,
        message: resolvedScope.error,
      })
    }

    const isSubmitted = status === 'SUBMIT' || status === 'WAITING_FOR_APPROVAL'
    const kpi = await KPI.create({
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate || null,
      venture,
      scope: resolvedScope.scope,
      founder: resolvedScope.founder,
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

    const venture = await findVentureForUser(req.user.id)
    if (!venture) {
      return res.status(200).json({
        success: true,
        count: 0,
        venture: null,
        data: [],
      })
    }

    const kpis = await KPI.find(kpisVisibleTo(venture._id, req.user.id))
      .populate('createdBy', 'username email')
      .populate('evaluatedBy', 'username email')
      .populate('founder', 'username email')
      .populate('subKPIs')
      .sort({ createdAt: 1 })

    return res.status(200).json({
      success: true,
      count: kpis.length,
      venture,
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

    const venture = await findVentureForUser(founderId)
    if (!venture) {
      return res.status(200).json({
        success: true,
        count: 0,
        venture: null,
        data: [],
      })
    }

    const kpis = await KPI.find(kpisVisibleTo(venture._id, founderId))
      .populate('createdBy', 'username email')
      .populate('evaluatedBy', 'username email')
      .populate('founder', 'username email')
      .populate('subKPIs')
      .sort({ createdAt: 1 })

    return res.status(200).json({
      success: true,
      count: kpis.length,
      venture,
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

export const evaluateKPI = async (req, res) => {
  try {
    const { kpiId } = req.params
    const { score, status, feedback } = req.body

    if (!mongoose.Types.ObjectId.isValid(kpiId)) {
      return res.status(400).json({ success: false, message: 'Invalid KPI ID' })
    }

    const parsedScore = parseEvaluationScore(score)
    if (parsedScore === -1) {
      return res.status(400).json({
        success: false,
        message: 'Score must be a valid non-negative number',
      })
    }

    const updateFields = buildEvaluationFields({
      parsedScore,
      status,
      feedback,
      evaluatorId: req.user?.id,
    })

    const updatedKPI = await KPI.findByIdAndUpdate(
      kpiId,
      { $set: updateFields },
      { new: true }
    )
      .populate('venture', 'name')
      .populate('founder', 'username email')
      .populate('createdBy', 'username email')
      .populate('evaluatedBy', 'username email')
      .populate('subKPIs')

    if (!updatedKPI) {
      return res.status(404).json({ success: false, message: 'KPI not found' })
    }

    return res.status(200).json({
      success: true,
      message: status
        ? `KPI status updated to ${updatedKPI.status}`
        : 'KPI evaluation updated',
      data: updatedKPI,
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

    const lockError = checkKPILockStatus(kpi)
    if (lockError) {
      return res.status(400).json({ success: false, message: lockError })
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

export const updateKPI = async (req, res) => {
  try {
    const { kpiId } = req.params

    if (!mongoose.Types.ObjectId.isValid(kpiId)) {
      return res.status(400).json({ success: false, message: 'Invalid KPI ID' })
    }

    const kpi = await KPI.findById(kpiId)
    if (!kpi) {
      return res.status(404).json({ success: false, message: 'KPI not found' })
    }

    if (kpi.status === 'ACCEPTED') {
      return res
        .status(400)
        .json({ success: false, message: 'Accepted KPI cannot be edited' })
    }

    const lockError = checkKPILockStatus(kpi)
    if (lockError) {
      return res.status(400).json({ success: false, message: lockError })
    }

    const updateFields = buildKPIUpdateFields(req.body)
    Object.assign(kpi, updateFields)
    await kpi.save()

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

    const lockError = checkKPILockStatus(kpi)
    if (lockError) {
      return res.status(400).json({ success: false, message: lockError })
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

    const lockError = checkKPILockStatus(kpi)
    if (lockError) {
      return res.status(400).json({ success: false, message: lockError })
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

const streamS3ToResponse = async (s3Data, res) => {
  if (s3Data.ContentType) {
    res.setHeader('Content-Type', s3Data.ContentType)
  }
  if (s3Data.ContentLength) {
    res.setHeader('Content-Length', s3Data.ContentLength)
  }

  if (typeof s3Data.Body?.pipe === 'function') {
    return s3Data.Body.pipe(res)
  }
  const buffer = Buffer.from(await s3Data.Body.transformToByteArray())
  return res.send(buffer)
}

export const downloadKPIEvidence = async (req, res) => {
  try {
    const { kpiId } = req.params
    if (!mongoose.Types.ObjectId.isValid(kpiId)) {
      return res.status(400).json({ success: false, message: 'Invalid KPI ID' })
    }

    const kpi = await KPI.findById(kpiId)
    const fileUrl = kpi?.evidence?.fileUrl
    if (!fileUrl) {
      return res
        .status(404)
        .json({ success: false, message: 'Evidence file not found' })
    }

    const downloadName = kpi.evidence.fileName || 'evidence_file'
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(downloadName)}"`
    )

    const isS3 = fileUrl.includes('.s3.') || fileUrl.includes('amazonaws.com')
    if (isS3) {
      const pathname = new URL(fileUrl).pathname
      const key = pathname.startsWith('/') ? pathname.slice(1) : pathname
      const s3Data = await downloadFromS3(key)
      return await streamS3ToResponse(s3Data, res)
    }

    return res.redirect(fileUrl)
  } catch (error) {
    console.error('Download KPI evidence error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to download evidence',
      error: error.message,
    })
  }
}

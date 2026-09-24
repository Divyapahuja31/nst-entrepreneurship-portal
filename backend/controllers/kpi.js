import mongoose from 'mongoose'
import SubKPI from '../models/subKPI.js'
import KPI from '../models/kpi.js'
import Founder from '../models/founder.js'
import { validateCreateKPI } from '../utils/kpiValidator.js'
import { findVentureForUser } from '../utils/founderHelper.js'
import {
  resolveKPIScope,
  parseEvaluationScore,
  buildEvaluationFields,
  buildKPIUpdateFields,
  resolveEvidenceData,
  checkKPILockStatus,
  kpisVisibleTo,
  canUserManageVentureKPI,
  canUserAccessKPI,
  buildNewKPIDocument,
  applyKPIProgress,
  buildEvidencePayload,
  streamS3ToResponse,
} from '../utils/kpiHelper.js'
import { downloadFromS3 } from '../config/s3.js'

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

    if (!(await canUserManageVentureKPI(req.user, venture))) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to create KPIs for this venture',
      })
    }

    const resolvedScope = resolveKPIScope({ scope, founder })

    if (resolvedScope.error) {
      return res.status(400).json({
        success: false,
        message: resolvedScope.error,
      })
    }

    const kpi = await KPI.create(
      buildNewKPIDocument({
        title,
        description,
        dueDate,
        venture,
        resolvedScope,
        status,
        userId: req.user.id,
      })
    )

    await kpi.populate('founder', 'username email')

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

    const ventureFounders = await Founder.find({
      venture: ventureId,
      status: 'ACTIVE',
    }).populate('user', 'username email')

    const members = ventureFounders
      .filter(f => f.user)
      .map(f => ({
        id: f.user._id,
        username: f.user.username,
        email: f.user.email,
      }))

    const kpis = await KPI.find({ venture: ventureId })
      .populate('venture', 'name')
      .populate('founder', 'username email')
      .populate('createdBy', 'username email')
      .populate('evaluatedBy', 'username email')
      .populate('subKPIs')
      .sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      count: kpis.length,
      members,
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
        members: [],
        data: [],
      })
    }

    const ventureFounders = await Founder.find({
      venture: venture._id,
      status: 'ACTIVE',
    }).populate('user', 'username email')

    const members = ventureFounders
      .filter(f => f.user)
      .map(f => ({
        id: f.user._id,
        username: f.user.username,
        email: f.user.email,
      }))

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
      members,
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

    const founderRecord = await Founder.findOne({
      $or: [{ user: founderId }, { _id: founderId }],
      status: 'ACTIVE',
    }).populate('venture')

    if (!founderRecord || !founderRecord.venture) {
      return res.status(200).json({
        success: true,
        count: 0,
        venture: null,
        data: [],
      })
    }

    const venture = founderRecord.venture
    const actualUserId =
      founderRecord.user?._id || founderRecord.user || founderId

    const kpis = await KPI.find(kpisVisibleTo(venture._id, actualUserId))
      .populate('createdBy', 'username email')
      .populate('evaluatedBy', 'username email')
      .populate('founder', 'username email')
      .populate('subKPIs')
      .sort({ createdAt: -1 })

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

    if (!(await canUserAccessKPI(req.user, kpi, true))) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to submit this KPI for approval',
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

    if (!(await canUserAccessKPI(req.user, kpi))) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to submit evidence for this KPI',
      })
    }

    const lockError = checkKPILockStatus(kpi)
    if (lockError) {
      return res.status(400).json({ success: false, message: lockError })
    }

    applyKPIProgress(kpi, { actualValue, targetValue })
    kpi.evidence = buildEvidencePayload({ supportingText, fileName, fileUrl })
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

    if (!(await canUserAccessKPI(req.user, kpi))) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to edit this KPI',
      })
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
    await kpi.populate('founder', 'username email')

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

    const kpi = await KPI.findById(kpiId)
    if (!kpi) {
      return res.status(404).json({ success: false, message: 'KPI not found' })
    }

    if (!(await canUserManageVentureKPI(req.user, kpi.venture))) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this KPI',
      })
    }

    await kpi.deleteOne()

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

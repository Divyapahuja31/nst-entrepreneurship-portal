import mongoose from 'mongoose'
import {
  canAddKpi,
  canClearEvidence,
  canDeleteKpi,
  canEditKpi,
  canEvaluateKpi,
  canLockKpi,
  canReadKpi,
  canReadVenture,
  canSubmitEvidence,
  canSubmitKpiForApproval,
  canUnlockKpi,
  isBoard,
  isStudent,
  kpiLockReason,
} from '@nst/shared/permissions.js'
import SubKPI from '../models/subKPI.js'
import KPI from '../models/kpi.js'
import Founder from '../models/founder.js'
import { validateCreateKPI } from '../utils/kpiValidator.js'
import { findVentureForUser } from '../utils/founderHelper.js'
import {
  resolveKPIScope,
  parseEvaluationScore,
  isValidKPIStatus,
  buildEvaluationFields,
  evaluationError,
  buildKPIUpdateFields,
  resolveEvidenceData,
  kpisVisibleTo,
  kpiOwnerChangeError,
  buildNewKPIDocument,
  applyKPIProgress,
  buildEvidencePayload,
  streamS3ToResponse,
} from '../utils/kpiHelper.js'
import {
  isVentureMember,
  kpiContext,
  scopedVentureIds,
  ventureAccess,
} from '../utils/access.js'
import { downloadFromS3, evidenceKeyFromUrl } from '../config/s3.js'
import {
  isAllowedEvidenceFile,
  safeEvidenceFileName,
} from '../utils/evidenceFile.js'
import { queueLockedKpiEmails } from '../utils/kpiLockEmails.js'

const STUDENT_SETTABLE_STATUSES = ['DRAFT', 'SUBMIT', 'WAITING_FOR_APPROVAL']

// The startup's mentor comes along so the UI can apply the same rules.
const VENTURE_FIELDS = 'name mentor'

// Loads the KPI in req.params.kpiId with its permission context. Sends 400,
// 404 or 403 (when the caller may not even see it) and returns null instead.
const findKPIForCaller = async (req, res) => {
  const { kpiId } = req.params
  if (!mongoose.Types.ObjectId.isValid(kpiId)) {
    res.status(400).json({ success: false, message: 'Invalid KPI ID' })
    return null
  }
  const kpi = await KPI.findById(kpiId)
  if (!kpi) {
    res.status(404).json({ success: false, message: 'KPI not found' })
    return null
  }
  const ctx = await kpiContext(req.user, kpi)
  if (!canReadKpi(req.user, ctx)) {
    res.status(403).json({
      success: false,
      message: 'You are not authorized to access this KPI',
    })
    return null
  }
  return { kpi, ctx }
}

// The caller can see the KPI but may not do this to it. A lock is the
// usual reason, so say so when it is.
const refuse = (res, ctx, message) =>
  res
    .status(403)
    .json({ success: false, message: kpiLockReason(ctx) ?? message })

export const getAllKPIs = async (req, res) => {
  try {
    const { scope, status } = req.query

    const filter = {}
    if (scope === 'VENTURE' || scope === 'FOUNDER') {
      filter.scope = scope
    }
    if (typeof status === 'string' && status) {
      filter.status = status
    }
    // Mentors see only the startups assigned to them.
    const ventureIds = await scopedVentureIds(req.user)
    if (ventureIds) {
      filter.venture = { $in: ventureIds }
    }

    const kpis = await KPI.find(filter)
      .populate('venture', VENTURE_FIELDS)
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
    })
  }
}

// Why the caller can't create a KPI for this startup (and member), or null.
const newKPITargetError = async (user, ventureId, founderId) => {
  const { venture, mentorId, isMember } = await ventureAccess(user, ventureId)
  if (!venture) {
    return { status: 404, message: 'Venture not found' }
  }
  if (!canAddKpi(user, { ventureMentorId: mentorId, isMember, founderId })) {
    return {
      status: 403,
      message: 'You are not authorized to create this KPI for this venture',
    }
  }
  if (founderId && !(await isVentureMember(founderId, venture._id))) {
    return { status: 400, message: 'That member is not part of this venture' }
  }
  return null
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

    const targetError = await newKPITargetError(
      req.user,
      venture,
      resolvedScope.founder
    )
    if (targetError) {
      return res
        .status(targetError.status)
        .json({ success: false, message: targetError.message })
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

    // Staff see the startups they may review; members see only their own,
    // and only the KPIs /kpis shows them, not teammates' personal ones.
    const access = await ventureAccess(req.user, ventureId)
    if (!access.venture) {
      return res
        .status(404)
        .json({ success: false, message: 'Venture not found' })
    }
    if (!canReadVenture(req.user, access)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view KPIs for this venture',
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

    const kpis = await KPI.find(
      isStudent(req.user)
        ? kpisVisibleTo(ventureId, req.user.id)
        : { venture: ventureId }
    )
      .populate('venture', VENTURE_FIELDS)
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

    // Students see only their own; staff, the startups they may review.
    const allowed = isStudent(req.user)
      ? String(actualUserId) === String(req.user.id)
      : canReadVenture(req.user, { mentorId: venture.mentor, isMember: false })
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view these KPIs',
      })
    }

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
    })
  }
}

export const submitKPIForApproval = async (req, res) => {
  try {
    const found = await findKPIForCaller(req, res)
    if (!found) {
      return null
    }
    const { kpi, ctx } = found

    if (!canSubmitKpiForApproval(req.user, ctx)) {
      return refuse(
        res,
        ctx,
        'Only draft or rejected KPIs can be submitted for approval'
      )
    }

    kpi.status = 'WAITING_FOR_APPROVAL'
    kpi.submissionDate = new Date()

    await kpi.save()

    return res.status(200).json({
      success: true,
      message: 'KPI submitted for approval',
      data: kpi,
    })
  } catch (error) {
    console.error('Submit KPI error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to submit KPI',
    })
  }
}

const parseEvaluationRequest = ({ score, status }) => {
  const parsedScore = parseEvaluationScore(score)
  if (parsedScore === -1) {
    return { error: 'Score must be a number from 0 to 100' }
  }
  if (!isValidKPIStatus(status)) {
    return { error: 'Invalid KPI status' }
  }
  return { parsedScore }
}

const populateForReview = query =>
  query
    .populate('venture', VENTURE_FIELDS)
    .populate('founder', 'username email')
    .populate('createdBy', 'username email')
    .populate('evaluatedBy', 'username email')
    .populate('lockedBy', 'username email')
    .populate('subKPIs')

// Accept, reject, grade or re-grade. The board may do this to any KPI, even a
// locked one; the startup's mentor only until the KPI is locked.
export const evaluateKPI = async (req, res) => {
  try {
    const { status, feedback } = req.body
    const parsed = parseEvaluationRequest(req.body)
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error })
    }
    const { parsedScore } = parsed

    const found = await findKPIForCaller(req, res)
    if (!found) {
      return null
    }
    const { kpi, ctx } = found
    if (!canEvaluateKpi(req.user, ctx)) {
      return refuse(res, ctx, 'You are not authorized to review this KPI')
    }

    const transitionError = evaluationError(kpi, {
      status,
      parsedScore,
      feedback,
    })
    if (transitionError) {
      return res.status(400).json({ success: false, message: transitionError })
    }

    const updateFields = buildEvaluationFields({
      parsedScore,
      status,
      feedback,
      evaluatorId: req.user.id,
    })

    // Matching on the status read above means two reviewers at once can't
    // both apply a decision, and a mentor's review can't land on a KPI that
    // was locked in the meantime.
    const updatedKPI = await populateForReview(
      KPI.findOneAndUpdate(
        {
          _id: kpi._id,
          status: kpi.status,
          ...(isBoard(req.user) ? {} : { isLocked: { $ne: true } }),
        },
        { $set: updateFields },
        { returnDocument: 'after', runValidators: true }
      )
    )

    if (!updatedKPI) {
      return res.status(409).json({
        success: false,
        message:
          'This KPI changed while you were reviewing it. Reload and try again.',
      })
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
    })
  }
}

// Locking makes a graded KPI's score final. Each change is conditional on
// the state checked, so a concurrent lock, unlock or re-grade gets a 409.
const setKPILock = (locked, canChange, refusal) => async (req, res) => {
  try {
    const found = await findKPIForCaller(req, res)
    if (!found) {
      return null
    }
    const { kpi, ctx } = found
    if (!canChange(req.user, ctx)) {
      return res.status(403).json({ success: false, message: refusal })
    }

    const updatedKPI = await populateForReview(
      KPI.findOneAndUpdate(
        locked
          ? { _id: kpi._id, status: 'GRADED', isLocked: { $ne: true } }
          : { _id: kpi._id, isLocked: true },
        {
          $set: {
            isLocked: locked,
            lockedBy: locked ? req.user.id : null,
            lockedAt: locked ? new Date() : null,
          },
        },
        { returnDocument: 'after' }
      )
    )
    if (!updatedKPI) {
      return res.status(409).json({
        success: false,
        message: 'This KPI changed in the meantime. Reload and try again.',
      })
    }

    // A locked grade is final, so the student hears about it now, and the
    // mentor or board too after a run of poor grades. The emails go out on
    // the server after this response, and only for a lock this caller was
    // allowed to make.
    if (locked) {
      queueLockedKpiEmails(updatedKPI._id)
    }

    return res.status(200).json({
      success: true,
      message: locked ? 'KPI locked' : 'KPI unlocked',
      data: updatedKPI,
    })
  } catch (error) {
    console.error('Set KPI lock error:', error)
    return res
      .status(500)
      .json({ success: false, message: 'Failed to update the KPI lock' })
  }
}

export const lockKPI = setKPILock(
  true,
  canLockKpi,
  'Only a graded KPI can be locked, by its mentor or the academic board'
)

export const unlockKPI = setKPILock(
  false,
  canUnlockKpi,
  'Only the academic board can unlock a KPI'
)

// Files only arrive through the upload endpoint. The client can keep the
// stored file or clear it, never point evidence at another URL: the download
// would fetch it from our bucket with the server's access.
const keptEvidenceFile = (kpi, { fileName, fileUrl }) => {
  if (!fileUrl || !kpi.evidence?.fileUrl) {
    return { fileName: '', fileUrl: '' }
  }
  return {
    fileName: fileName || kpi.evidence.fileName,
    fileUrl: kpi.evidence.fileUrl,
  }
}

export const submitKPIEvidence = async (req, res) => {
  try {
    const { actualValue, targetValue, supportingText, fileName, fileUrl } =
      req.body

    const found = await findKPIForCaller(req, res)
    if (!found) {
      return null
    }
    const { kpi, ctx } = found
    if (!canSubmitEvidence(req.user, ctx)) {
      return refuse(
        res,
        ctx,
        'Only the students whose KPI it is can submit its progress'
      )
    }

    applyKPIProgress(kpi, { actualValue, targetValue })
    kpi.evidence = buildEvidencePayload({
      supportingText,
      ...keptEvidenceFile(kpi, { fileName, fileUrl }),
    })
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
    })
  }
}

// Accepting, rejecting and grading go only through the evaluate route, so
// its review checks can't be skipped by a plain update. Only a student
// moves their KPI between draft and submitted.
const kpiUpdateError = async (user, kpi, { status, founder }) => {
  if (status !== undefined) {
    if (!isStudent(user)) {
      return 'Accept, reject or grade a KPI from the review dialog'
    }
    if (!STUDENT_SETTABLE_STATUSES.includes(status)) {
      return 'You can only save a KPI as draft or submit it for approval'
    }
  }
  const ownerError = kpiOwnerChangeError(user, kpi, founder)
  if (ownerError) {
    return ownerError
  }
  if (founder && !(await isVentureMember(founder, kpi.venture))) {
    return 'That member is not part of this venture'
  }
  return null
}

export const updateKPI = async (req, res) => {
  try {
    const found = await findKPIForCaller(req, res)
    if (!found) {
      return null
    }
    const { kpi, ctx } = found
    if (!canEditKpi(req.user, ctx)) {
      return refuse(res, ctx, 'This KPI can no longer be edited')
    }

    const updateError = await kpiUpdateError(req.user, kpi, req.body)
    if (updateError) {
      return res.status(403).json({ success: false, message: updateError })
    }

    const updateFields = buildKPIUpdateFields(req.body)
    Object.assign(kpi, updateFields)
    await kpi.save()
    await kpi.populate('founder', 'username email')

    return res
      .status(200)
      .json({ success: true, message: 'KPI updated', data: kpi })
  } catch (error) {
    console.error('Update KPI error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to update KPI',
    })
  }
}

export const deleteKPI = async (req, res) => {
  try {
    const found = await findKPIForCaller(req, res)
    if (!found) {
      return null
    }
    const { kpi, ctx } = found

    // An accepted or graded KPI (and its grade) can't be erased by students,
    // nor a locked one by its mentor.
    if (!canDeleteKpi(req.user, ctx)) {
      return refuse(res, ctx, 'This KPI can no longer be deleted')
    }

    await kpi.deleteOne()

    await SubKPI.deleteMany({ parentKPI: kpi._id })

    return res.status(200).json({ success: true, message: 'KPI deleted' })
  } catch (error) {
    console.error('Delete KPI error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to delete KPI',
    })
  }
}

export const uploadKPIEvidence = async (req, res) => {
  try {
    const found = await findKPIForCaller(req, res)
    if (!found) {
      return null
    }
    const { kpi, ctx } = found
    if (!canSubmitEvidence(req.user, ctx)) {
      return refuse(
        res,
        ctx,
        'Only the students whose KPI it is can upload its evidence'
      )
    }

    if (req.file && !isAllowedEvidenceFile(req.file.originalname)) {
      return res.status(400).json({
        success: false,
        message:
          'Upload a PDF, Office document, CSV, text file, image, MP4/MOV video or ZIP',
      })
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
    // Storage details (bucket names, AWS errors) stay in the server log.
    console.error('Upload KPI evidence error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to upload evidence',
    })
  }
}

export const deleteKPIEvidence = async (req, res) => {
  try {
    const found = await findKPIForCaller(req, res)
    if (!found) {
      return null
    }
    const { kpi, ctx } = found
    if (!canClearEvidence(req.user, ctx)) {
      return refuse(res, ctx, 'You are not authorized to delete this evidence')
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
    })
  }
}

// Serves only evidence objects in our bucket. Anything else (another key,
// another host) is refused rather than fetched or redirected to.
const sendEvidenceFile = async (fileUrl, res) => {
  const key = evidenceKeyFromUrl(fileUrl)
  if (!key) {
    return res
      .status(404)
      .json({ success: false, message: 'Evidence file not found' })
  }
  const s3Data = await downloadFromS3(key)
  return await streamS3ToResponse(s3Data, res)
}

export const downloadKPIEvidence = async (req, res) => {
  try {
    const found = await findKPIForCaller(req, res)
    if (!found) {
      return null
    }
    const { kpi } = found

    const fileUrl = kpi?.evidence?.fileUrl
    if (!fileUrl) {
      return res
        .status(404)
        .json({ success: false, message: 'Evidence file not found' })
    }

    const downloadName = kpi.evidence.fileName || 'evidence_file'
    // filename* keeps non-ASCII names readable instead of percent-encoded.
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeEvidenceFileName(downloadName)}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`
    )

    return await sendEvidenceFile(fileUrl, res)
  } catch (error) {
    console.error('Download KPI evidence error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to download evidence',
    })
  }
}

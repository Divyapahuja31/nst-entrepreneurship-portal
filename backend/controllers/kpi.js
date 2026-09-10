import mongoose from 'mongoose'
import SubKPI from '../models/subKPI.js'
import KPI from '../models/kpi.js'
import { validateCreateKPI } from '../utils/kpiValidator.js'

export const createKPI = async (req, res) => {
  try {
    const { title, description, dueDate, venture } = req.body
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

    const kpi = await KPI.create({
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate || null,
      venture,
      createdBy: req.user.id,
      subKPIs: [],
      status: 'DRAFT',
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

    if (kpi.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Only draft KPIs can be submitted for approval',
      })
    }

    kpi.status = 'WAITING_FOR_APPROVAL'

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

export const updateKPI = async (req, res) => {
  try {
    const { kpiId } = req.params
    const { title, description, dueDate } = req.body

    if (!mongoose.Types.ObjectId.isValid(kpiId)) {
      return res.status(400).json({ success: false, message: 'Invalid KPI ID' })
    }

    const updateFields = {}
    if (title !== undefined) {
      updateFields.title = title.trim()
    }
    if (description !== undefined) {
      updateFields.description = description.trim()
    }
    if (dueDate !== undefined) {
      updateFields.dueDate = dueDate || null
    }

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

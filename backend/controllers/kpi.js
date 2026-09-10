import mongoose from 'mongoose'
import '../models/subKPI.js'
import KPI from '../models/kpi.js'
import KPIStatus from '../models/enums/KPIStatus.js'
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
      status: KPIStatus.DRAFT,
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
      .sort({ createdAt: -1 })

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

    if (kpi.status !== KPIStatus.DRAFT) {
      return res.status(400).json({
        success: false,
        message: 'Only draft KPIs can be submitted for approval',
      })
    }

    kpi.status = KPIStatus.WAITING_FOR_APPROVAL

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

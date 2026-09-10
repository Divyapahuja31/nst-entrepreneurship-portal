import mongoose from 'mongoose'
import SubKPI from '../models/subKPI.js'
import KPI from '../models/kpi.js'
import KPIStatus from '../models/enums/KPIStatus.js'

const validateSubKPIRequest = req => {
  const { kpiId } = req.params
  const { name } = req.body
  const userId = req.user?.id
  if (!userId) {
    return {
      statusCode: 401,
      message: 'User not authenticated',
    }
  }

  if (!mongoose.Types.ObjectId.isValid(kpiId)) {
    return {
      statusCode: 400,
      message: 'Invalid KPI ID',
    }
  }

  if (!name?.trim()) {
    return {
      statusCode: 400,
      message: 'SubKPI name is required',
    }
  }

  return null
}

export const createSubKPI = async (req, res) => {
  try {
    const { kpiId } = req.params
    const { name, description } = req.body
    const userId = req.user?.id

    const validationError = validateSubKPIRequest(req)

    if (validationError) {
      return res.status(validationError.statusCode).json({
        success: false,
        message: validationError.message,
      })
    }

    const kpi = await KPI.findById(kpiId)

    if (!kpi) {
      return res.status(404).json({
        success: false,
        message: 'KPI not found',
      })
    }

    if (kpi.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to modify this KPI',
      })
    }

    if (kpi.status !== KPIStatus.DRAFT) {
      return res.status(400).json({
        success: false,
        message: 'SubKPIs can only be added to draft KPIs',
      })
    }

    const subKPI = await SubKPI.create({
      name: name.trim(),
      description: description?.trim() || '',
      parentKPI: kpiId,
    })

    kpi.subKPIs.push(subKPI._id)

    await kpi.save()

    return res.status(201).json({
      success: true,
      message: 'SubKPI created successfully',
      data: subKPI,
    })
  } catch (error) {
    console.error('Create SubKPI error:', error)

    return res.status(500).json({
      success: false,
      message: 'Failed to create SubKPI',
      error: error.message,
    })
  }
}

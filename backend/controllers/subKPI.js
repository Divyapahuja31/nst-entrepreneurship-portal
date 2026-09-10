import mongoose from 'mongoose'
import SubKPI from '../models/subKPI.js'
import KPI from '../models/kpi.js'

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

    if (kpi.status !== 'DRAFT' && kpi.status !== 'WAITING_FOR_APPROVAL') {
      return res.status(400).json({
        success: false,
        message: 'SubKPIs can only be added to draft or pending KPIs',
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

export const updateSubKPI = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description } = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid SubKPI ID' })
    }

    const updateFields = {}
    if (name !== undefined) {
      updateFields.name = name.trim()
    }
    if (description !== undefined) {
      updateFields.description = description.trim()
    }

    const subKPI = await SubKPI.findByIdAndUpdate(id, updateFields, {
      new: true,
    })

    if (!subKPI) {
      return res
        .status(404)
        .json({ success: false, message: 'SubKPI not found' })
    }

    return res
      .status(200)
      .json({ success: true, message: 'SubKPI updated', data: subKPI })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update SubKPI',
      error: error.message,
    })
  }
}

export const deleteSubKPI = async (req, res) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid SubKPI ID' })
    }

    const subKPI = await SubKPI.findByIdAndDelete(id)
    if (!subKPI) {
      return res
        .status(404)
        .json({ success: false, message: 'SubKPI not found' })
    }

    await KPI.updateOne({ _id: subKPI.parentKPI }, { $pull: { subKPIs: id } })

    return res.status(200).json({ success: true, message: 'SubKPI deleted' })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete SubKPI',
      error: error.message,
    })
  }
}

import mongoose from 'mongoose'
import SubKPI from '../models/subKPI.js'
import KPI from '../models/kpi.js'
import { validateSubKPIRequest } from '../utils/kpiValidator.js'
import { canUserAccessKPI, canUserEditSubKPI } from '../utils/kpiHelper.js'

// Only a KPI's creator adds SubKPIs, and only while they may still access it
// (a personal KPI is its owner's alone).
const canAddSubKPI = async (user, kpi) =>
  String(kpi.createdBy) === String(user.id) && canUserAccessKPI(user, kpi)

export const createSubKPI = async (req, res) => {
  try {
    const { kpiId } = req.params
    const { name, description } = req.body

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

    if (!(await canAddSubKPI(req.user, kpi))) {
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

    const subKPI = await SubKPI.findById(id)
    if (!subKPI) {
      return res
        .status(404)
        .json({ success: false, message: 'SubKPI not found' })
    }

    if (!(await canUserEditSubKPI(req.user, subKPI))) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to modify this SubKPI',
      })
    }

    Object.assign(subKPI, updateFields)
    await subKPI.save()

    return res
      .status(200)
      .json({ success: true, message: 'SubKPI updated', data: subKPI })
  } catch (error) {
    console.error('Update SubKPI error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to update SubKPI',
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

    const subKPI = await SubKPI.findById(id)
    if (!subKPI) {
      return res
        .status(404)
        .json({ success: false, message: 'SubKPI not found' })
    }

    if (!(await canUserEditSubKPI(req.user, subKPI))) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to delete this SubKPI',
      })
    }

    await subKPI.deleteOne()

    return res.status(200).json({ success: true, message: 'SubKPI deleted' })
  } catch (error) {
    console.error('Delete SubKPI error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to delete SubKPI',
    })
  }
}

import mongoose from 'mongoose'

export const validateCreateKPI = ({ title, description, venture, userId }) => {
  if (!title?.trim()) {
    return {
      statusCode: 400,
      message: 'KPI title is required',
    }
  }

  if (!description?.trim()) {
    return {
      statusCode: 400,
      message: 'KPI description is required',
    }
  }

  if (!venture) {
    return {
      statusCode: 400,
      message: 'Venture ID is required',
    }
  }

  if (!mongoose.Types.ObjectId.isValid(venture)) {
    return {
      statusCode: 400,
      message: 'Invalid venture ID',
    }
  }

  if (!userId) {
    return {
      statusCode: 401,
      message: 'User not authenticated',
    }
  }

  return null
}

export const validateSubKPIRequest = req => {
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

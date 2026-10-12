import mongoose from 'mongoose'

// Empty means no due date; anything else must be a date.
export const dueDateError = dueDate =>
  dueDate === undefined ||
  dueDate === null ||
  dueDate === '' ||
  !Number.isNaN(new Date(dueDate).getTime())
    ? null
    : 'Choose a valid due date'

export const validateCreateKPI = ({
  title,
  description,
  venture,
  userId,
  dueDate,
}) => {
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

  if (dueDateError(dueDate)) {
    return { statusCode: 400, message: dueDateError(dueDate) }
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
  const { name, description } = req.body
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

  if (typeof name !== 'string' || !name.trim()) {
    return {
      statusCode: 400,
      message: 'SubKPI name is required',
    }
  }

  if (description !== undefined && typeof description !== 'string') {
    return {
      statusCode: 400,
      message: 'SubKPI description must be text',
    }
  }

  return null
}

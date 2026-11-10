import { isAdmin } from '@nst/shared/permissions.js'
import EmailNotification from '../models/emailNotification.js'

const LIMIT = 100

// The newest emails in the log. Admins read every row, anyone else only the
// emails sent to them. Only the server writes to the log.
export const listEmailNotifications = async (req, res) => {
  try {
    const filter = isAdmin(req.user) ? {} : { recipientUser: req.user.id }
    for (const field of ['sl', 'status']) {
      const value = req.query[field]
      if (typeof value === 'string' && value) {
        filter[field] = value
      }
    }

    const notifications = await EmailNotification.find(filter)
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean()

    return res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    })
  } catch (error) {
    console.error('List email notifications error:', error)
    return res
      .status(500)
      .json({ success: false, message: 'Failed to load email notifications' })
  }
}

import Founder from '../models/founder.js'

export const findVentureForUser = async userId => {
  const founder = await Founder.findOne({
    user: userId,
    status: 'ACTIVE',
  }).populate('venture')

  return founder?.venture || null
}

export const addFounderToVenture = async (userId, ventureId) =>
  Founder.findOneAndUpdate(
    { user: userId, venture: ventureId },
    {
      user: userId,
      venture: ventureId,
      status: 'ACTIVE',
      joinedAt: new Date(),
      $unset: { leftAt: '' },
    },
    { returnDocument: 'after', upsert: true }
  )

export const deactivateFounder = async userId =>
  Founder.findOneAndUpdate(
    { user: userId, status: 'ACTIVE' },
    { status: 'INACTIVE', leftAt: new Date() },
    { returnDocument: 'after' }
  ).populate('venture')

import startupStage from '../models/enums/startupStage.js'

export const getStages = async (req, res) => {
  try {
    const stages = Object.entries(startupStage).map(([key, value]) => ({
      key,
      label: value,
    }))

    return res.status(200).json({
      stages,
    })
  } catch (error) {
    console.error('Error fetching stages:', error)

    return res.status(500).json({
      error: 'Could not fetch stages',
    })
  }
}

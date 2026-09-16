import Venture from '../models/venture.js'
export const getVenture = async (req, res) => {
  try {
    const data = await Venture.find({})
      .select('name campus stage industry')
      .populate([
        { path: 'campus', select: 'name' },
        { path: 'industry', select: 'name' },
      ])

    const venture = data.map(data => ({
      name: data.name,
      campus: data.campus.name,
      stage: data.stage,
      industry: data.industry.name,
    }))

    return res.status(200).json(venture)
  } catch (error) {
    console.error('Error fetching venture:', error)

    return res.status(500).json({
      error: 'Could not fetch venture',
    })
  }
}

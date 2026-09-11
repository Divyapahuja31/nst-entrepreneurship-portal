import Industry from '../models/industry.js'

export const getIndustries = async (req, res) => {
  try {
    const industries = await Industry.find()
      .sort({ name: 1 })
      .select('_id name')

    return res.status(200).json({
      industries,
    })
  } catch (error) {
    console.error('Error fetching industries:', error)

    return res.status(500).json({
      error: 'Could not fetch industries',
    })
  }
}

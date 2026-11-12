// A late error belongs to the batch used for that request. It must not
// clear a newer selection made while the request was in flight.
export const requestWithBatch = async (request, { getParams, clearBatch }) => {
  const params = getParams()
  if (!params.batch) {
    return request(params)
  }
  try {
    return await request(params)
  } catch (error) {
    if (error.response?.status !== 400) {
      throw error
    }
    if (getParams().batch === params.batch) {
      clearBatch()
    }
    return request(getParams())
  }
}

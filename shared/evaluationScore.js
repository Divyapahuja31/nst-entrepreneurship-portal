// The monthly evaluation, as the Methodology page describes it. Faculty
// score each pillar from 0 to 100; the total weighs them and is out of 100.
//   Green  (on track):        total ≥ 70 and no pillar below half its weight
//   Yellow (needs attention): total 50–69, or one pillar below half
//   Red    (at risk):         total < 50, or two or more pillars below half
// A pillar is below half its weight when its own score is under 50.

export const PILLAR_WEIGHTS = Object.freeze({
  execution_score: 40,
  customer_score: 25,
  business_score: 20,
  behavior_score: 15,
})

const pillarScore = value => Math.min(100, Math.max(0, Number(value) || 0))

// Out of 100, unrounded.
export const evaluationTotal = scores =>
  Object.entries(PILLAR_WEIGHTS).reduce(
    (sum, [field, weight]) =>
      sum + (pillarScore(scores?.[field]) * weight) / 100,
    0
  )

export const weakPillars = scores =>
  Object.keys(PILLAR_WEIGHTS).filter(field => pillarScore(scores?.[field]) < 50)

export const evaluationStatus = scores => {
  const total = evaluationTotal(scores)
  const weak = weakPillars(scores).length
  if (total < 50 || weak >= 2) {
    return 'red'
  }
  if (total >= 70 && weak === 0) {
    return 'green'
  }
  return 'yellow'
}

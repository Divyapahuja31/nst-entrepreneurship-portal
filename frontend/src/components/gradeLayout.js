import { DEFAULT_GRADE_LEGEND } from '@nst/shared/reportCards.js'

export const newAssessment = () => ({
  id: crypto.randomUUID(),
  name: 'Grade',
  max: 100,
})
export const newTerm = name => ({
  id: crypto.randomUUID(),
  name,
  assessments: [newAssessment()],
})

export const newGradeLayout = () => ({
  mode: 'numeric',
  terms: [newTerm('Term 1'), newTerm('Term 2')],
  legend: { ...DEFAULT_GRADE_LEGEND },
})

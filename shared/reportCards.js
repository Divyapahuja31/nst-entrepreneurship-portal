export const REPORT_CARD_PATH = '/report-card'

export const REPORT_CARD_LIMITS = Object.freeze({
  columns: 8,
  terms: 8,
  assessments: 16,
  rows: 30,
  title: 100,
  column: 50,
  cell: 120,
})

export const filledReportRows = rows =>
  rows.filter(row => row.some(value => value.trim()))

const validReportNames = names =>
  names.length > 0 &&
  names.every(
    name => name.trim().length > 0 && name.length <= REPORT_CARD_LIMITS.column
  ) &&
  new Set(names.map(name => name.trim().toLowerCase())).size === names.length

export const validReportColumns = columns =>
  columns.length <= REPORT_CARD_LIMITS.columns && validReportNames(columns)

export const LETTER_GRADES = Object.freeze(['A', 'B', 'C', 'D'])
export const DEFAULT_GRADE_LEGEND = Object.freeze({
  A: 'Excellent',
  B: 'Good',
  C: 'Satisfactory',
  D: 'Needs improvement',
})

export const reportAssessments = layout =>
  layout.terms.flatMap(term => term.assessments)

const nameOf = value => (typeof value === 'string' ? value.trim() : '')
const hasUniqueNames = items =>
  validReportNames(items.map(item => nameOf(item?.name)))
const hasUniqueIds = items => {
  const ids = items.map(item => item?.id)
  return (
    ids.every(id => typeof id === 'string' && /^[\w-]{1,64}$/.test(id)) &&
    new Set(ids).size === ids.length
  )
}

const readMark = value => {
  if (typeof value === 'number') {
    return value
  }
  return typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value)
    ? Number(value)
    : NaN
}

const validMaximum = value => {
  const mark = readMark(value)
  return Number.isFinite(mark) && mark > 0
}

const validTerm = term =>
  Array.isArray(term.assessments) && hasUniqueNames(term.assessments)

const validLegend = legend =>
  LETTER_GRADES.every(grade => {
    const meaning = nameOf(legend?.[grade])
    return meaning.length > 0 && meaning.length <= REPORT_CARD_LIMITS.cell
  })

const validSubjects = subjects =>
  Array.isArray(subjects) &&
  subjects.length <= REPORT_CARD_LIMITS.rows &&
  hasUniqueNames(subjects) &&
  subjects.every(subject => validMaximum(subject.max))

export const subjectMarkMaximum = (layout, subject) => {
  if (layout.mode === 'numeric') {
    const name = subject.trim().toLowerCase()
    return layout.subjects?.find(item => item.name.toLowerCase() === name)?.max
  }
  return undefined
}

const layoutStructureError = layout => {
  const { terms } = layout
  if (
    terms.length > REPORT_CARD_LIMITS.terms ||
    !hasUniqueNames(terms) ||
    !hasUniqueIds(terms)
  ) {
    return 'Give each term a unique name.'
  }
  if (!terms.every(validTerm)) {
    return 'Give each assessment within a term a unique name.'
  }
  const assessments = reportAssessments(layout)
  if (
    assessments.length > REPORT_CARD_LIMITS.assessments ||
    !hasUniqueIds(assessments)
  ) {
    return `Use up to ${REPORT_CARD_LIMITS.assessments} assessment columns.`
  }
  if (layout.subjects !== undefined && !validSubjects(layout.subjects)) {
    return 'Give each template subject a unique name and a maximum mark greater than zero.'
  }
  return ''
}

export const gradeLayoutError = layout => {
  if (
    !['numeric', 'letter'].includes(layout?.mode) ||
    !Array.isArray(layout.terms)
  ) {
    return 'Choose a grading mode and add at least one term.'
  }
  const { mode, legend } = layout
  const structureProblem = layoutStructureError(layout)
  if (structureProblem) {
    return structureProblem
  }

  const assessments = reportAssessments(layout)
  if (
    mode === 'numeric' &&
    !assessments.every(item => validMaximum(item.max))
  ) {
    return 'Enter a maximum mark greater than zero for each assessment.'
  }
  if (mode === 'letter' && !validLegend(legend)) {
    return 'Enter a meaning for each letter grade.'
  }
  return ''
}

export const normalizeGradeLayout = layout => ({
  mode: layout.mode,
  terms: layout.terms.map(term => ({
    id: term.id,
    name: term.name.trim(),
    assessments: term.assessments.map(item => ({
      id: item.id,
      name: item.name.trim(),
      max: validMaximum(item.max) ? Number(item.max) : 100,
    })),
  })),
  ...(layout.subjects && {
    subjects: layout.subjects.map(({ name, max }) => ({
      name: name.trim(),
      max: Number(max),
    })),
  }),
  legend: Object.fromEntries(
    LETTER_GRADES.map(grade => [
      grade,
      nameOf(layout.legend?.[grade]).slice(0, REPORT_CARD_LIMITS.cell) ||
        DEFAULT_GRADE_LEGEND[grade],
    ])
  ),
})

export const reportGradeError = (
  value,
  mode,
  assessment,
  subjectMaximum = assessment.max
) => {
  const grade = value.trim()
  if (!grade) {
    return ''
  }
  if (mode === 'letter') {
    return LETTER_GRADES.includes(grade.toUpperCase())
      ? ''
      : 'Choose A, B, C, or D.'
  }
  const mark = readMark(grade)
  const maximum = Math.min(assessment.max, subjectMaximum)
  return Number.isFinite(mark) && mark <= maximum
    ? ''
    : `Enter a mark from 0 to ${maximum}.`
}

export const gradedReportError = (layout, rows) => {
  const assessments = reportAssessments(layout)
  const seen = new Set()
  for (const [index, row] of rows.entries()) {
    const [subject, ...grades] = row
    const label = subject.trim()
    if (!label) {
      return `Enter a subject in row ${index + 1}.`
    }
    const subjectMaximum = subjectMarkMaximum(layout, subject)
    if (subjectMaximum !== undefined) {
      const key = label.toLowerCase()
      if (seen.has(key)) {
        return `The rubric pillar "${label}" appears more than once.`
      }
      seen.add(key)
    }
    const invalid = grades.findIndex((value, i) =>
      reportGradeError(value, layout.mode, assessments[i], subjectMaximum)
    )
    if (invalid !== -1) {
      return `Check the grade for ${label} in row ${index + 1}.`
    }
  }
  return rows.some(([, ...grades]) => grades.some(value => value.trim()))
    ? ''
    : 'Enter at least one grade before publishing.'
}

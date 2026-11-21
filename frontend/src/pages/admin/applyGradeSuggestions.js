import { reportAssessments } from '@nst/shared/reportCards.js'

export const ALL_GRADE_ASSESSMENTS = '*'

// Suggestions address the submitted grid. Preserve manual grades even
// if a cell was filled before the response arrived.
export const applyGradeSuggestions = (rows, suggestions) => {
  const grades = new Map(
    suggestions.map(({ row, column, grade }) => [`${row}:${column}`, grade])
  )
  return rows.map(([subject, ...marks], row) => [
    subject,
    ...marks.map((mark, index) =>
      mark.trim() ? mark : (grades.get(`${row}:${index + 1}`) ?? mark)
    ),
  ])
}
export const gradeSuggestionSelection = (layout, rows, selected) => {
  const assessments = reportAssessments(layout)
  const namedRows = rows.filter(([subject]) => subject.trim())
  const blankCounts = assessments.map(
    (_, column) => namedRows.filter(row => !row[column + 1].trim()).length
  )
  const selectedIndex = assessments.findIndex(item => item.id === selected)
  const firstWithBlanks = blankCounts.findIndex(count => count > 0)
  const index =
    selectedIndex >= 0 ? selectedIndex : Math.max(firstWithBlanks, 0)
  const all = selected === ALL_GRADE_ASSESSMENTS
  return {
    assessmentId: all ? ALL_GRADE_ASSESSMENTS : (assessments[index]?.id ?? ''),
    hasCriteria: namedRows.length > 0,
    blankCount: all
      ? blankCounts.reduce((total, count) => total + count, 0)
      : (blankCounts[index] ?? 0),
  }
}

import { createHash } from 'node:crypto'
import { PILLAR_WEIGHTS } from '@nst/shared/evaluationScore.js'
import {
  normalizeGradeLayout,
  reportAssessments,
} from '@nst/shared/reportCards.js'
import ReportCardTemplate from '../models/reportCardTemplate.js'

const name = 'Monthly Entrepreneurship Evaluation'
// A stable ObjectId makes repeated and concurrent runs insert the same preset.
const id = createHash('sha256')
  .update('report-card-template:monthly-entrepreneurship-evaluation')
  .digest('hex')
  .slice(0, 24)

const pillars = [
  ['Execution & Product', 'execution_score'],
  ['Customer & Market', 'customer_score'],
  ['Business & Metrics', 'business_score'],
  ['Founder Behaviour', 'behavior_score'],
]

export async function seedReportCardTemplates() {
  const layout = normalizeGradeLayout({
    mode: 'numeric',
    terms: Array.from({ length: 6 }, (_, index) => {
      const month = index + 1
      return {
        id: `month-${month}`,
        name: `Month ${month}`,
        assessments: [{ id: `marks-${month}`, name: 'Marks', max: 100 }],
      }
    }),
    subjects: pillars.map(([name, field]) => ({
      name,
      max: PILLAR_WEIGHTS[field],
    })),
  })
  const now = new Date()

  await ReportCardTemplate.updateOne(
    { _id: id },
    {
      $setOnInsert: {
        name,
        columns: [
          'Subject',
          ...reportAssessments(layout).map(item => item.name),
        ],
        layout,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true, timestamps: false }
  )
}

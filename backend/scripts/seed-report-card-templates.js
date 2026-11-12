import { seedReportCardTemplates } from '../seed/reportCardTemplates.js'
import { runWithDatabase } from './connect.js'

runWithDatabase(async () => {
  await seedReportCardTemplates()
  console.info('Monthly Entrepreneurship Evaluation template ready')
})

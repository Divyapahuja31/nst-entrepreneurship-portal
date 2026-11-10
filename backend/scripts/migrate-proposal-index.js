// Usage: npm run migrate:proposal-index -w backend
// Lets a student who left their startup propose another: drops the index
// that allowed one approved proposal per student ever. Safe to run again.
import { dropOldApprovedProposalIndex } from '../utils/proposalIndexMigration.js'
import { runWithDatabase } from './connect.js'

runWithDatabase(async () => {
  console.info(
    (await dropOldApprovedProposalIndex())
      ? 'Dropped the one-approved-proposal index.'
      : 'The one-approved-proposal index was already gone.'
  )
})

import VentureProposal, {
  OLD_APPROVED_INDEX,
} from '../models/ventureProposal.js'

// Drops the index that allowed a student one approved proposal ever, so one
// who left their startup can found another. Safe to run again. Returns
// whether it dropped the index.
export const dropOldApprovedProposalIndex = async () => {
  const indexes = await VentureProposal.collection.indexes()
  if (!indexes.some(index => index.name === OLD_APPROVED_INDEX)) {
    return false
  }
  await VentureProposal.collection.dropIndex(OLD_APPROVED_INDEX)
  return true
}

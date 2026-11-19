import {
  auditFingerprint,
  sanitizeAudit,
  textEvidence,
} from './auditSanitize.js'

// Projection allowlists deliberately leave out tokens, free-form notes,
// transcript bodies, observations, file URLs and private student work.
export const AUDIT_FIELDS = {
  User: 'role batch campus deletedAt isEmailVerified googleId email sessionVersion',
  Role: 'name',
  BiweeklyForm: 'venture revision updatedBy definition',
  Venture: 'name description stage mentors campus industry',
  Founder: 'user venture status joinedAt leftAt',
  KPI: 'title description venture founder scope createdBy dueDate dueDateKind status score isLocked lockedBy lockedAt evaluatedBy evaluationDate submissionDate evidence.fileName evidence.uploadedAt actualValue',
  SubKPI: 'name description parentKPI',
  BiWeeklySubmission:
    'custom_answers form_revision venture cycle_number submitted_by submitted_at reopened_at reopened_until biWeeklyEvaluation biWeeklyObservationSchema progress_summary evidence_links hours_worked customer_interviews features_shipped revenue users_acquired experiments_run',
  BiWeeklyEvaluation:
    'checklist_id month_number year execution_score customer_score business_score behavior_score',
  BiWeeklyObservation: 'cycle_number author_id evidence_reviewed',
  ReportSchedule: 'key startDate timeZone',
  Programme:
    'key startDate timeZone weekday startTime endTime mode staff excludedVentures excludedFounders host slotMinutes gapMinutes',
  ProgrammeSession:
    'number cycle_number startsAt endsAt status extra.title extra.kpiBot extra.staff',
  CheckIn:
    'venture mentor staff session scheduledAt durationMinutes status kpiBotMode transcript.status kpiExtraction.status kpiExtraction.created',
  CheckInSeries:
    'venture mentor status startAt endedAt durationMinutes timeZone',
  KpiRecommendation: 'venture founder title status dueDate decidedBy decidedAt',
  ReportCard: 'revision draft.title draft.rows published.publishedAt',
  ReportCardTemplate: 'name columns layout.mode layout.subjects',
  VentureProposal: 'submittedBy venture startupName description status reviews',
  VentureJoinRequest: 'requestedBy venture status reviewedBy reviewedAt',
  Campus: 'name location',
  Batch: 'name campus startYear endYear',
  EmailDomain: 'domain staff',
  EmailSettings: 'brand sender rules templates updatedBy',
  GoogleCredential: 'user googleEmail scopes connectedAt needsReconnect',
  CalendarHost: 'key user',
}

const readPath = (object, path) =>
  path.split('.').reduce((value, key) => value?.[key], object)

const enrich = {
  GoogleCredential(snapshot, document) {
    snapshot.emailFingerprint = auditFingerprint(document.googleEmail)
    delete snapshot.googleEmail
  },
  User(snapshot, document) {
    snapshot.emailFingerprint = auditFingerprint(document.email)
    snapshot.googleLinked = Boolean(document.googleId)
    snapshot.googleFingerprint = auditFingerprint(document.googleId)
    snapshot.sessionRevision = document.sessionVersion
    delete snapshot.email
    delete snapshot.googleId
    delete snapshot.sessionVersion
  },
  BiWeeklySubmission(snapshot, document) {
    snapshot.customAnswerEvidence = textEvidence(
      JSON.stringify(document.custom_answers ?? {})
    )
    delete snapshot.custom_answers
    snapshot.summaryEvidence = textEvidence(document.progress_summary)
    snapshot.evidenceCount = document.evidence_links?.length ?? 0
    snapshot.linkEvidence = textEvidence(
      JSON.stringify(document.evidence_links ?? [])
    )
    delete snapshot.progress_summary
    delete snapshot.evidence_links
  },
  KPI(snapshot, document) {
    snapshot.hasProgress = Boolean(document.actualValue)
    snapshot.hasEvidenceFile = Boolean(readPath(document, 'evidence.fileName'))
    delete snapshot.actualValue
    delete snapshot.evidence_fileName
  },
  ReportCard(snapshot, document) {
    snapshot.rowCount = document.draft?.rows?.length ?? 0
    delete snapshot.draft_rows
  },
  ReportCardTemplate(snapshot, document) {
    snapshot.criteriaCount = document.layout?.subjects?.length ?? 0
    snapshot.criteriaEvidence = textEvidence(
      JSON.stringify(document.layout?.subjects ?? [])
    )
    delete snapshot.layout_subjects
  },
  VentureProposal(snapshot, document) {
    snapshot.reviews = document.reviews?.map(review => ({
      reviewer: String(review.reviewer),
      status: review.status,
      reviewedAt: review.reviewedAt,
    }))
  },
  EmailSettings(snapshot, document) {
    snapshot.templateEvidence = textEvidence(
      JSON.stringify(document.templates ?? {})
    )
    delete snapshot.templates
  },
}

export const auditSnapshot = (modelName, document) => {
  if (!document) {
    return null
  }
  const snapshot = { _id: String(document._id) }
  for (const path of AUDIT_FIELDS[modelName].split(' ')) {
    const value = readPath(document, path)
    if (value !== undefined) {
      snapshot[path.replaceAll('.', '_')] = value?._id
        ? String(value._id)
        : value
    }
  }
  enrich[modelName]?.(snapshot, document)
  if (document.description !== undefined) {
    snapshot.detailEvidence = textEvidence(document.description)
    delete snapshot.description
  }
  return sanitizeAudit(snapshot)
}

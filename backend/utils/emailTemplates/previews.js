import { appUrl } from '../kpiLockEmails.js'
import {
  boardLowScoreEmail,
  mentorFollowUpEmail,
  mentorLowScoreEmail,
  studentResultEmail,
} from './kpiEmails.js'
import { passwordResetEmail, signupVerificationEmail } from './authEmails.js'

// Every template with made-up data, for the dev preview page.

const result = score => ({
  score,
  totalMarks: 100,
  percentage: score,
  evaluationName: 'Customer discovery interviews',
  ventureName: 'GreenCart',
})

const staff = {
  studentName: 'Priya Sharma',
  studentEmail: 'priya.sharma@adypu.edu.in',
  batch: '2025-2029',
  mentorName: 'Rahul Mehta',
  dashboardUrl: `${appUrl()}/admin/venture/sample`,
}

const code = {
  recipientName: 'Priya Sharma',
  code: '482915',
  expiresInMinutes: 5,
}

export const EMAIL_PREVIEWS = {
  'student-result': {
    label: 'Student result',
    usesScore: true,
    render: score =>
      studentResultEmail({
        ...result(score),
        studentName: 'Priya Sharma',
        dashboardUrl: `${appUrl()}/kpis`,
      }),
  },
  'mentor-follow-up': {
    label: 'Mentor follow-up (40 to 70%)',
    usesScore: true,
    render: score => mentorFollowUpEmail({ ...result(score), ...staff }),
  },
  'mentor-low-score': {
    label: 'Mentor low score (40% or below)',
    usesScore: true,
    render: score => mentorLowScoreEmail({ ...result(score), ...staff }),
  },
  'board-low-score': {
    label: 'Academic board low score',
    usesScore: true,
    render: score => boardLowScoreEmail({ ...result(score), ...staff }),
  },
  'password-reset': {
    label: 'Password reset code',
    usesScore: false,
    render: () => passwordResetEmail(code),
  },
  'signup-verification': {
    label: 'Sign-up verification code',
    usesScore: false,
    render: () => signupVerificationEmail(code),
  },
}

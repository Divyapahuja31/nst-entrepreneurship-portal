import { appUrl } from '../kpiLockEmails.js'
import {
  boardLowScoreEmail,
  mentorFollowUpEmail,
  mentorLowScoreEmail,
  studentResultEmail,
} from './kpiEmails.js'
import { passwordResetEmail, signupVerificationEmail } from './authEmails.js'
import {
  founderSessionEmail,
  sessionCancelledEmail,
  staffSessionEmail,
} from './sessionEmails.js'

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

const session = {
  recipientName: 'Priya Sharma',
  group: false,
  ventureName: 'GreenCart',
  day: 'Thu 16 Oct',
  time: '6:15 PM – 6:30 PM',
  staffNames: 'Rahul Mehta',
  meetUrl: 'https://meet.google.com/abc-defg-hij',
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
  'session-founder': {
    label: 'Programme session slot (founder)',
    usesScore: false,
    render: () => founderSessionEmail(session),
  },
  'session-group': {
    label: 'Programme group session (founder)',
    usesScore: false,
    render: () =>
      founderSessionEmail({
        ...session,
        group: true,
        time: '6:00 PM – 8:00 PM',
        staffNames: 'Rahul Mehta, Divya Pahuja',
      }),
  },
  'session-staff': {
    label: 'Programme session schedule (staff)',
    usesScore: false,
    render: () =>
      staffSessionEmail({
        recipientName: 'Rahul Mehta',
        group: false,
        day: session.day,
        time: '6:00 PM – 8:00 PM',
        meetUrl: null,
        meetings: [
          { time: '6:00 PM – 6:15 PM', ventureName: 'GreenCart' },
          { time: '6:15 PM – 6:30 PM', ventureName: 'Vyapaar Express' },
        ],
      }),
  },
  'session-cancelled': {
    label: 'Programme session cancelled',
    usesScore: false,
    render: () =>
      sessionCancelledEmail({
        recipientName: 'Priya Sharma',
        ventureName: 'GreenCart',
        day: session.day,
        time: session.time,
      }),
  },
}

// What Google said when someone came back from connecting their calendar
// (?calendar=<outcome>).
export const CALENDAR_OUTCOMES = {
  connected: {
    severity: 'success',
    text: 'Google Calendar connected.',
  },
  denied: {
    severity: 'info',
    text: 'Google Calendar wasn’t connected. Connect it whenever you’re ready.',
  },
  'wrong-account': {
    severity: 'error',
    text: 'Connect the Google account you sign in to the portal with.',
  },
  'missing-access': {
    severity: 'error',
    text: 'Allow both Calendar and Meet access when Google asks, so meetings and their transcripts work.',
  },
  failed: {
    severity: 'error',
    text: 'Google Calendar couldn’t be connected. Try again.',
  },
}

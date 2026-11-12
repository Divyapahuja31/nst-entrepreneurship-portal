import { DEFAULT_EMAIL_SETTINGS } from '../emailSettings.js'
import {
  button,
  escapeHtml,
  escapeLines,
  fill,
  heading,
  layout,
  paragraph,
  plainText,
} from './layout.js'

export const reportCardPublishedEmail = (
  { recipientName, reportUrl },
  { brand, templates } = DEFAULT_EMAIL_SETTINGS
) => {
  const copy = templates['report-card-published']
  const values = { name: recipientName }
  const subject = fill(copy.subject, values).replace(/[\r\n]+/g, ' ')
  const intro = fill(copy.intro, values)
  const label = fill(copy.button, values)
  const greeting = `Hi ${recipientName},`

  return {
    subject,
    html: layout({
      title: subject,
      preheader: intro,
      brand,
      body: [
        heading(fill(copy.heading, values)),
        paragraph(escapeHtml(greeting)),
        paragraph(escapeLines(intro)),
        button({ href: reportUrl, label }),
      ].join(''),
    }),
    text: plainText([greeting, '', intro, '', `${label}: ${reportUrl}`], brand),
  }
}

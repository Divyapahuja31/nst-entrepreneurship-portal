import { DEFAULT_BRAND, DEFAULT_RULES } from '../emailSettings.js'

// Building blocks every email shares. Email clients ignore <style> blocks
// and most modern CSS, so everything is a table with inline styles, in the
// colors of DESIGN.md.

const COLORS = {
  page: '#f5f5f7',
  surface: '#ffffff',
  text: '#1d1d1f',
  secondary: '#6e6e73',
  border: '#d2d2d7',
  accent: '#0071e3',
}

const TONES = {
  success: { color: '#248a3d', fill: '#e8f5ec' },
  info: { color: '#0066cc', fill: '#e8f1fb' },
  warning: { color: '#b25000', fill: '#fdf1e6' },
  danger: { color: '#e30000', fill: '#fdeaea' },
}

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

// Names, KPI titles and startup names are typed by users, so nothing goes
// into an email unescaped: they must not be able to add links or fake
// buttons to emails we send to other people.
export const escapeHtml = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    char =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]
  )

// Text an admin may break into lines: escaped, with its line breaks kept.
export const escapeLines = value => escapeHtml(value).replace(/\r?\n/g, '<br>')

// "Title. Body" for the plain-text part, without doubling the title's own
// punctuation ("Great work!" stays "Great work! Body").
export const titled = (title, body, separator = '.') =>
  /[.!?:]$/.test(title) ? `${title} ${body}` : `${title}${separator} ${body}`

export const paragraph = html =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLORS.text};">${html}</p>`

export const heading = text =>
  `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:600;color:${COLORS.text};">${escapeHtml(text)}</h1>`

// Fills an admin's text: each {name} becomes values.name. A name without a
// value stays as typed. The result is plain text; escape it for HTML.
export const fill = (template, values) =>
  String(template ?? '').replace(/\{([^{}]*)\}/g, (token, name) =>
    Object.hasOwn(values, name) && values[name] !== undefined
      ? String(values[name])
      : token
  )

// The label and tone a percentage gets everywhere: the pill, the action card.
export const scoreStatus = (percentage, rules = DEFAULT_RULES) => {
  if (percentage <= rules.lowPercent) {
    return { label: `${rules.lowPercent}% or below`, tone: 'danger' }
  }
  if (percentage < rules.passPercent) {
    return { label: 'Needs improvement', tone: 'warning' }
  }
  return { label: 'On track', tone: 'success' }
}

const pill = ({ label, tone }) =>
  `<span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600;color:${TONES[tone].color};background:${TONES[tone].fill};">${escapeHtml(label)}</span>`

export const scoreCard = ({ score, totalMarks, percentage }, rules) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:${COLORS.page};border-radius:12px;">
  <tr><td style="padding:24px;text-align:center;">
    <div style="font-size:13px;color:${COLORS.secondary};text-transform:uppercase;letter-spacing:0.5px;">Score</div>
    <div style="margin:8px 0;font-size:36px;font-weight:700;color:${COLORS.text};">${escapeHtml(score)}<span style="font-size:20px;color:${COLORS.secondary};"> / ${escapeHtml(totalMarks)}</span></div>
    <div style="margin:0 0 12px;font-size:15px;color:${COLORS.secondary};">${escapeHtml(Math.round(percentage))}%</div>
    ${pill(scoreStatus(percentage, rules))}
  </td></tr>
</table>`

// tone: 'info' | 'warning' | 'danger'. body is HTML; escape what goes in it.
export const actionCard = ({ tone = 'info', title, body }) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:${TONES[tone].fill};border-left:4px solid ${TONES[tone].color};border-radius:8px;">
  <tr><td style="padding:16px 20px;">
    <div style="margin:0 0 6px;font-size:15px;font-weight:600;color:${TONES[tone].color};">${escapeHtml(title)}</div>
    <div style="font-size:14px;line-height:1.6;color:${COLORS.text};">${body}</div>
  </td></tr>
</table>`

// rows: [label, value] pairs of plain text.
export const detailsTable = rows => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid ${COLORS.border};border-radius:8px;border-collapse:separate;">
  ${rows
    .map(
      ([label, value], index) => `<tr>
    <td style="padding:10px 16px;font-size:14px;color:${COLORS.secondary};width:40%;${index ? `border-top:1px solid ${COLORS.border};` : ''}">${escapeHtml(label)}</td>
    <td style="padding:10px 16px;font-size:14px;color:${COLORS.text};font-weight:500;${index ? `border-top:1px solid ${COLORS.border};` : ''}">${escapeHtml(value)}</td>
  </tr>`
    )
    .join('')}
</table>`

export const button = ({ href, label }) => `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
  <tr><td style="border-radius:980px;background:${COLORS.accent};">
    <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:500;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
  </td></tr>
</table>`

// A whole email. preheader is the preview line inboxes show after the
// subject; body is HTML. brand is the header and footer from the email
// settings.
export const layout = ({
  title,
  preheader,
  body,
  brand = DEFAULT_BRAND,
}) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
      <tr><td style="padding:0 8px 16px;">
        <div style="font-size:12px;font-weight:700;letter-spacing:1.5px;color:${COLORS.text};">${escapeHtml(brand.title)}</div>
        <div style="font-size:13px;color:${COLORS.secondary};">${escapeHtml(brand.subtitle)}</div>
      </td></tr>
      <tr><td style="padding:32px;background:${COLORS.surface};border-radius:16px;font-family:${FONT};">
        ${body}
      </td></tr>
      <tr><td style="padding:16px 8px;font-size:12px;line-height:1.6;color:${COLORS.secondary};text-align:center;">
        ${escapeLines(brand.footer)}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

// The plain-text part sent alongside the HTML.
export const plainText = (lines, brand = DEFAULT_BRAND) =>
  [
    `${brand.title} | ${brand.subtitle}`,
    '',
    ...lines,
    '',
    '--',
    brand.footer,
  ].join('\n')

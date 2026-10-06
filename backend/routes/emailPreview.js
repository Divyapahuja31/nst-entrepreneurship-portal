import { Router } from 'express'
import { EMAIL_PREVIEWS } from '../utils/emailTemplates/previews.js'

// Development only (see routes/index.js): every email template with sample
// data and a score slider, at /api/dev/emails.

const router = Router()

const clampScore = value => {
  const score = Number(value)
  return Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 65
}

const options = Object.entries(EMAIL_PREVIEWS)
  .map(([name, { label }]) => `<option value="${name}">${label}</option>`)
  .join('')

const page = base => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Email previews</title>
<style>
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f7; color: #1d1d1f; }
  header { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; padding: 16px 24px; background: #fff; border-bottom: 1px solid #d2d2d7; }
  h1 { margin: 0 16px 0 0; font-size: 17px; }
  label { display: flex; gap: 8px; align-items: center; font-size: 14px; }
  select { font: inherit; padding: 6px 8px; border-radius: 8px; border: 1px solid #d2d2d7; }
  #subject { padding: 12px 24px; font-size: 14px; color: #6e6e73; }
  iframe { display: block; width: 100%; height: calc(100vh - 120px); border: 0; background: #fff; }
</style>
</head>
<body>
<header>
  <h1>Email previews</h1>
  <label>Template <select id="template">${options}</select></label>
  <label>Score <input id="score" type="range" min="0" max="100" value="65"> <output id="value">65</output></label>
</header>
<div id="subject"></div>
<iframe id="frame" title="Email preview"></iframe>
<script>
  const base = ${JSON.stringify(base)}
  const usesScore = ${JSON.stringify(
    Object.fromEntries(
      Object.entries(EMAIL_PREVIEWS).map(([name, p]) => [name, p.usesScore])
    )
  )}
  const template = document.getElementById('template')
  const score = document.getElementById('score')
  const show = async () => {
    document.getElementById('value').textContent = score.value
    score.disabled = !usesScore[template.value]
    const url = base + '/' + template.value + '?score=' + score.value
    document.getElementById('frame').src = url
    const { subject } = await (await fetch(url + '&format=json')).json()
    document.getElementById('subject').textContent = 'Subject: ' + subject
  }
  template.addEventListener('change', show)
  score.addEventListener('input', show)
  show()
</script>
</body>
</html>`

router.get('/', (req, res) => res.type('html').send(page(req.baseUrl)))

router.get('/:name', (req, res) => {
  const preview = EMAIL_PREVIEWS[req.params.name]
  if (!preview) {
    return res.status(404).json({ error: 'No such email template' })
  }
  const email = preview.render(clampScore(req.query.score))
  if (req.query.format === 'json') {
    return res.json(email)
  }
  // Shown inside the preview page, so it may be framed by this origin.
  res.set({
    'X-Frame-Options': 'SAMEORIGIN',
    'Content-Security-Policy': "frame-ancestors 'self'",
  })
  return res.type('html').send(email.html)
})

export default router

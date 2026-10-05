# Design System

The portal follows the look and feel of Apple's own web apps (appleid.apple.com, apple.com): calm, light, one blue accent, the system font, rounded surfaces, and motion that responds to the user.

All of it lives in one MUI theme, [`frontend/src/theme/index.js`](frontend/src/theme/index.js), applied to every route in [`main.jsx`](frontend/src/main.jsx). **Most of the time you get the design for free by using plain MUI components without styling them.** This document says which component to reach for and what not to override.

If you change the theme, update this file in the same PR.

## Principles

1. **Use the theme, not hex codes.** Write `color: 'text.secondary'`, `bgcolor: 'background.default'`, `borderColor: 'divider'`. A hex value in `sx` is a review comment.
2. **One accent.** Blue (`primary`) marks the single most important action on a screen. Red, green and orange mean error, success and warning, never decoration.
3. **Quiet by default.** Secondary actions are gray capsules, surfaces are white on a light gray page, borders are hairlines. Let content carry the page.
4. **Respond instantly.** Buttons press down on click, errors appear next to the field that caused them, and long actions show a spinner in the button that started them.
5. **Respect the user's settings.** Every effect has a fallback for reduced motion, reduced transparency and increased contrast. The theme handles this. Keep it working when you add motion.

## Color

| Token (`tokens.*`) | Value | Use via MUI | For |
|---|---|---|---|
| `page` | `#f5f5f7` | `background.default` | Page background, subtle fills, table headers |
| `surface` | `#ffffff` | `background.paper` | Cards, dialogs, menus, fields |
| `text` | `#1d1d1f` | `text.primary` | Body text and headings |
| `secondary` | `#6e6e73` | `text.secondary` | Supporting text, labels, table headers |
| `accent` | `#0071e3` | `primary.main` | Primary buttons, focus, selected nav |
| `link` | `#0066cc` | `Link`, text buttons | Inline links |
| `error` | `#e30000` | `error.main` | Errors, destructive actions |
| `success` | `#248a3d` | `success.main` | Approved, completed |
| `warning` | `#b25000` | `warning.main` | Needs attention |
| `hairline` | `rgba(0,0,0,0.08)` | `divider` | Card borders, table rows, separators |
| `fieldBorder` | `#d2d2d7` | (theme only) | Input borders |
| `secondaryButton` | `#e8e8ed` | `variant="outlined"` | Secondary button fill |

Import `tokens` from `theme` only when MUI has no palette key for the value (for example, a box shadow).

## Typography

The system font stack (San Francisco on Apple devices, then Helvetica Neue and Arial). Don't import web fonts. The scale and letter spacing copy apple.com.

| Variant | Size / line height | Spacing | Use |
|---|---|---|---|
| `h1` | 48 / 52 | −0.003em | Marketing-size hero (rare) |
| `h2` | 40 / 44 (32 on phones) | 0 | **Page title**, one per page |
| `h3` | 32 / 36 | +0.004em | Auth screen titles |
| `h4` | 28 / 32 | +0.007em | Big numbers in stat tiles |
| `h5` | 24 / 28 | +0.009em | Card titles in the cycle report, pillar scores |
| `h6` | 21 / 25 | +0.011em | **Section card titles** |
| `subtitle1` | 17 / 25, 600 | −0.022em | Item headings, empty-state headings |
| `subtitle2` | 14 / 20, 600 | −0.016em | Field-group labels, small headings |
| `body1` | 17 / 25 | −0.022em | Default text |
| `body2` | 14 / 20 | −0.016em | Secondary text, descriptions, table cells |
| `caption` | 12 / 16 | −0.01em | Metadata, timestamps |

- **Why the spacing flips sign:** headings from 21px to 32px use slightly *positive* tracking and body text uses *negative*. That's what makes San Francisco look natural on the web. Tightening headings makes them look cramped and computer-generated, so never set `letterSpacing` yourself.
- **No all caps.** `button` and `overline` already have `textTransform: none`. Avoid `overline` for section titles; use a `SectionCard` title instead.
- **Emphasis is weight (600),** not color or italics. For a fraction like "3/13", put the denominator in `text.secondary` at weight 400.

## Layout and spacing

Even spacing is what makes a page feel balanced. Use only these values:

| What | Value |
|---|---|
| Gap between cards and columns | `3` (24px) on desktop, `2` (16px) on phones |
| Padding inside a card | `3` (24px), `2.5` (20px) on phones |
| Space under a page header | `4`–`5` (32–40px) |
| Corners | 18px cards, 14px nested boxes and items, 12px fields and menus, pill buttons |

- **Make rows equal:** put stat tiles and peer cards in CSS grid columns of equal width (`repeat(n, minmax(0, 1fr))`), so tops and bottoms line up. Don't leave one card alone on a row; use a full-width row instead.
- **Two-column pages:** a list on the left (`5fr`), the detail on the right (`7fr`), stacking below 1200px.
- **Nested boxes:** inside a card, group related items in `background.default` boxes with 14px corners, not borders inside borders.

## Buttons

| Situation | Component |
|---|---|
| The main action on a screen or dialog (one per view) | `<Button variant="contained">` |
| Any other action: Cancel, Save as Draft, Back | `<Button variant="outlined">` (gray capsule) |
| Destructive or positive secondary action | `<Button variant="outlined" color="error">` / `color="success"` (tinted capsule) |
| Inline, low-emphasis action: Resend code, Change email | `<Button variant="text">` |
| Navigation inside a sentence | `<Link component={RouterLink}>` |

- All buttons are capsules (`borderRadius: 980`), with no ripple and no shadow. They shrink to 97% while pressed.
- Use `size="large"` (50px tall) for full-width form submits and the default size elsewhere.
- **Loading:** pass `loading={submitting}` and keep the label unchanged. Don't swap it for "Saving...".
- **Labels:** Title Case verbs, such as "Sign In", "Create Account" or "Save KPI". Don't put arrow icons on buttons.

## Fields

Every field uses one style: white, 12px corners, a hairline border, and the label inside the box. On focus the border turns blue and gets a soft blue ring. On error the border turns red and the field gets a pale red tint.

- `TextField`, `Select` and `FormControl` default to `variant="filled"`. Don't pass `variant`.
- **Always pass `label`.** If the label is shown outside the field (for example in a `Typography` above it), pass `hiddenLabel` so the text sits in the middle of the box.
- Put the error message in `helperText` under the field it belongs to. Use an `Alert` only for errors that aren't tied to one field.
- Set `autoComplete` on every sign-in or profile field (`email`, `name`, `current-password`, `new-password`, `one-time-code`) so password managers and autofill work.
- Use `PasswordField` from [`AuthFields.jsx`](frontend/src/components/AuthFields.jsx) for passwords. It includes the show/hide toggle.

## Surfaces

| Surface | How | Look |
|---|---|---|
| Page | (layout) | `background.default` gray |
| Card | `<Card>` or `<Paper variant="outlined">` | White, 18px (Card) or 12px (Paper) corners, small shadow or hairline border |
| Dialog | `<Dialog>` | White, 18px corners, large shadow, dimmed backdrop |
| Menu, popover | MUI defaults | 12px corners, large shadow |
| Header, sidebar | `AppBar`, `Drawer` | Frosted glass (`chromeMaterial`) with a hairline edge |

- Shadows come in three depths only (`theme.shadows`): resting (1–4), raised (5–12) and overlay (13–24). Don't write custom `boxShadow` values.
- Don't put a card inside a card. Group with spacing and a `Divider` instead.
- Use `chromeMaterial` (exported from `theme`) for anything that floats over scrolling content. It switches to a solid background when the user has reduced transparency turned on.

## Icons

The portal uses one icon style: **Framework7 Icons** (`f7:`, MIT license), which are drawn to match Apple's SF Symbols. They live as MUI `SvgIcon` components in [`components/icons.jsx`](frontend/src/components/icons.jsx).

- Import from `components/icons` (for example `import { KpiIcon } from '../components/icons'`). Don't add new `@mui/icons-material` imports. Their heavier Material style clashes with the rest of the app.
- **Adding an icon:** search with `npx better-icons search <word> --prefix f7`, fetch it with `npx better-icons get f7:<name>`, then add it to `icons.jsx` with the same `f7Icon(...)` pattern and a `// f7:<name>` comment.
- Name icons after their meaning in the app (`KpiIcon`, `SignOutIcon`), not their shape.
- Use the outline version by default. Use `-fill` only for status (for example a filled check for "done").

### Icon badges

To make an icon stand out (on cards, empty states or status), put it on a tinted rounded square with `<IconBadge icon={...} tint="blue" />`. Tints carry meaning:

| Tint | Meaning |
|---|---|
| `blue` | Main or neutral action |
| `green` | Joining, success, positive |
| `orange` | Waiting, needs attention |
| `red` | Missed, failed |
| `gray` | Informational, empty states, step lists |

### Section cards, empty states and stat tiles

- `<SectionCard icon title subtitle action>` is every page section: 18px corners, 24px padding, and a header with an optional icon badge, a title (`h6`), a one-line subtitle and right-aligned actions.
- `<EmptyState icon title description>` goes inside a section that has no content yet. Always say what will appear and when (for example, "Your mentor's notes will appear here after they review your report.").
- `<StatTile icon tint label value detail progress>` shows one number with context. Use 2 per row on phones and 4 on desktop.

### Action cards

When the whole card is clickable (a choice between paths, or a shortcut to a section), use `<ActionCard>`. It shows an icon badge, a title, one line of description and a blue call to action with a chevron. It lifts slightly on hover and presses in on click. Pass `onClick`, or `component={RouterLink}` with `to`.

## Navigation

- The selected sidebar item is a rounded blue-tinted pill with a blue icon. `ListItemButton` with `selected` gets this automatically.
- Name nav items after what's inside them ("KPIs", "Founders"), not vague words ("Home", "Manage").

## Motion

| Moment | Behaviour | Where |
|---|---|---|
| Press | Scale to 0.97 for 100ms | Theme (all buttons) |
| Next step in a flow | Slides 24px in the direction of travel: forward from the right, back from the left | `AuthScreen` with `useAuthStep` |
| Rejected attempt | Card shakes sideways (420ms), as macOS does for a wrong password | `AuthScreen` `shakeOn` prop |
| Focus | Border and ring fade in over 150ms | Theme (fields) |

- **Easing:** `cubic-bezier(0.2, 0.8, 0.2, 1)`, a smooth settle with no overshoot. Only add bounce when the user flicked or dragged something.
- **Only animate `transform` and `opacity`.**
- **Reduced motion:** every slide becomes a short fade, and shake and press-scale are turned off. Check `prefers-reduced-motion` in any new animation.

## Writing

- **Buttons and titles:** Title Case ("Create Your Account", "Update Password").
- **Messages, helper text and errors:** sentence case, plain words, saying what to do next. For example, "Choose a password with at least 8 characters.", not "Invalid password".
- Keep it short. The subtitle under a page title is one sentence.
- Use "or" in lowercase between alternatives ("Continue with Google" / or / email form).

## Key files

| File | What |
|---|---|
| [`theme/index.js`](frontend/src/theme/index.js) | Tokens, `chromeMaterial` and every component override |
| [`main.jsx`](frontend/src/main.jsx) | Applies the theme and `CssBaseline` to the whole app |
| [`layouts/EmptyLayout.jsx`](frontend/src/layouts/EmptyLayout.jsx) | Signed-out shell: frosted header and gray page |
| [`layouts/MainLayout.jsx`](frontend/src/layouts/MainLayout.jsx) | Signed-in shell: frosted app bar and sidebar |
| [`components/AuthScreen.jsx`](frontend/src/components/AuthScreen.jsx) | Centred card with title, subtitle, step slide and shake |
| [`components/AuthFields.jsx`](frontend/src/components/AuthFields.jsx) | `GoogleSignInButton`, `PasswordField` |
| [`components/OtpVerificationForm.jsx`](frontend/src/components/OtpVerificationForm.jsx) | Six-box verification code entry |
| [`components/icons.jsx`](frontend/src/components/icons.jsx) | The app's SF-style icon set |
| [`components/IconBadge.jsx`](frontend/src/components/IconBadge.jsx) | Tinted icon badge |
| [`components/SectionCard.jsx`](frontend/src/components/SectionCard.jsx) | The standard section card |
| [`components/EmptyState.jsx`](frontend/src/components/EmptyState.jsx) | Icon + heading + sentence for empty sections |
| [`components/StatTile.jsx`](frontend/src/components/StatTile.jsx) | One number with label, context and optional progress bar |
| [`components/ActionCard.jsx`](frontend/src/components/ActionCard.jsx) | Whole-card button with badge, title and call to action |
| [`pages/student/PageOverview.jsx`](frontend/src/pages/student/PageOverview.jsx) | Reference page: page header, action cards, status timeline, empty state |

## PR checklist for UI changes

- [ ] No hex colors, `fontFamily`, `letterSpacing` or `textTransform` in `sx`.
- [ ] Icons come from `components/icons`, not `@mui/icons-material`.
- [ ] Pages open with a large title and a one-line subtitle. Empty sections show an icon, a short heading and one sentence, never a bare "No data".
- [ ] One `contained` button per view. Everything else is `outlined` or `text`.
- [ ] Every field has a `label` (or `hiddenLabel` with a visible label nearby) and the right `autoComplete`.
- [ ] Errors show next to the field that caused them.
- [ ] New motion uses `transform`/`opacity` and has a reduced-motion fallback.
- [ ] Works at 375px wide with no horizontal scrolling.

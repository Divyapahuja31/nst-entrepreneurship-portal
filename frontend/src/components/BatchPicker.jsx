import React from 'react'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { useRevalidator } from 'react-router'

import { api } from '../api/client'
import { useBatchStore } from '../stores/batch'

const ALL = ''

// "2026–2030 · Delhi"
const labelOf = batch =>
  `${batch.name} · ${batch.campus?.name ?? 'Unknown campus'}`

const newestFirst = (a, b) =>
  (b.startYear ?? 0) - (a.startYear ?? 0) ||
  labelOf(a).localeCompare(labelOf(b))

// The admin's batch switch: it narrows Overview, Startups, Founders, KPIs
// and Accounts to one batch. Outlined in the primary color while a batch is
// chosen, so a narrowed page is never mistaken for every batch.
export default function BatchPicker() {
  const batchId = useBatchStore(state => state.batchId)
  const setBatch = useBatchStore(state => state.setBatch)
  const revalidator = useRevalidator()
  // null until the first list arrives.
  const [batches, setBatches] = React.useState(null)

  // Loaded again each time the menu opens, so a batch just added or
  // removed in School Setup shows without reloading the page. A failed load
  // keeps the list it had.
  const load = React.useCallback(() => {
    api
      .get('/auth/google/signup-options')
      .then(({ data }) =>
        setBatches([...(data.batches ?? [])].sort(newestFirst))
      )
      .catch(() => {})
  }, [])

  React.useEffect(load, [load])

  // A batch removed since it was chosen: back to every batch.
  const gone = batches && batchId && !batches.some(b => b._id === batchId)
  React.useEffect(() => {
    if (gone) {
      setBatch(null)
      revalidator.revalidate()
    }
    // revalidator changes on every render; only `gone` matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gone, setBatch])

  const choose = event => {
    setBatch(event.target.value)
    revalidator.revalidate()
  }

  const narrowed = Boolean(batchId) && !gone

  return (
    <TextField
      select
      size="small"
      label="Batch"
      value={narrowed ? batchId : ALL}
      onChange={choose}
      slotProps={{
        select: { displayEmpty: true, onOpen: load },
        inputLabel: { shrink: true },
      }}
      focused={narrowed || undefined}
      sx={{ ml: 'auto', width: { xs: 160, sm: 240 } }}
    >
      <MenuItem value={ALL}>All batches</MenuItem>
      {(batches ?? []).map(batch => (
        <MenuItem key={batch._id} value={batch._id}>
          {labelOf(batch)}
        </MenuItem>
      ))}
      {/* The chosen batch while the list is still loading. */}
      {!batches && batchId && (
        <MenuItem value={batchId} disabled>
          Loading…
        </MenuItem>
      )}
    </TextField>
  )
}

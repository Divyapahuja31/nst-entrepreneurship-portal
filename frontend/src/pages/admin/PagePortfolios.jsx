import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'

import React from 'react'
import { Link, useLoaderData, useRevalidator } from 'react-router'

import CustomizedTable from '../../components/Table'
import { deleteFounders } from '../../api/admin'

const FILTER_LABELS = {
  campus: 'All campuses',
  stage: 'All stages',
  status: 'All statuses',
}

const columnNames = [
  { key: 'founder', label: 'Founder' },
  { key: 'startup', label: 'Startup' },
  { key: 'campus', label: 'Campus' },
  { key: 'stage', label: 'Stage' },
  { key: 'team', label: 'Team', align: 'right' },
  { key: 'score', label: 'Score', align: 'right' },
  { key: 'status', label: 'Status' },
]

const REMOVED = 'Founder removed successfully'

function Portfolio() {
  const noLabelId = React.useId()
  const { students, ...filterData } = useLoaderData()
  const revalidator = useRevalidator()
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const [error, setError] = React.useState('')
  const [notice, setNotice] = React.useState('')
  const [filters, setFilters] = React.useState({})
  const [selectedRows, setSelectedRows] = React.useState([])
  const founderQuery = (filters.founder ?? '').trim().toLowerCase()

  const visibleStudents = students.filter(student => {
    if (
      !String(student?.founder ?? '')
        .toLowerCase()
        .includes(founderQuery)
    ) {
      return false
    }
    return Object.keys(filterData).every(key => {
      const selected = filters[key]
      if (!selected) return true
      return (
        String(student?.[key] ?? '').toLowerCase() === selected.toLowerCase()
      )
    })
  })
  // Only rows that are still visible count as selected: a founder hidden by
  // a filter must never be removed by a click the admin can't see.
  const visibleById = new Map(
    visibleStudents.map(student => [String(student.id), student])
  )
  const selectedVisible = selectedRows.filter(id => visibleById.has(String(id)))
  const selectedStudents = selectedVisible.map(id =>
    visibleById.get(String(id))
  )

  const nameOf = id =>
    students.find(student => String(student.id) === String(id))?.founder ?? id

  const handleRemoveFounders = async () => {
    const founders = selectedVisible

    setConfirming(false)
    setIsDeleting(true)
    setError('')
    setNotice('')

    const response = await deleteFounders(founders)

    setIsDeleting(false)

    if (response.error) {
      // Keep the selection so the admin can retry.
      setError(response.error)
      return
    }

    const results = response.data?.result ?? []
    const failed = results.filter(item => item.message !== REMOVED)
    const removedCount = results.length - failed.length

    setSelectedRows([])
    if (removedCount) {
      setNotice(
        `Removed ${removedCount} founder${removedCount === 1 ? '' : 's'} from their startup.`
      )
    }
    if (failed.length) {
      setError(
        `Could not remove ${failed
          .map(item => `${nameOf(item.founderId)} (${item.message})`)
          .join(', ')}.`
      )
    }
    revalidator.revalidate()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button component={Link} to="/admin/founders/new" variant="contained">
          Add founder
        </Button>
      </div>

      {error && (
        <Alert severity="error" sx={{ my: 1 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ my: 1 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      <div
        className="container"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          width: '100%',
          height: '100px',
        }}
      >
        <div className="input">
          <TextField
            id="outlined-basic"
            label="Founder"
            variant="outlined"
            value={filters.founder ?? ''}
            onChange={event =>
              setFilters(prev => ({ ...prev, founder: event.target.value }))
            }
          />
          <Button
            onClick={() => setConfirming(true)}
            disabled={selectedVisible.length === 0 || isDeleting}
            variant="contained"
            color="error"
            style={{ marginTop: '2%', marginLeft: '10px' }}
          >
            {isDeleting
              ? 'Removing...'
              : `Remove from startup${selectedVisible.length ? ` (${selectedVisible.length})` : ''}`}
          </Button>
        </div>
        <div>
          {Object.keys(filterData).map(key => (
            <FormControl key={key} sx={{ m: 1, minWidth: 120 }}>
              <Select
                aria-describedby={`${noLabelId}-helper-text`}
                displayEmpty
                inputProps={{ 'aria-label': key }}
                value={filters[key] ?? ''}
                onChange={event =>
                  setFilters(prev => ({ ...prev, [key]: event.target.value }))
                }
              >
                <MenuItem value="">
                  <em>{FILTER_LABELS[key] ?? `All ${key}`}</em>
                </MenuItem>
                {filterData[key].map(data => (
                  <MenuItem key={data} value={data}>
                    {data}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
        </div>
      </div>

      <CustomizedTable
        data={visibleStudents}
        selectedRows={selectedVisible}
        setSelectedRows={setSelectedRows}
        columnNames={columnNames}
        targetRoute="/admin/profile"
      />

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Remove {selectedStudents.length} founder
          {selectedStudents.length === 1 ? '' : 's'} from their startup?
        </DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {selectedStudents.map(student => (
                <li key={student.id}>
                  {student.founder} ({student.startup})
                </li>
              ))}
            </ul>
            <p style={{ marginBottom: 0 }}>
              Their accounts and past KPIs stay. They can join or propose a
              startup again later.
            </p>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRemoveFounders}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default Portfolio

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'

import React from 'react'
import { Link, useFetcher, useLoaderData } from 'react-router'

import CustomizedTable from '../../components/Table'

const FILTER_LABELS = {
  campus: 'All campuses',
  stage: 'All stages',
  status: 'All statuses',
}

function Portfolio() {
  const noLabelId = React.useId()
  const { students, ...filterData } = useLoaderData()
  const fetcher = useFetcher()
  const isDeleting = fetcher.state !== 'idle'
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
  const handleDeleteFounders = () => {
    if (selectedRows.length === 0) {
      alert('Please select at least one founder to delete.')
      return
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedRows.length} founder(s)?`
    )
    if (!confirmDelete) {
      return
    }

    const foundersToDelete = students
      .filter(s => selectedRows.includes(s.id))
      .map(s => ({
        founderId: s.id,
        founderName: s.founder,
        startupName: s.startup,
      }))

    setSelectedRows([])

    fetcher.submit(
      { intent: 'deleteFounders', founders: foundersToDelete },
      { method: 'post', encType: 'application/json' }
    )
  }
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button component={Link} to="/admin/founders/new" variant="contained">
          Add founder
        </Button>
      </div>

      {fetcher.data?.error && (
        <Alert severity="error" sx={{ my: 1 }}>
          {fetcher.data.error}
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
            onClick={handleDeleteFounders}
            disabled={selectedRows.length === 0 || isDeleting}
            variant="contained"
            color="error"
            style={{ marginTop: '2%', marginLeft: '10px' }}
          >
            {isDeleting ? 'Deleting...' : 'Delete Founders'}
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
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
      />
    </div>
  )
}

export default Portfolio

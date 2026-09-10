import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'

import React from 'react'
import { Link, useLoaderData } from 'react-router'

import CustomizedTable from '../../components/Table'

const FILTER_LABELS = {
  campus: 'All campuses',
  stage: 'All stages',
  status: 'All statuses',
}

function Profile() {
  const noLabelId = React.useId()
  const { students, ...filterData } = useLoaderData()
  const [filters, setFilters] = React.useState({})

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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button component={Link} to="/admin/founders/new" variant="contained">
          Add founder
        </Button>
      </div>

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

      <CustomizedTable data={visibleStudents} />
    </div>
  )
}

export default Profile

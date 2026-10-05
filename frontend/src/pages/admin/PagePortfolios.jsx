import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'

import React from 'react'
import { Link, useLoaderData, useRevalidator } from 'react-router'

import EmptyState from '../../components/EmptyState'
import PageHeader from '../../components/PageHeader'
import SectionCard from '../../components/SectionCard'
import CustomizedTable from '../../components/Table'
import StatusPill from '../../components/StatusPill'
import { PeopleIcon, PlusIcon } from '../../components/icons'
import { deleteFounders } from '../../api/admin'

const FILTER_LABELS = {
  campus: 'Campus',
  stage: 'Stage',
  status: 'Status',
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

const HEALTH_TINTS = {
  'on track': 'green',
  watch: 'orange',
  'at risk': 'red',
}

// The status column as a pill; filtering still uses the plain string.
const withStatusPill = student => ({
  ...student,
  status: student.status ? (
    <StatusPill
      label={student.status}
      tint={HEALTH_TINTS[String(student.status).toLowerCase()] || 'gray'}
      plain={!HEALTH_TINTS[String(student.status).toLowerCase()]}
    />
  ) : (
    '-'
  ),
})

function Portfolio() {
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
    <Box sx={{ maxWidth: 1080, mx: 'auto' }}>
      <PageHeader
        title="Founders"
        subtitle="Everyone in a startup, with their latest score and status."
        action={
          <Button
            component={Link}
            to="/admin/founders/new"
            variant="contained"
            startIcon={<PlusIcon />}
          >
            Add Founder
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          mb: 3,
        }}
      >
        <TextField
          label="Search founders"
          type="search"
          value={filters.founder ?? ''}
          onChange={event =>
            setFilters(prev => ({ ...prev, founder: event.target.value }))
          }
          sx={{ flex: '1 1 220px', maxWidth: { sm: 320 } }}
        />
        {Object.keys(filterData).map(key => (
          <TextField
            key={key}
            select
            label={FILTER_LABELS[key] ?? key}
            value={filters[key] ?? ''}
            onChange={event =>
              setFilters(prev => ({ ...prev, [key]: event.target.value }))
            }
            slotProps={{
              select: { displayEmpty: true },
              inputLabel: { shrink: true },
            }}
            sx={{ flex: '0 1 160px', minWidth: 140 }}
          >
            <MenuItem value="">All</MenuItem>
            {filterData[key].map(data => (
              <MenuItem key={data} value={data}>
                {data}
              </MenuItem>
            ))}
          </TextField>
        ))}
        {selectedVisible.length > 0 && (
          <Button
            variant="outlined"
            color="error"
            loading={isDeleting}
            onClick={() => setConfirming(true)}
            sx={{ ml: { sm: 'auto' } }}
          >
            Remove from Startup ({selectedVisible.length})
          </Button>
        )}
      </Box>

      {visibleStudents.length ? (
        <CustomizedTable
          data={visibleStudents.map(withStatusPill)}
          selectedRows={selectedVisible}
          setSelectedRows={setSelectedRows}
          columnNames={columnNames}
          targetRoute="/admin/profile"
        />
      ) : (
        <SectionCard>
          <EmptyState
            icon={PeopleIcon}
            title={students.length ? 'No matches' : 'No founders yet'}
            description={
              students.length
                ? 'No founders match these filters.'
                : 'Founders appear here once they join or create a startup.'
            }
          />
        </SectionCard>
      )}

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
          <Button variant="outlined" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRemoveFounders}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Portfolio

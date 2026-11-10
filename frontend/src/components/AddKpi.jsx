import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  Typography,
  TextField,
  Button,
  Box,
  IconButton,
  MenuItem,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

export default function AddKpi({
  open,
  onClose,
  onSave,
  initialData,
  members = [],
}) {
  const [prevData, setPrevData] = useState(null)
  const [prevOpen, setPrevOpen] = useState(false)

  const [kpiName, setKpiName] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [founderId, setFounderId] = useState('')
  const [subKpis, setSubKpis] = useState([])

  if (open !== prevOpen || initialData !== prevData) {
    setPrevOpen(open)
    setPrevData(initialData)
    if (open && initialData) {
      setKpiName(initialData.title || '')
      setDescription(initialData.description || '')
      setDueDate(initialData.dueDate ? initialData.dueDate.split('T')[0] : '')
      setFounderId(initialData.founder?._id || initialData.founder || '')
      setSubKpis(
        initialData.subKPIs
          ? initialData.subKPIs.map((sub, idx) => ({
              id: sub._id || sub.id || idx,
              name: sub.name,
            }))
          : []
      )
    } else if (open && !initialData) {
      setKpiName('')
      setDescription('')
      setDueDate('')
      setFounderId('')
      setSubKpis([])
    }
  }

  const handleAddSubKpi = () => {
    const newSubKpi = {
      id: Date.now(),
      name: '',
    }

    setSubKpis(prev => [...prev, newSubKpi])
  }

  const handleSubKpiChange = (id, value) => {
    setSubKpis(prev =>
      prev.map(subKpi =>
        subKpi.id === id
          ? {
              ...subKpi,
              name: value,
            }
          : subKpi
      )
    )
  }

  const handleDeleteSubKpi = id => {
    setSubKpis(prev => prev.filter(subKpi => subKpi.id !== id))
  }

  const handleSave = async status => {
    if (!kpiName.trim()) {
      alert('Enter KPI metric name')
      return
    }

    const validSubKpis = subKpis.filter(subKpi => subKpi.name.trim())

    try {
      await onSave({
        title: kpiName.trim(),
        description: description.trim() || kpiName.trim(),
        dueDate,
        status,
        founder: founderId || null,
        subKpis: validSubKpis,
      })

      setKpiName('')
      setDescription('')
      setDueDate('')
      setFounderId('')
      setSubKpis([])

      onClose()
    } catch (error) {
      alert(error.message)
    }
  }

  const handleCancel = () => {
    setKpiName('')
    setDescription('')
    setDueDate('')
    setFounderId('')
    setSubKpis([])
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <IconButton
        onClick={onClose}
        aria-label="close"
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 1,
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent
        sx={{
          padding: 4,
          paddingTop: 6,
        }}
      >
        <Typography
          sx={{
            fontSize: '14px',
            marginBottom: 1,
          }}
        >
          KPI / Metric Name
        </Typography>

        <TextField
          hiddenLabel
          fullWidth
          size="small"
          placeholder="Enter KPI / Metric Name"
          value={kpiName}
          onChange={e => setKpiName(e.target.value)}
          sx={{
            mb: 3,
          }}
        />

        <Typography
          sx={{
            fontSize: '14px',
            marginBottom: 1,
          }}
        >
          Description
        </Typography>

        <TextField
          hiddenLabel
          fullWidth
          multiline
          rows={2}
          size="small"
          placeholder="Enter KPI description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          sx={{
            mb: 3,
          }}
        />

        <Typography
          sx={{
            fontSize: '14px',
            marginBottom: 1,
          }}
        >
          Owner
        </Typography>

        <TextField
          hiddenLabel
          select
          fullWidth
          size="small"
          value={founderId}
          onChange={e => setFounderId(e.target.value)}
          // "Entire Startup" is the empty value; without this the field
          // looks blank when it's chosen.
          slotProps={{ select: { displayEmpty: true } }}
          sx={{
            mb: 3,
          }}
        >
          <MenuItem value="">
            <em>Entire Startup (Startup-wide KPI)</em>
          </MenuItem>
          {members.map(member => (
            <MenuItem
              key={member.id || member._id}
              value={member.id || member._id}
            >
              {member.username || member.email || 'Member'}
            </MenuItem>
          ))}
        </TextField>

        <Typography
          sx={{
            fontSize: '14px',
            marginBottom: 1,
          }}
        >
          Due Date
        </Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            marginBottom: 3,
          }}
        >
          <TextField
            hiddenLabel
            type="date"
            size="small"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            sx={{
              width: 145,
            }}
          />

          <Button variant="outlined" onClick={handleAddSubKpi}>
            Add SubKpi
          </Button>
        </Box>

        <Typography
          sx={{
            fontSize: '14px',
            marginBottom: 1,
          }}
        >
          Subgrades / Subcategories (Optional)
        </Typography>

        {subKpis.length === 0 && (
          <Typography
            sx={{
              fontSize: '13px',
              fontStyle: 'italic',
              color: 'text.secondary',
              marginBottom: 2,
            }}
          >
            No subgrades added. Click above to break this KPI into granular
            metrics.
          </Typography>
        )}

        {subKpis.map((subKpi, index) => (
          <Box
            key={subKpi.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              marginBottom: 2,
            }}
          >
            <TextField
              hiddenLabel
              fullWidth
              size="small"
              placeholder={`SubKPI ${index + 1}`}
              value={subKpi.name}
              onChange={e => handleSubKpiChange(subKpi.id, e.target.value)}
              sx={{}}
            />

            <IconButton onClick={() => handleDeleteSubKpi(subKpi.id)}>
              <CloseIcon />
            </IconButton>
          </Box>
        ))}

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
            marginTop: 4,
          }}
        >
          <Button variant="outlined" onClick={handleCancel}>
            Cancel
          </Button>

          <Button variant="outlined" onClick={() => handleSave('DRAFT')}>
            Save As Draft
          </Button>

          <Button variant="contained" onClick={() => handleSave('SUBMIT')}>
            Save KPI
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

import { useState } from 'react'
import { Dialog, DialogContent, Typography, TextField, Button, Box, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

export default function AddKpi({ open, onClose, onSave, initialData }) {
  const [prevData, setPrevData] = useState(null)
  const [prevOpen, setPrevOpen] = useState(false)

  const [kpiName, setKpiName] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [subKpis, setSubKpis] = useState([])

  if (open !== prevOpen || initialData !== prevData) {
    setPrevOpen(open)
    setPrevData(initialData)
    if (open && initialData) {
      setKpiName(initialData.title || '')
      setDescription(initialData.description || '')
      setDueDate(initialData.dueDate ? initialData.dueDate.split('T')[0] : '')
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
      setSubKpis([])
    }
  }

  const handleAddSubKpi = () => {
    const newSubKpi = {
      id: Date.now(),
      name: '',
    }

    setSubKpis(prev => [
      ...prev,
      newSubKpi,
    ])
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
    setSubKpis(prev =>
      prev.filter(
        subKpi => subKpi.id !== id
      )
    )
  }

  const handleSave = async status => {
    if (!kpiName.trim()) {
      alert('Enter KPI metric name')
      return
    }

    const validSubKpis = subKpis.filter(
      subKpi => subKpi.name.trim()
    )

    try {
      await onSave({
        title: kpiName.trim(),
        description: description.trim() || kpiName.trim(),
        dueDate,
        status,
        subKpis: validSubKpis,
      })

      setKpiName('')
      setDescription('')
      setDueDate('')
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
    setSubKpis([])
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#fff',
          color: '#222',
          borderRadius: '8px',
        },
      }}
    >
      <IconButton
        onClick={onClose}
        aria-label="close"
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          color: '#000',
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
          fullWidth
          size="small"
          placeholder="Enter KPI / Metric Name"
          value={kpiName}
          onChange={e =>
            setKpiName(e.target.value)
          }
          sx={{
            mb: 3,

            '& .MuiInputBase-root': {
              backgroundColor: '#ffffff',
              color: '#000000',
            },
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
          fullWidth
          multiline
          rows={2}
          size="small"
          placeholder="Enter KPI description"
          value={description}
          onChange={e =>
            setDescription(e.target.value)
          }
          sx={{
            mb: 3,

            '& .MuiInputBase-root': {
              backgroundColor: '#ffffff',
              color: '#000000',
            },
          }}
        />

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
            type="date"
            size="small"
            value={dueDate}
            onChange={e =>
              setDueDate(e.target.value)
            }
            sx={{
              width: 145,
              backgroundColor: '#ffffff',

              '& input': {
                color: '#000000',
              },
            }}
          />

          <Button
            variant="contained"
            onClick={handleAddSubKpi}
            sx={{
              backgroundColor: '#f4f4f4',
              color: '#374151',
              textTransform: 'none',

              '&:hover': {
                backgroundColor: '#ddd',
              },
            }}
          >
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
              color: '#000000',
              marginBottom: 2,
            }}
          >
            No subgrades added. Click above
            to break this KPI into granular
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
              fullWidth
              size="small"
              placeholder={`SubKPI ${index + 1}`}
              value={subKpi.name}
              onChange={e =>
                handleSubKpiChange(
                  subKpi.id,
                  e.target.value
                )
              }
              sx={{
                '& .MuiInputBase-root': {
                  backgroundColor: '#ffffff',
                  color: '#000000',
                },
              }}
            />

            <IconButton
              onClick={() =>
                handleDeleteSubKpi(subKpi.id)
              }
              sx={{
                color: '#000000',
              }}
            >
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
          <Button
            variant="contained"
            onClick={handleCancel}
            sx={{
              backgroundColor: '#f1f1f1',
              color: '#374151',
              textTransform: 'none',

              '&:hover': {
                backgroundColor: '#ddd',
              },
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={() =>
              handleSave('DRAFT')
            }
            sx={{
              backgroundColor: '#f1f1f1',
              color: '#374151',
              textTransform: 'none',

              '&:hover': {
                backgroundColor: '#ddd',
              },
            }}
          >
            Save As Draft
          </Button>

          <Button
            variant="contained"
            onClick={() =>
              handleSave('SUBMIT')
            }
            sx={{
              backgroundColor: '#f1f1f1',
              color: '#374151',
              textTransform: 'none',

              '&:hover': {
                backgroundColor: '#ddd',
              },
            }}
          >
            Save KPI
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

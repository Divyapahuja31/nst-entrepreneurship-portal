import { useState, useRef } from 'react'
import { Dialog, DialogContent, Box, Typography, Button, IconButton, TextField } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'

export default function UploadEvidenceDialog({ open, onClose, kpi, onSave, onDelete }) {
  const [prevOpen, setPrevOpen] = useState(false)
  const [prevKpi, setPrevKpi] = useState(null)
  const [file, setFile] = useState(null)
  const [supportingText, setSupportingText] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  if (open !== prevOpen || kpi !== prevKpi) {
    setPrevOpen(open)
    setPrevKpi(kpi)
    if (open && kpi) {
      setSupportingText(kpi.evidence?.supportingText || '')
      setFile(null)
      setError('')
    }
  }

  const handleClose = () => {
    setFile(null)
    setSupportingText('')
    setError('')
    onClose()
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size exceeds the 10MB limit.')
        setFile(null)
        e.target.value = null
        return
      }
      setError('')
      setFile(selectedFile)
    }
  }

  const handleSave = () => {
    if (onSave) {
      onSave({ kpi, file, supportingText })
    }
    handleClose()
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete({ kpi })
    }
    handleClose()
  }

  const hasExistingEvidence = Boolean(
    kpi?.evidence?.fileName || kpi?.evidence?.supportingText
  )

  let dropzoneText = 'SUPPORTING FILES MUST NOT BE MORE THAN 10MB'
  if (file) {
    dropzoneText = `Selected: ${file.name}`
  } else if (kpi?.evidence?.fileName) {
    dropzoneText = `Current: ${kpi.evidence.fileName} (Click to replace file)`
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#0a0d14',
          color: '#ffffff',
          borderRadius: 2,
          p: 1,
          border: '1px solid #1e2530',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <IconButton onClick={handleClose} sx={{ color: '#000000' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ pt: 0, pb: 2, px: 3 }}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <Box
          onClick={() => fileInputRef.current?.click()}
          sx={{
            border: '2px dashed #4a5568',
            borderRadius: 1.5,
            p: 4,
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: '#ffffff',
            mb: 3,
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 48, color: '#000000', mb: 1 }} />
          <Typography variant="body2" sx={{ fontWeight: 600, letterSpacing: 0.5, color: '#000000' }}>
            {dropzoneText}
          </Typography>
        </Box>
        {error && (
          <Typography color="error" variant="caption" sx={{ display: 'block', mb: 2, fontWeight: 600 }}>
            {error}
          </Typography>
        )}
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5, color: '#000000', display: 'block', mb: 1 }}>
          SUPPORTING TEXT:
        </Typography>
        <TextField
          multiline
          rows={4}
          fullWidth
          value={supportingText}
          onChange={(e) => setSupportingText(e.target.value)}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              color: '#000000',
              backgroundColor: '#ffffff',
              '& fieldset': {
                borderColor: '#4a5568',
              },
              '&:hover fieldset': {
                borderColor: '#90caf9',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#90caf9',
              },
            },
          }}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {hasExistingEvidence ? (
            <Button
              variant="outlined"
              color="error"
              onClick={handleDelete}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Delete Evidence
            </Button>
          ) : (
            <Box />
          )}
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              backgroundColor: '#e2e8f0',
              color: '#0f172a',
              fontWeight: 600,
              textTransform: 'none',
              px: 3,
              '&:hover': {
                backgroundColor: '#ffffff',
              },
            }}
          >
            Save
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

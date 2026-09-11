import { useState, useRef } from 'react'
import { Dialog , DialogContent, DialogActions, Box, Typography, Button, IconButton, TextField, Chip } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

export default function UploadEvidenceDialog({
  open,
  onClose,
  kpi,
  onSave,
  onDelete,
}) {
  const [prevOpen, setPrevOpen] = useState(false)
  const [prevKpi, setPrevKpi] = useState(null)

  const [actualValue, setActualValue] = useState('')
  const [supportingText, setSupportingText] = useState('')
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  if (open !== prevOpen || kpi !== prevKpi) {
    setPrevOpen(open)
    setPrevKpi(kpi)
    if (open && kpi) {
      setActualValue(kpi.actualValue || '')
      setSupportingText(kpi.evidence?.supportingText || '')
      setFile(null)
      setError('')
    }
  }

  const handleClose = () => {
    setFile(null)
    setSupportingText('')
    setActualValue('')
    setError('')
    onClose()
  }

  const handleFileChange = e => {
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
      onSave({
        kpi,
        actualValue: actualValue.trim(),
        supportingText: supportingText.trim(),
        file,
        fileName: file?.name || kpi?.evidence?.fileName || '',
      })
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { position: 'relative' } }}
    >
      <IconButton
        onClick={handleClose}
        size="small"
        aria-label="close"
        sx={{
          position: 'absolute',
          right: 12,
          top: 12,
          color: theme => theme.palette.grey[500],
          zIndex: 1,
        }}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent sx={{ p: 3, pt: 3 }}>
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Metric
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 1 }}
          >
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={actualValue}
            onChange={e => setActualValue(e.target.value)}
            placeholder="Title"
          />
        </Box>

        <Box sx={{ mb: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Description
          </Typography>
          <TextField
            multiline
            rows={4}
            fullWidth
            size="small"
            value={supportingText}
            onChange={e => setSupportingText(e.target.value)}
            placeholder="Description"
          />
        </Box>

        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Attach Evidence File
          </Typography>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          <Box
            onClick={() => fileInputRef.current?.click()}
            sx={{
              border: '2px dashed #cbd5e1',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: '#f8fafc',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: '#f1f5f9',
              },
            }}
          >
            <CloudUploadIcon
              sx={{ fontSize: 40, color: 'primary.main', mb: 0.5 }}
            />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {file ? (
                <Chip
                  icon={<CheckCircleIcon />}
                  label={`Selected: ${file.name}`}
                  color="success"
                  variant="outlined"
                />
              ) : kpi?.evidence?.fileName ? (
                `Current file: ${kpi.evidence.fileName} (Click to replace)`
              ) : (
                'Click to choose file or drag & drop (Max 10MB)'
              )}
            </Typography>
          </Box>
          {error && (
            <Typography
              color="error"
              variant="caption"
              sx={{ display: 'block', mt: 1, fontWeight: 600 }}
            >
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{ fontWeight: 600, textTransform: 'none' }}
          >
            Submit Evidence
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  )
}

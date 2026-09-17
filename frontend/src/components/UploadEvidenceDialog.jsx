import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Chip,
  Alert,
} from '@mui/material'
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

  const isPastDue = Boolean(kpi?.dueDate && new Date(kpi.dueDate) < new Date())
  const isGraded = kpi?.status === 'GRADED'
  const isLocked = isPastDue || isGraded

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
    if (isLocked) return
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
    if (isLocked) return
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
    if (isLocked) return
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
        {isLocked && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {isGraded
              ? 'This KPI has already been graded. Submissions are locked.'
              : 'The deadline for this KPI has passed. Submissions are closed.'}
          </Alert>
        )}

        <Box sx={{ mb: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Achieved Metric / Number
          </Typography>
          <TextField
            fullWidth
            size="small"
            value={actualValue}
            disabled={isLocked}
            onChange={e => setActualValue(e.target.value)}
            placeholder="e.g. $10,000 Revenue or 500 Active Users"
          />
        </Box>

        <Box sx={{ mb: 2.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Supporting Notes / Evidence Description
          </Typography>
          <TextField
            multiline
            rows={3}
            fullWidth
            size="small"
            value={supportingText}
            disabled={isLocked}
            onChange={e => setSupportingText(e.target.value)}
            placeholder="Explain how this metric was achieved or details about the uploaded evidence..."
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
            disabled={isLocked}
            style={{ display: 'none' }}
          />

          <Box
            onClick={() => !isLocked && fileInputRef.current?.click()}
            sx={{
              border: '2px dashed #cbd5e1',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              cursor: isLocked ? 'not-allowed' : 'pointer',
              backgroundColor: isLocked ? '#f1f5f9' : '#f8fafc',
              opacity: isLocked ? 0.7 : 1,
              '&:hover': {
                borderColor: isLocked ? '#cbd5e1' : 'primary.main',
                backgroundColor: isLocked ? '#f1f5f9' : '#f1f5f9',
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
                `Current file: ${kpi.evidence.fileName}${isLocked ? '' : ' (Click to replace)'}`
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
            disabled={isLocked}
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
            disabled={isLocked}
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

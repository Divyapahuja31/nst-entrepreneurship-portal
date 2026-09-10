import { useState, useRef } from 'react'
import { Dialog, DialogContent, Box, Typography, Button, IconButton, TextField } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'

export default function UploadEvidenceDialog({ open, onClose, kpi, onSave }) {
  const [file, setFile] = useState(null)
  const [supportingText, setSupportingText] = useState('')
  const fileInputRef = useRef(null)

  const handleClose = () => {
    setFile(null)
    setSupportingText('')
    onClose()
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSave = () => {
    if (onSave) {
      onSave({ kpi, file, supportingText })
    }
    handleClose()
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
            {file ? file.name : 'SUPPORTING FILES MUST NOT BE MORE THAN 10MB'}
          </Typography>
        </Box>
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

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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

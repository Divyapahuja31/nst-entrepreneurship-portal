import { useState } from 'react'
import { Link, useLoaderData } from 'react-router'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import {
  REPORT_CARD_LIMITS as limits,
  filledReportRows,
  gradedReportError,
  validReportColumns,
} from '@nst/shared/reportCards.js'
import { createReportCard, saveReportCard } from '../../api/reportCards'
import PageHeader from '../../components/PageHeader'
import ReportCard from '../../components/ReportCard'
import SectionCard from '../../components/SectionCard'
import { TrashIcon } from '../../components/icons'
import GradeEntryTable from './GradeEntryTable'
import GradeSetupDialog from './GradeSetupDialog'

const home = '/admin/report-cards'

function StartReportCard({ student, templates, onCreate }) {
  const [templateId, setTemplateId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function start() {
    setSaving(true)
    setError('')
    const result = await createReportCard(student._id, templateId)
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    onCreate(result.card)
  }

  return (
    <SectionCard title="Create a report card">
      {templates.length ? (
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            select
            label="Template"
            value={templateId}
            onChange={event => setTemplateId(event.target.value)}
            disabled={saving}
          >
            {templates.map(template => (
              <MenuItem key={template._id} value={template._id}>
                {template.name}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            disabled={!templateId}
            loading={saving}
            onClick={start}
            sx={{ alignSelf: 'flex-start' }}
          >
            Create Draft
          </Button>
        </Stack>
      ) : (
        <Stack spacing={2} alignItems="flex-start">
          <Typography variant="body2" color="text.secondary">
            Add a template with the columns you want to use.
          </Typography>
          <Button component={Link} to={home} variant="outlined">
            Go to Templates
          </Button>
        </Stack>
      )}
    </SectionCard>
  )
}

function MarksTable({ columns, setColumns, rows, setRows, disabled }) {
  const addColumn = () => {
    setColumns(current => [...current, ''])
    setRows(current => current.map(row => [...row, '']))
  }

  const removeColumn = columnIndex => {
    setColumns(current =>
      current.filter((_column, index) => index !== columnIndex)
    )
    setRows(current =>
      current.map(row => row.filter((_cell, index) => index !== columnIndex))
    )
  }

  const changeCell = (rowIndex, columnIndex, value) =>
    setRows(current =>
      current.map((row, index) =>
        index === rowIndex
          ? row.map((cell, column) => (column === columnIndex ? value : cell))
          : row
      )
    )

  return (
    <Stack spacing={1.5} alignItems="flex-start">
      <TableContainer
        sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
      >
        <Table size="small" aria-label="Report card entries">
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              {columns.map((column, columnIndex) => (
                <TableCell
                  key={columnIndex}
                  scope="col"
                  sx={{ minWidth: 184, p: 1 }}
                >
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <TextField
                      label={`Column ${columnIndex + 1}`}
                      size="small"
                      fullWidth
                      disabled={disabled}
                      value={column}
                      onChange={event => {
                        const { value } = event.target
                        setColumns(current =>
                          current.map((name, index) =>
                            index === columnIndex ? value : name
                          )
                        )
                      }}
                      slotProps={{ htmlInput: { maxLength: limits.column } }}
                    />
                    <IconButton
                      aria-label={`Remove column ${columnIndex + 1}`}
                      disabled={disabled || columns.length === 1}
                      onClick={() => removeColumn(columnIndex)}
                    >
                      <TrashIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              ))}
              <TableCell scope="col">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {row.map((cell, columnIndex) => (
                  <TableCell key={columnIndex} sx={{ minWidth: 144, p: 1 }}>
                    <TextField
                      hiddenLabel
                      fullWidth
                      size="small"
                      multiline
                      maxRows={4}
                      value={cell}
                      disabled={disabled}
                      onChange={event =>
                        changeCell(rowIndex, columnIndex, event.target.value)
                      }
                      slotProps={{
                        htmlInput: {
                          'aria-label': `${columns[columnIndex]}, row ${rowIndex + 1}`,
                          maxLength: limits.cell,
                        },
                      }}
                    />
                  </TableCell>
                ))}
                <TableCell>
                  <IconButton
                    aria-label={`Remove row ${rowIndex + 1}`}
                    disabled={disabled}
                    onClick={() =>
                      setRows(current =>
                        current.filter((_row, index) => index !== rowIndex)
                      )
                    }
                  >
                    <TrashIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={columns.length + 1}>
                  Add a row to start entering marks.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button
          variant="outlined"
          disabled={disabled || rows.length >= limits.rows}
          onClick={() =>
            setRows(current => [...current, columns.map(() => '')])
          }
        >
          Add Row
        </Button>
        <Button
          variant="outlined"
          disabled={disabled || columns.length >= limits.columns}
          onClick={addColumn}
        >
          Add Column
        </Button>
      </Stack>
    </Stack>
  )
}

function ReportEditor({ student, initialCard }) {
  const [card, setCard] = useState(initialCard)
  const [title, setTitle] = useState(initialCard.draft.title)
  const [rows, setRows] = useState(initialCard.draft.rows)
  const [columns, setColumns] = useState(initialCard.draft.columns)
  const [layout, setLayout] = useState(initialCard.draft.layout)
  const [setup, setSetup] = useState(false)
  const [preview, setPreview] = useState(false)
  const [pending, setPending] = useState(null)
  const [message, setMessage] = useState(null)
  const validColumns = Boolean(layout) || validReportColumns(columns)
  const previewRows = filledReportRows(rows).map(row =>
    row.map(cell => cell.trim())
  )

  const gradeProblem =
    layout && previewRows.length ? gradedReportError(layout, previewRows) : ''

  async function save(publish) {
    setPending(publish ? 'publish' : 'draft')
    setMessage(null)
    const result = await saveReportCard(student._id, {
      revision: card.revision,
      title,
      columns,
      layout,
      rows,
      publish,
    })
    setPending(null)
    if (result.error) {
      setMessage({ severity: 'error', text: result.error })
      return
    }
    setCard(result.card)
    setTitle(result.card.draft.title)
    setRows(result.card.draft.rows)
    setColumns(result.card.draft.columns)
    setLayout(result.card.draft.layout)
    setPreview(false)
    setMessage({
      severity: 'success',
      text: publish
        ? 'The student can now see this report card.'
        : 'Draft saved.',
    })
  }

  return (
    <>
      <SectionCard
        title="Report card"
        action={
          <Button
            variant="outlined"
            onClick={() => setSetup(true)}
            disabled={Boolean(pending)}
          >
            {layout ? 'Grading Setup' : 'Switch to Term Layout'}
          </Button>
        }
        subtitle={
          card.published
            ? 'Published. Save changes as a draft or publish an update.'
            : 'Draft'
        }
      >
        <Stack spacing={2.5}>
          {!preview && message && (
            <Alert severity={message.severity}>{message.text}</Alert>
          )}
          <TextField
            label="Report title"
            value={title}
            onChange={event => setTitle(event.target.value)}
            disabled={Boolean(pending)}
            slotProps={{ htmlInput: { maxLength: limits.title } }}
            sx={{ maxWidth: 480 }}
          />
          {layout ? (
            <>
              <Typography variant="subtitle2" color="text.secondary">
                {layout.mode === 'numeric'
                  ? 'Numeric marks'
                  : 'Letter grades (A–D)'}
              </Typography>
              <GradeEntryTable
                layout={layout}
                rows={rows}
                setRows={setRows}
                disabled={Boolean(pending)}
              />
            </>
          ) : (
            <MarksTable
              columns={columns}
              setColumns={setColumns}
              rows={rows}
              setRows={setRows}
              disabled={Boolean(pending)}
            />
          )}
          {gradeProblem && (
            <Typography variant="body2" color="text.secondary" role="status">
              {gradeProblem}
            </Typography>
          )}
          {!validColumns && (
            <Typography variant="body2" color="error">
              Enter a unique name for each column.
            </Typography>
          )}
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => save(false)}
              loading={pending === 'draft'}
              disabled={!title.trim() || !validColumns}
            >
              Save Draft
            </Button>
            <Button
              variant="contained"
              disabled={
                Boolean(pending) ||
                !title.trim() ||
                !validColumns ||
                Boolean(gradeProblem) ||
                !previewRows.length
              }
              onClick={() => {
                setMessage(null)
                setPreview(true)
              }}
            >
              Preview Report Card
            </Button>
          </Stack>
        </Stack>
      </SectionCard>
      {setup && (
        <GradeSetupDialog
          layout={layout}
          columns={columns}
          rows={rows}
          onClose={() => setSetup(false)}
          onApply={(nextLayout, nextRows) => {
            setLayout(nextLayout)
            setRows(nextRows)
            setMessage(null)
            setSetup(false)
          }}
        />
      )}
      <Dialog
        open={preview}
        onClose={pending ? undefined : () => setPreview(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>Preview Report Card</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {message?.severity === 'error' && (
              <Alert severity="error">{message.text}</Alert>
            )}
            <ReportCard
              studentName={student.username}
              report={{
                title: title.trim(),
                columns: columns.map(name => name.trim()),
                layout,
                rows: previewRows,
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={Boolean(pending)} onClick={() => setPreview(false)}>
            Back to Editing
          </Button>
          <Button
            variant="contained"
            loading={pending === 'publish'}
            onClick={() => save(true)}
          >
            {card.published ? 'Publish Update' : 'Publish Report Card'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

function StudentReportCard({ student, card: initialCard, templates }) {
  const [card, setCard] = useState(initialCard)

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto' }}>
      <PageHeader
        title={student.username}
        subtitle={student.email}
        breadcrumbs={[
          { label: 'Report Cards', to: home },
          { label: student.username },
        ]}
      />
      {card ? (
        <ReportEditor student={student} initialCard={card} />
      ) : (
        <StartReportCard
          student={student}
          templates={templates}
          onCreate={setCard}
        />
      )}
    </Box>
  )
}

export default function PageStudentReportCard() {
  const data = useLoaderData()
  return <StudentReportCard key={data.student._id} {...data} />
}

import { useEffect, useState, useCallback } from 'react'
import { useOutletContext, useParams } from 'react-router'

import { Typography, Table, TableBody, TableCell, TableHead, TableRow, Button, Box, CircularProgress } from '@mui/material'

import AddKpi from '../components/AddKpi'

import { getVentureKPIs, createKPI, createSubKPI, submitKPIForApproval } from '../api/kpi'

export default function Kpis() {
  const { ventureId: routeVentureId } = useParams()
  const userProfile = useOutletContext()
  const ventureId = routeVentureId || userProfile?.ventureId || userProfile?.venture?._id

  const [openAddKpi, setOpenAddKpi] = useState(false)
  const [kpis, setKpis] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchKPIs = useCallback(async () => {
    if (!ventureId) return

    try {
      const response = await getVentureKPIs(ventureId)
      setKpis(response.data || [])
      setError('')
    } catch (error) {
      console.error('Failed to fetch KPIs:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [ventureId])

  useEffect(() => {
    let ignore = false

    if (!ventureId) return

    getVentureKPIs(ventureId)
      .then(response => {
        if (!ignore) {
          setKpis(response.data || [])
          setError('')
        }
      })
      .catch(error => {
        if (!ignore) {
          console.error('Failed to fetch KPIs:', error)
          setError(error.message)
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [ventureId])

  const displayError = !ventureId ? 'No venture associated with your account.' : error
  const isLoading = ventureId ? loading : false

  const handleSaveKPI = async kpiData => {
    if (!ventureId) {
      throw new Error('Cannot create KPI without a valid venture ID.')
    }

    try {
      const kpiResponse = await createKPI({
        title: kpiData.title,
        description: kpiData.description,
        dueDate: kpiData.dueDate,
        venture: ventureId,
      })

      const createdKPI = kpiResponse.data
      for (const subKPI of kpiData.subKpis) {
        await createSubKPI({
          kpiId: createdKPI._id,
          name: subKPI.name,
          description: subKPI.name,
        })
      }
      if (kpiData.status === 'SUBMIT') {
        await submitKPIForApproval(createdKPI._id)
      }

      await fetchKPIs()
    } catch (error) {
      console.error('Failed to save KPI:', error)
      throw error
    }
  }

  return (
    <>
      <Typography variant="h3">
        Manage KPIs
      </Typography>

      <Typography
        variant="body1"
        gutterBottom
        sx={{
          margin: '10px',
        }}
      >
        Evaluation & Performance Student
        Venture KPIs
      </Typography>

      <hr />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 3,
          marginBottom: 6,
          marginRight: 2,
        }}
      >
        <Button
          variant="contained"
          onClick={() =>
            setOpenAddKpi(true)
          }
          sx={{
            fontSize: '15px',
            padding: '10px 20px',
          }}
        >
          + Add KPI
        </Button>
      </Box>

      {isLoading && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 5,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {displayError && (
        <Typography
          color="error"
          sx={{
            textAlign: 'center',
            marginTop: 3,
          }}
        >
          {displayError}
        </Typography>
      )}

      {!isLoading && !displayError && (
        <Table
          sx={{
            maxWidth: '95%',
            border: 1,
            margin: '0 auto',
          }}
          aria-label="KPI table"
        >
          <TableHead>
            <TableRow>
              <TableCell>
                #
              </TableCell>

              <TableCell>
                KPI
              </TableCell>

              <TableCell align="center">
                Score
              </TableCell>

              <TableCell align="center">
                Total
              </TableCell>

              <TableCell align="center">
                Action
              </TableCell>

              <TableCell align="center">
                Status
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {kpis.map(
              (kpi, index) => (
                <TableRow
                  key={kpi._id}
                >
                  <TableCell>
                    {index + 1}
                  </TableCell>

                  <TableCell>
                    {kpi.title}
                  </TableCell>

                  <TableCell align="center">
                    -
                  </TableCell>

                  <TableCell align="center">
                    -
                  </TableCell>

                  <TableCell align="center">
                    -
                  </TableCell>

                  <TableCell align="center">
                    {kpi.status}
                  </TableCell>
                </TableRow>
              )
            )}

            {kpis.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  align="center"
                >
                  No KPIs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <AddKpi
        open={openAddKpi}
        onClose={() =>
          setOpenAddKpi(false)
        }
        onSave={handleSaveKPI}
      />
    </>
  )
}

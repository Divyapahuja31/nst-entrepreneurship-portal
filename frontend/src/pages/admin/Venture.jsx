import { useLoaderData } from 'react-router'
import React from 'react'
import CustomizedTable from '../../components/Table'

const columnsName = ['name', 'campus', 'stage', 'industry']

function Venture() {
  const data = useLoaderData()
  const [selectedRows, setSelectedRows] = React.useState([])
  return (
    <div>
      <CustomizedTable
        columnNames={columnsName}
        data={data}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        targetRoute="/admin/venture"
      />
    </div>
  )
}

export default Venture

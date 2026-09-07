import {Outlet} from 'react-router'
import Sidebar from '../components/Sidebar'

function MainLayout() {
  return (
    <div style={{display: 'flex'}}>
      <Sidebar />
      <Outlet />
    </div>
  )
}

export default MainLayout

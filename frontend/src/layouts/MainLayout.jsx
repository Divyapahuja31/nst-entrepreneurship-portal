import {Outlet} from 'react-router'
import Sidebar from '../components/Sidebar'

function MainLayout() {
  return (
    <>
      <Sidebar />
      <Outlet />
    </>
  )
}

export default MainLayout

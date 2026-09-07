import '../style/sidebar.css'
import {NavLink} from 'react-router'

function Sidebar() {
  return (
    <>
      <nav>
        <NavLink to="/dashboard" end>
          Dashboard
        </NavLink>
        <NavLink to="/kpis" end>
          KPIs
        </NavLink>
      </nav>
    </>
  )
}

export default Sidebar

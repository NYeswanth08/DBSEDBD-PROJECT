import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
const linksByRole = {
  ADMIN: [
    ['Overview', '/admin'],
    ['Students', '/admin/students'],
    ['Parents', '/admin/parents'],
    ['Drivers', '/admin/drivers'],
    ['Buses', '/admin/buses'],
    ['Routes & Stops', '/admin/routes'],
    ['Trips', '/admin/trips'],
  ],
  PARENT: [
    ['Dashboard', '/parent/dashboard'],
    ['My Children', '/parent/students'],
    ['Track Bus', '/parent/tracking'],
    ['Notifications', '/parent/notifications'],
  ],
  DRIVER: [
    ['Overview', '/driver'],
    ['Today’s Trips', '/driver/trips'],
    ['Student Status', '/driver/students'],
    ['Location Sharing', '/driver/location'],
  ],
};
export function AppLayout() { const { user, logout } = useAuth(); const navigate = useNavigate(); const signOut = () => { logout(); navigate('/login'); }; return <div className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">SB</span><span>School Bus Portal</span></div><nav>{(linksByRole[user?.role] || []).map(([label, to]) => <NavLink key={to} to={to} end={to.split('/').length === 2}>{label}</NavLink>)}</nav><button className="sign-out" onClick={signOut}>Sign out</button></aside><main className="main-content"><header><div><p className="eyebrow">{user?.role?.toLowerCase()} workspace</p><h1>Welcome, {user?.full_name}</h1></div><div className="user-chip">{user?.full_name?.slice(0, 1)}</div></header><Outlet /></main></div>; }

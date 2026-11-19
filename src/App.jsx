import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Products from './pages/Products';
import Collections from './pages/Collections';
import NewOrder from './pages/NewOrder';
import Orders from './pages/Orders';
import PrintOrder from './pages/PrintOrder';
import PickingList from './pages/PickingList';
import AIOrder from './pages/AIOrder';
import Settings from './pages/Settings';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import './workspace-theme.css';
import './light-theme.css';

function AppRoutes() {
  const { user, member, loading } = useAuth();
  if (loading) return <div className="auth-loading">Chargement d’Omeldis…</div>;
  if (!user || !member) return <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>;
  if (member.role === 'admin') return <Routes>
    <Route path="/admin" element={<AdminDashboard />} />
    <Route path="*" element={<Navigate to="/admin" replace />} />
  </Routes>;

  return <Routes>
    <Route path="/" element={<Layout />}>
      <Route index element={<Dashboard />} />
      <Route path="clients" element={<Clients />} />
      <Route path="products" element={<Products />} />
      <Route path="collections" element={<Collections />} />
      <Route path="orders/new" element={<NewOrder />} />
      <Route path="orders" element={<Orders />} />
      <Route path="picking-list" element={<PickingList />} />
      <Route path="ai-order" element={<AIOrder />} />
      <Route path="settings" element={<Settings />} />
    </Route>
    <Route path="/orders/print/:orderId" element={<PrintOrder />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

function App() { return <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>; }

export default App;

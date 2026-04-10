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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="products" element={<Products />} />
          <Route path="collections" element={<Collections />} />
          <Route path="orders/new" element={<NewOrder />} />
          <Route path="orders" element={<Orders />} />
          <Route path="picking-list" element={<PickingList />} />
        </Route>
        {/* Print route outside Layout (no sidebar) */}
        <Route path="/orders/print/:orderId" element={<PrintOrder />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Users, Package, Tags, PlusCircle, ClipboardList } from 'lucide-react';
import logo from '../assets/logo-print.png';
import './Layout.css';

export default function Layout() {
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/' && location.pathname === '/') return true;
        if (path !== '/' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="logo">
                    <img src={logo} alt="Omeldis Dashboard" />
                </div>
                <nav>
                    <Link
                        to="/"
                        className={isActive('/') && location.pathname === '/' ? 'active' : ''}
                    >
                        <Home size={20} />
                        <span>Tableau de bord</span>
                    </Link>
                    <Link
                        to="/clients"
                        className={isActive('/clients') ? 'active' : ''}
                    >
                        <Users size={20} />
                        <span>Clients</span>
                    </Link>
                    <Link
                        to="/products"
                        className={isActive('/products') ? 'active' : ''}
                    >
                        <Package size={20} />
                        <span>Produits</span>
                    </Link>
                    <Link
                        to="/collections"
                        className={isActive('/collections') ? 'active' : ''}
                    >
                        <Tags size={20} />
                        <span>Collections</span>
                    </Link>
                    <Link
                        to="/orders/new"
                        className={isActive('/orders/new') ? 'active' : ''}
                    >
                        <PlusCircle size={20} />
                        <span>Nouvelle Commande</span>
                    </Link>
                    <Link
                        to="/orders"
                        className={isActive('/orders') && location.pathname === '/orders' ? 'active' : ''}
                    >
                        <ClipboardList size={20} />
                        <span>Commandes</span>
                    </Link>
                    <Link
                        to="/picking-list"
                        className={isActive('/picking-list') ? 'active' : ''}
                    >
                        <ClipboardList size={20} />
                        <span>Picking List</span>
                    </Link>
                </nav>
            </aside>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}

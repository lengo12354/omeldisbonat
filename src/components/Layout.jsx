import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Users, Package, Tags, Plus, ClipboardList, Sparkles, Menu, X, CalendarDays, Layers3, Settings2 } from 'lucide-react';
import logo from '../assets/logo-print.png';
import './Layout.css';

const navigation = [
    { path: '/', label: 'Vue d’ensemble', icon: LayoutGrid, group: 'VOTRE ESPACE' },
    { path: '/orders', label: 'Commandes', icon: ClipboardList },
    { path: '/orders/new', label: 'Nouvelle commande', icon: Plus },
    { path: '/picking-list', label: 'Préparation', icon: Layers3 },
    { path: '/clients', label: 'Clients', icon: Users, group: 'RÉPERTOIRE' },
    { path: '/products', label: 'Produits & stock', icon: Package },
    { path: '/collections', label: 'Collections', icon: Tags },
    { path: '/ai-order', label: 'Assistant IA', icon: Sparkles },
    { path: '/settings', label: 'Paramètres', icon: Settings2, group: 'COMPTE' },
];

export default function Layout() {
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    return (
        <div className="layout">
            {menuOpen && <button className="sidebar-backdrop" aria-label="Fermer le menu" onClick={() => setMenuOpen(false)} />}
            <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}>
                <button className="icon-button mobile-sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Fermer la navigation"><X size={18} /></button>
                <Link to="/" className="brand" onClick={() => setMenuOpen(false)} aria-label="Omeldis, accueil"><img className="brand-logo" src={logo} alt="Omeldis" /></Link>
                <nav className="sidebar-nav" aria-label="Navigation principale">
                    {navigation.map(item => {
                        const { path, label, icon: Icon, group } = item;
                        return <div key={path}>
                            {group && <p className="nav-section-label">{group}</p>}
                            <Link to={path} className={`nav-link ${location.pathname === path ? 'active' : ''}`} aria-current={location.pathname === path ? 'page' : undefined} onClick={() => setMenuOpen(false)}>
                                <Icon size={18} strokeWidth={1.7} /><span>{label}</span>
                                {path === '/ai-order' && <span className="nav-ai-tag">IA</span>}
                                {location.pathname === path && <span className="nav-active-dot" />}
                            </Link>
                        </div>;
                    })}
                </nav>
            </aside>
            <div className="workspace-main">
                <header className="topbar">
                    <div className="topbar-brand">
                        <button className="icon-button mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Ouvrir le menu" aria-expanded={menuOpen}><Menu size={20} /></button>
                        <span>Omeldis</span>
                    </div>
                    <time className="topbar-date" dateTime={new Date().toISOString().slice(0, 10)}><CalendarDays size={15} />{new Date().toLocaleDateString('fr-MA', { day: 'numeric', month: 'short' })}</time>
                </header>
                <main className="main-content"><Outlet /></main>
                <footer className="workspace-footer">© {new Date().getFullYear()} Omeldis</footer>
            </div>
        </div>
    );
}

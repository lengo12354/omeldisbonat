import { useMemo } from 'react';
import { useClients } from '../hooks/useClients';
import { useProducts } from '../hooks/useProducts';
import { useOrders } from '../hooks/useOrders';
import {
    Users, Package, ShoppingCart, TrendingUp, DollarSign,
    Activity, AlertTriangle, TrendingDown, BarChart3, Zap,
    ArrowUpRight, Warehouse, Award, PieChart
} from 'lucide-react';
import './Dashboard.css';
import { fmt, fmtFull } from '../utils/format';

export default function Dashboard() {
    const { clients, loading: clientsLoading } = useClients();
    const { products, loading: productsLoading } = useProducts();
    const { orders, loading: ordersLoading } = useOrders();

    // ====== Calculs statistiques ======
    const stats = useMemo(() => {
        const today = new Date().toDateString();
        const todaysOrders = orders.filter(o => new Date(o.date).toDateString() === today);

        const totalRevenue = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
        const totalProfit = orders.reduce((acc, o) => acc + (o.profitAmount || 0), 0);
        const totalCost = orders.reduce((acc, o) => acc + (o.costAmount || 0), 0);
        const todayRevenue = todaysOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
        const todayProfit = todaysOrders.reduce((acc, o) => acc + (o.profitAmount || 0), 0);

        const outOfStock = products.filter(p => (p.stock_quantity || 0) === 0);
        const lowStock = products.filter(p => (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) <= (p.reorder_level || 5));
        const stockValue = products.reduce((sum, p) => sum + ((p.purchase_price || 0) * (p.stock_quantity || 0)), 0);

        const marginPct = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

        return {
            todaysOrders, totalRevenue, totalProfit, totalCost,
            todayRevenue, todayProfit, outOfStock, lowStock,
            stockValue, marginPct
        };
    }, [orders, products]);

    // ====== Profit 7 derniers mois ======
    const last7Months = useMemo(() => {
        const months = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthYear = `${d.getFullYear()}-${d.getMonth()}`;

            const monthOrders = orders.filter(o => {
                const od = new Date(o.date);
                return `${od.getFullYear()}-${od.getMonth()}` === monthYear;
            });

            months.push({
                label: d.toLocaleDateString('fr-MA', { month: 'short' }),
                revenue: monthOrders.reduce((s, o) => s + (o.totalAmount || 0), 0),
                profit: monthOrders.reduce((s, o) => s + (o.profitAmount || 0), 0),
                count: monthOrders.length
            });
        }
        return months;
    }, [orders]);

    const maxRevenue = Math.max(...last7Months.map(m => m.revenue), 1);

    // ====== Top produits vendus + moins vendus ======
    const { topProducts, bottomProducts } = useMemo(() => {
        const productSales = {};
        orders.forEach(order => {
            (order.items || []).forEach(item => {
                if (!productSales[item.name]) {
                    productSales[item.name] = { name: item.name, qty: 0, revenue: 0, profit: 0 };
                }
                productSales[item.name].qty += item.quantity || 0;
                productSales[item.name].revenue += item.total || 0;
                productSales[item.name].profit += item.profit || 0;
            });
        });
        const sorted = Object.values(productSales).sort((a, b) => b.qty - a.qty);
        return {
            topProducts: sorted.slice(0, 5),
            bottomProducts: sorted.slice(-5).reverse()
        };
    }, [orders]);

    // ====== Top Clients (par total dépensé) ======
    const topClients = useMemo(() => {
        const clientMap = {};
        orders.forEach(order => {
            const name = order.client?.name;
            if (!name) return;
            if (!clientMap[name]) {
                clientMap[name] = { name, totalSpent: 0, profit: 0, orders: 0 };
            }
            clientMap[name].totalSpent += order.totalAmount || 0;
            clientMap[name].profit += order.profitAmount || 0;
            clientMap[name].orders += 1;
        });
        return Object.values(clientMap)
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 8);
    }, [orders]);

    // ====== Advanced Insights ======
    const advancedInsights = useMemo(() => {
        if (orders.length === 0) return { aov: 0, avgItems: 0, returningClients: 0, returningPct: 0 };

        // Average Order Value
        const aov = stats.totalRevenue / orders.length;

        // Average Items per order
        const totalItemsSold = orders.reduce((acc, o) => {
            return acc + (o.items || []).reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0);
        }, 0);
        const avgItems = totalItemsSold / orders.length;

        // Returning Clients
        const clientOrderCounts = {};
        orders.forEach(o => {
            if (o.client?.name) {
                clientOrderCounts[o.client.name] = (clientOrderCounts[o.client.name] || 0) + 1;
            }
        });
        const returningClients = Object.values(clientOrderCounts).filter(count => count > 1).length;
        const totalUniqueClients = Object.keys(clientOrderCounts).length;
        const returningPct = totalUniqueClients > 0 ? (returningClients / totalUniqueClients) * 100 : 0;

        return { aov, avgItems, returningClients, returningPct, totalUniqueClients };
    }, [orders, stats.totalRevenue]);

    const isLoading = clientsLoading || productsLoading || ordersLoading;

    return (
        <div className="dashboard-container fade-in">
            {/* ===== HEADER ===== */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">
                        <Zap size={32} className="title-icon" />
                        Tableau de Bord
                    </h1>
                    <p className="dashboard-subtitle">
                        {new Date().toLocaleDateString('fr-MA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="header-badges">
                    <span className="live-badge">
                        <span className="live-dot"></span>
                        Live
                    </span>
                </div>
            </div>

            {/* ===== KPI CARDS ===== */}
            <div className="kpi-grid">
                {/* CA Total */}
                <div className="kpi-card kpi-card--revenue">
                    <div className="kpi-icon-wrap">
                        <DollarSign size={22} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Chiffre d'Affaires</p>
                        <p className="kpi-value" title={ordersLoading ? '' : `${fmtFull(stats.totalRevenue)} MAD`}>
                            {ordersLoading ? '...' : <><span className="kpi-short">{fmt(stats.totalRevenue)}</span><span className="kpi-currency"> MAD</span></>}
                        </p>
                        <p className="kpi-sub">Aujourd'hui: +{fmt(stats.todayRevenue)} MAD</p>
                    </div>
                    <ArrowUpRight size={16} className="kpi-arrow" />
                </div>

                {/* Profit Net */}
                <div className="kpi-card kpi-card--profit">
                    <div className="kpi-icon-wrap">
                        <TrendingUp size={22} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Profit Net</p>
                        <p className="kpi-value" title={ordersLoading ? '' : `+${fmtFull(stats.totalProfit)} MAD`}>
                            {ordersLoading ? '...' : <><span className="kpi-short">+{fmt(stats.totalProfit)}</span><span className="kpi-currency"> MAD</span></>}
                        </p>
                        <p className="kpi-sub">Marge: {stats.marginPct}%</p>
                    </div>
                    <ArrowUpRight size={16} className="kpi-arrow" />
                </div>

                {/* Coût Achats */}
                <div className="kpi-card kpi-card--cost">
                    <div className="kpi-icon-wrap">
                        <ShoppingCart size={22} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Coût Achats (Ras el Mal)</p>
                        <p className="kpi-value" title={ordersLoading ? '' : `${fmtFull(stats.totalCost)} MAD`}>
                            {ordersLoading ? '...' : <><span className="kpi-short">{fmt(stats.totalCost)}</span><span className="kpi-currency"> MAD</span></>}
                        </p>
                        <p className="kpi-sub">{orders.length} commandes total</p>
                    </div>
                    <ArrowUpRight size={16} className="kpi-arrow" />
                </div>

                {/* Commandes Today */}
                <div className="kpi-card kpi-card--today">
                    <div className="kpi-icon-wrap">
                        <Activity size={22} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Commandes Aujourd'hui</p>
                        <p className="kpi-value">
                            {ordersLoading ? '...' : stats.todaysOrders.length}
                        </p>
                        <p className="kpi-sub">Profit: +{fmt(stats.todayProfit)} MAD</p>
                    </div>
                    <ArrowUpRight size={16} className="kpi-arrow" />
                </div>

                {/* Clients */}
                <div className="kpi-card kpi-card--clients">
                    <div className="kpi-icon-wrap">
                        <Users size={22} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Total Clients</p>
                        <p className="kpi-value">
                            {clientsLoading ? '...' : clients.length}
                        </p>
                        <p className="kpi-sub">Base clientèle</p>
                    </div>
                    <ArrowUpRight size={16} className="kpi-arrow" />
                </div>

                {/* Ruptures */}
                <div className={`kpi-card kpi-card--stock ${stats.outOfStock.length > 0 ? 'kpi-card--alert' : ''}`}>
                    <div className="kpi-icon-wrap">
                        <AlertTriangle size={22} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Ruptures de Stock</p>
                        <p className="kpi-value">
                            {productsLoading ? '...' : stats.outOfStock.length}
                        </p>
                        <p className="kpi-sub">{stats.lowStock.length} en stock bas</p>
                    </div>
                    <ArrowUpRight size={16} className="kpi-arrow" />
                </div>
            </div>

            {/* ===== MAIN GRID (charts + tables) ===== */}
            <div className="dashboard-main-grid">

                {/* ===== GRAPHIQUE REVENUS 7 MOIS ===== */}
                <div className="dash-card dash-card--chart">
                    <div className="dash-card-header">
                        <div className="dash-card-title">
                            <BarChart3 size={20} />
                            Revenus & Profits — 7 Derniers Mois
                        </div>
                    </div>
                    <div className="chart-area">
                        {last7Months.map((period, i) => (
                            <div key={i} className="chart-col">
                                <div className="chart-bars">
                                    {/* Revenue bar */}
                                    <div
                                        className="bar bar--revenue"
                                        style={{ height: `${(period.revenue / maxRevenue) * 100}%` }}
                                        title={`CA: ${fmtFull(period.revenue)} MAD`}
                                    >
                                        {period.revenue > 0 && (
                                            <span className="bar-tooltip">{fmt(period.revenue)}</span>
                                        )}
                                    </div>
                                    {/* Profit bar */}
                                    <div
                                        className="bar bar--profit"
                                        style={{ height: `${(period.profit / maxRevenue) * 100}%` }}
                                        title={`Profit: ${fmtFull(period.profit)} MAD`}
                                    >
                                    </div>
                                </div>
                                <div className="chart-label">
                                    <span style={{ textTransform: 'capitalize' }}>{period.label}</span>
                                    {period.count > 0 && <span className="chart-count">{period.count}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="chart-legend">
                        <span className="legend-item legend-item--revenue">■ Chiffre d'Affaires</span>
                        <span className="legend-item legend-item--profit">■ Profit Net</span>
                    </div>
                </div>

                {/* ===== TOP PRODUITS ===== */}
                <div className="dash-card dash-card--top">
                    <div className="dash-card-header">
                        <div className="dash-card-title">
                            <Package size={20} />
                            Top Produits Vendus
                        </div>
                    </div>
                    {topProducts.length === 0 ? (
                        <div className="dash-empty">
                            <Package size={40} />
                            <p>Aucune vente enregistrée</p>
                        </div>
                    ) : (
                        <div className="top-list">
                            {topProducts.map((p, i) => (
                                <div key={i} className="top-item">
                                    <div className="top-rank">#{i + 1}</div>
                                    <div className="top-info">
                                        <p className="top-name">{p.name}</p>
                                        <p className="top-sub">{p.qty} unités vendues</p>
                                    </div>
                                    <div className="top-stats">
                                        <span className="top-revenue">{p.revenue.toFixed(0)} MAD</span>
                                        {p.profit > 0 && (
                                            <span className="top-profit">+{p.profit.toFixed(0)}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ===== BOTTOM 5 PRODUITS ===== */}
                <div className="dash-card dash-card--bottom">
                    <div className="dash-card-header">
                        <div className="dash-card-title">
                            <TrendingDown size={20} />
                            Top 5 Moins Vendus
                        </div>
                    </div>
                    {bottomProducts.length === 0 ? (
                        <div className="dash-empty">
                            <Package size={40} />
                            <p>Aucune vente enregistrée</p>
                        </div>
                    ) : (
                        <div className="top-list">
                            {bottomProducts.map((p, i) => (
                                <div key={i} className="top-item top-item--bottom">
                                    <div className="top-rank top-rank--bottom">#{i + 1}</div>
                                    <div className="top-info">
                                        <p className="top-name">{p.name}</p>
                                        <p className="top-sub">{p.qty} unités vendues</p>
                                    </div>
                                    <div className="top-stats">
                                        <span className="top-revenue">{p.revenue.toFixed(0)} MAD</span>
                                        {p.profit > 0 && (
                                            <span className="top-profit">+{p.profit.toFixed(0)}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ===== TOP CLIENTS ===== */}
                <div className="dash-card dash-card--clients-top">
                    <div className="dash-card-header">
                        <div className="dash-card-title">
                            <Users size={20} />
                            Top Clients
                        </div>
                        {topClients.length > 0 && (
                            <span className="badge badge-info">{topClients.length} clients</span>
                        )}
                    </div>

                    {topClients.length === 0 ? (
                        <div className="dash-empty">
                            <Users size={40} />
                            <p>Aucune commande pour l'instant</p>
                        </div>
                    ) : (
                        <div className="clients-top-table">
                            <div className="clients-top-head">
                                <span>#</span>
                                <span>Client</span>
                                <span>Cmds</span>
                                <span>Total Dépensé</span>
                                <span>Profit Généré</span>
                            </div>
                            {topClients.map((c, i) => {
                                const profitPct = c.totalSpent > 0 ? ((c.profit / c.totalSpent) * 100).toFixed(1) : '0.0';
                                const getRankIcon = (index) => {
                                    if (index === 0) return <Award size={18} style={{ color: '#fbbf24' }} />; // Gold
                                    if (index === 1) return <Award size={18} style={{ color: '#9ca3af' }} />; // Silver
                                    if (index === 2) return <Award size={18} style={{ color: '#b45309' }} />; // Bronze
                                    return `#${index + 1}`;
                                };
                                return (
                                    <div key={i} className={`clients-top-row ${i < 3 ? 'clients-top-row--medal' : ''}`}>
                                        <span className="client-rank">{getRankIcon(i)}</span>
                                        <span className="client-top-name">
                                            <span className="client-top-avatar"><Users size={13} /></span>
                                            {c.name}
                                        </span>
                                        <span className="client-orders-count">{c.orders}</span>
                                        <span className="client-spent" title={fmtFull(c.totalSpent) + ' MAD'}>
                                            {fmt(c.totalSpent)} MAD
                                        </span>
                                        <span className={`client-profit-cell ${c.profit > 0 ? 'profit--pos' : 'profit--zero'}`}>
                                            {c.profit > 0 ? `+${fmt(c.profit)}` : '—'}
                                            {c.profit > 0 && <span className="profit-pct"> ({profitPct}%)</span>}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ===== STOCK OVERVIEW ===== */}
                <div className="dash-card dash-card--stock-overview">
                    <div className="dash-card-header">
                        <div className="dash-card-title">
                            <Warehouse size={20} />
                            Vue Globale Stock
                        </div>
                    </div>
                    <div className="stock-overview-grid">
                        <div className="stock-stat">
                            <p className="stock-stat-value">{products.length}</p>
                            <p className="stock-stat-label">Produits Total</p>
                        </div>
                        <div className="stock-stat stock-stat--green">
                            <p className="stock-stat-value">{products.filter(p => (p.stock_quantity || 0) > (p.reorder_level || 5)).length}</p>
                            <p className="stock-stat-label">En Bon Stock</p>
                        </div>
                        <div className="stock-stat stock-stat--yellow">
                            <p className="stock-stat-value">{stats.lowStock.length}</p>
                            <p className="stock-stat-label">Stock Bas</p>
                        </div>
                        <div className="stock-stat stock-stat--red">
                            <p className="stock-stat-value">{stats.outOfStock.length}</p>
                            <p className="stock-stat-label">Ruptures</p>
                        </div>
                        <div className="stock-stat stock-stat--blue stock-stat--full">
                            <p className="stock-stat-value" title={fmtFull(stats.stockValue) + ' MAD'}>{fmt(stats.stockValue)} MAD</p>
                            <p className="stock-stat-label">Valeur Totale Stock Investi</p>
                        </div>
                    </div>
                </div>

                {/* ===== REPARTITION FINANCIERE ===== */}
                <div className="dash-card dash-card--donut">
                    <div className="dash-card-header">
                        <div className="dash-card-title">
                            <PieChart size={20} />
                            Répartition Financière
                        </div>
                    </div>
                    {stats.totalRevenue > 0 ? (
                        <div className="donut-container">
                            <div className="donut-chart" style={{
                                background: `conic-gradient(var(--success) 0% ${(stats.totalProfit / stats.totalRevenue) * 100}%, var(--warning) ${(stats.totalProfit / stats.totalRevenue) * 100}% 100%)`
                            }}>
                                <div className="donut-inner">
                                    <span className="donut-total-val" title={fmtFull(stats.totalRevenue) + ' MAD'}>{fmt(stats.totalRevenue)}</span>
                                    <span className="donut-total-lbl">MAD</span>
                                </div>
                            </div>
                            <div className="donut-legend">
                                <div className="donut-legend-item">
                                    <span className="donut-dot donut-dot--profit"></span>
                                    <div className="donut-text">
                                        <p className="donut-lbl">Profit Net ({stats.marginPct}%)</p>
                                        <p className="donut-val text-success">+{fmt(stats.totalProfit)} MAD</p>
                                    </div>
                                </div>
                                <div className="donut-legend-item">
                                    <span className="donut-dot donut-dot--cost"></span>
                                    <div className="donut-text">
                                        <p className="donut-lbl">Coûts (Ras el Mal) ({(100 - parseFloat(stats.marginPct)).toFixed(1)}%)</p>
                                        <p className="donut-val text-warning">{fmt(stats.totalCost)} MAD</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="dash-empty">
                            <PieChart size={40} />
                            <p>Aucune donnée financière</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

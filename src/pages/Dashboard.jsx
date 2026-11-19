import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useClients } from '../hooks/useClients';
import { useProducts } from '../hooks/useProducts';
import { useOrders } from '../hooks/useOrders';
import { Users, UserRound, Package, ShoppingBag, TrendingUp, ArrowUpRight, ArrowRight, Plus, CircleDollarSign, AlertTriangle, ReceiptText } from 'lucide-react';
import AppSelect from '../components/AppSelect';
import { fmt, fmtFull } from '../utils/format';
import './Dashboard.css';

const number = value => Number(value) || 0;

function Money({ value }) {
    return <span title={`${fmtFull(value)} MAD`}>{fmt(value)}<small className="money-unit"> MAD</small></span>;
}

function EmptyPanel({ icon, children }) {
    const Icon = icon || Package;
    return <div className="overview-empty"><Icon size={27} strokeWidth={1.3} /><p>{children}</p></div>;
}

function RevenueChart({ months, loading }) {
    const max = Math.max(...months.flatMap(month => [month.revenue, month.profit]), 1);
    const hasData = months.some(month => month.count > 0);
    const [activeMonth, setActiveMonth] = useState(null);
    return (
        <div className="revenue-bars" aria-busy={loading} aria-label="Revenus et profits mensuels en MAD">
            {hasData ? months.map((month, index) => (
                <div className={`revenue-month ${activeMonth === index ? 'revenue-month--active' : ''}`} key={index} tabIndex={0} onMouseEnter={() => setActiveMonth(index)} onMouseLeave={() => setActiveMonth(null)} onFocus={() => setActiveMonth(index)} onBlur={() => setActiveMonth(null)} aria-label={`${month.label} : chiffre d’affaires ${fmtFull(month.revenue)} MAD, profit ${fmtFull(month.profit)} MAD, ${month.count} commandes`}>
                    <div className="revenue-pair">
                        <div className="revenue-bar revenue-bar--sales" style={{ height: `${Math.max(month.revenue > 0 ? 3 : 0, month.revenue / max * 100)}%` }} />
                        <div className="revenue-bar revenue-bar--profit" style={{ height: `${Math.max(month.profit > 0 ? 3 : 0, month.profit / max * 100)}%` }} />
                    </div>
                    <div className="revenue-month-label"><span>{month.label}</span>{month.count > 0 && <small>{month.count}</small>}</div>
                </div>
            )) : <div className="chart-no-data">{loading ? 'Chargement des données…' : 'Vos ventes apparaîtront ici'}</div>}
            {activeMonth !== null && hasData && <div className="revenue-tooltip" role="status"><strong>{months[activeMonth].label}</strong><span><i className="legend-dot" />Revenus <b>{fmtFull(months[activeMonth].revenue)} MAD</b></span><span><i className="legend-dot legend-dot--mint" />Profit <b>{fmtFull(months[activeMonth].profit)} MAD</b></span><small>{months[activeMonth].count} commandes</small></div>}
        </div>
    );
}

export default function Dashboard() {
    const { clients, loading: clientsLoading, error: clientsError } = useClients();
    const { products, loading: productsLoading, error: productsError } = useProducts();
    const { orders, loading: ordersLoading, error: ordersError } = useOrders();
    const [period, setPeriod] = useState('all');
    const [monthCount, setMonthCount] = useState(7);
    const [productTab, setProductTab] = useState('top');

    const periodOrders = useMemo(() => {
        if (period === 'all') return orders;
        const now = new Date();
        const start = period === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), 0, 1);
        return orders.filter(order => new Date(order.date) >= start && new Date(order.date) <= now);
    }, [orders, period]);

    const stats = useMemo(() => {
        const revenue = periodOrders.reduce((sum, order) => sum + number(order.totalAmount), 0);
        const profit = periodOrders.reduce((sum, order) => sum + number(order.profitAmount), 0);
        const cost = periodOrders.reduce((sum, order) => sum + number(order.costAmount), 0);
        const todayOrders = orders.filter(order => new Date(order.date).toDateString() === new Date().toDateString());
        const outOfStock = products.filter(product => number(product.stock_quantity) <= 0);
        const lowStock = products.filter(product => number(product.stock_quantity) > 0 && number(product.stock_quantity) <= (product.reorder_level ?? 5));
        const stockValue = products.reduce((sum, product) => sum + number(product.purchase_price) * number(product.stock_quantity), 0);
        const clientMap = new Map();
        const sales = new Map();
        let itemCount = 0;
        periodOrders.forEach(order => {
            if (order.client?.name) {
                const key = order.client.id || order.client.name;
                const client = clientMap.get(key) || { name: order.client.name, orders: 0, revenue: 0, profit: 0 };
                client.orders += 1;
                client.revenue += number(order.totalAmount);
                client.profit += number(order.profitAmount);
                clientMap.set(key, client);
            }
            (order.items || []).forEach(item => {
                const key = item.id || item.name;
                const product = sales.get(key) || { name: item.name, quantity: 0, revenue: 0, profit: 0 };
                product.quantity += number(item.quantity);
                product.revenue += number(item.total);
                product.profit += number(item.profit);
                itemCount += number(item.quantity);
                sales.set(key, product);
            });
        });
        const rankedClients = [...clientMap.values()].sort((a, b) => b.revenue - a.revenue);
        const rankedProducts = [...sales.values()].sort((a, b) => b.quantity - a.quantity);
        const returning = rankedClients.filter(client => client.orders > 1).length;
        return { revenue, profit, cost, todayOrders, outOfStock, lowStock, stockValue, rankedClients, rankedProducts, returning,
            margin: revenue > 0 ? profit / revenue * 100 : 0,
            average: periodOrders.length ? revenue / periodOrders.length : 0,
            averageItems: periodOrders.length ? itemCount / periodOrders.length : 0,
            returningPct: rankedClients.length ? returning / rankedClients.length * 100 : 0,
        };
    }, [orders, periodOrders, products]);

    const months = useMemo(() => Array.from({ length: monthCount }, (_, index) => {
        const now = new Date();
        const date = new Date(now.getFullYear(), now.getMonth() - monthCount + index + 1, 1);
        const monthOrders = periodOrders.filter(order => {
            const orderDate = new Date(order.date);
            return orderDate.getFullYear() === date.getFullYear() && orderDate.getMonth() === date.getMonth();
        });
        return { label: date.toLocaleDateString('fr-MA', { month: 'short' }), count: monthOrders.length,
            revenue: monthOrders.reduce((sum, order) => sum + number(order.totalAmount), 0),
            profit: monthOrders.reduce((sum, order) => sum + number(order.profitAmount), 0) };
    }), [periodOrders, monthCount]);

    const displayedProducts = (productTab === 'top' ? stats.rankedProducts : [...stats.rankedProducts].reverse()).slice(0, 4);
    const loading = ordersLoading || clientsLoading || productsLoading;
    const hasError = clientsError || productsError || ordersError;
    const profitShare = stats.profit > 0 ? Math.min(100, stats.profit / (stats.profit + Math.max(0, stats.cost)) * 100) : 0;

    return (
        <div className="overview fade-in" aria-busy={loading}>
            <div className="overview-heading">
                <div><h1>Vue d’ensemble<span>.</span></h1><p>Ventes, clients et stock en temps réel.</p></div>
                <div className="overview-actions"><AppSelect value={period} onChange={setPeriod} label="Période des statistiques" icon={CalendarIcon} options={[{ value: 'all', label: 'Toute la période' }, { value: 'month', label: 'Ce mois-ci' }, { value: 'year', label: 'Cette année' }]} /><Link to="/orders/new" className="btn btn-primary"><Plus size={16} />Nouvelle commande</Link></div>
            </div>
            {hasError && <div className="overview-error" role="alert"><AlertTriangle size={17} />Certaines données n’ont pas pu être chargées. Vérifiez votre connexion puis rechargez la page.</div>}
            <div className="overview-kpis">
                <Link to="/orders" className="overview-kpi overview-kpi--revenue"><div className="kpi-top"><span>Chiffre d’affaires</span><CircleDollarSign size={17} /></div><div className="overview-kpi-value">{ordersLoading ? '…' : <Money value={stats.revenue} />}</div><div className="kpi-bottom"><span className="kpi-caption"><span className="tiny-dot" />Ventes sur la période</span><ArrowUpRight size={15} /></div></Link>
                <Link to="/orders" className={`overview-kpi overview-kpi--accent overview-kpi--profit ${stats.profit < 0 ? 'overview-kpi--loss' : ''}`}><div className="kpi-top"><span>Profit net</span><TrendingUp size={17} /></div><div className="overview-kpi-value">{ordersLoading ? '…' : <Money value={stats.profit} />}</div><div className="kpi-bottom"><span className="kpi-pill">{stats.margin.toFixed(1)} %</span><span>de marge nette</span><ArrowUpRight size={15} /></div></Link>
                <Link to="/orders" className="overview-kpi overview-kpi--orders"><div className="kpi-top"><span>Commandes</span><ShoppingBag size={17} /></div><div className="overview-kpi-value">{ordersLoading ? '…' : periodOrders.length.toLocaleString('fr-MA')}<small> commandes</small></div><div className="kpi-bottom"><span className="kpi-pill kpi-pill--subtle">{stats.todayOrders.length} aujourd’hui</span><ArrowUpRight size={15} /></div></Link>
                <Link to="/clients" className="overview-kpi overview-kpi--clients"><div className="kpi-top"><span>Clients</span><Users size={17} /></div><div className="overview-kpi-value">{clientsLoading ? '…' : clients.length.toLocaleString('fr-MA')}<small> au total</small></div><div className="kpi-bottom"><span className="kpi-caption"><span className="tiny-dot tiny-dot--mint" />{stats.rankedClients.length} acheteurs</span><ArrowUpRight size={15} /></div></Link>
            </div>
            <div className="overview-body">
                <div className="overview-primary">
                    <div className="overview-charts">
                        <section className="overview-panel sales-panel">
                            <div className="overview-panel-heading"><div><h2>Revenus & Profits</h2><p>Évolution du chiffre d’affaires et du profit</p></div><AppSelect value={monthCount} onChange={setMonthCount} label="Nombre de mois du graphique" compact options={[{ value: 7, label: '7 mois' }, { value: 12, label: '12 mois' }]} /></div>
                            <div className="chart-summary"><strong><Money value={stats.revenue} /></strong><span><i className="legend-dot" />Chiffre d’affaires</span><span><i className="legend-dot legend-dot--mint" />Profit net</span></div>
                            <RevenueChart months={months} loading={ordersLoading} />
                        </section>
                        <section className="overview-panel finance-panel"><div className="overview-panel-heading"><div><h2>Répartition financière</h2><p>Chaque dirham, en perspective</p></div><ArrowUpRight size={15} /></div>
                            <div className="finance-donut" style={{ '--profit-share': `${profitShare}%` }} role="img" aria-label={`Marge nette : ${stats.margin.toFixed(1)} pour cent`}><div><span>Marge nette</span><strong>{stats.margin.toFixed(1)}<small>%</small></strong><span>sur la période</span></div></div>
                            <div className="finance-legend"><div><span><i className="legend-dot" />Profit net</span><strong><Money value={stats.profit} /></strong></div><div><span><i className="legend-dot legend-dot--olive" />Coût des achats</span><strong><Money value={stats.cost} /></strong></div></div>
                        </section>
                    </div>
                    <section className="overview-panel best-clients"><div className="overview-panel-heading"><div><h2>Vos meilleurs clients <span className="panel-count">{stats.rankedClients.length}</span></h2><p>Ceux qui font grandir votre activité</p></div><Link to="/clients" className="panel-link">Tous les clients <ArrowUpRight size={14} /></Link></div>
                        {stats.rankedClients.length === 0 ? <EmptyPanel icon={Users}>Vos clients les plus actifs apparaîtront ici.</EmptyPanel> : <div className="overview-table-scroll"><table className="overview-table"><thead><tr><th>Client</th><th>Commandes</th><th>Chiffre d’affaires</th><th>Profit net</th><th>Marge</th></tr></thead><tbody>{stats.rankedClients.slice(0, 5).map((client, index) => <tr key={client.name}><td><div className="overview-client"><span className={`initial-avatar avatar-tone-${index % 3}`}><UserRound size={18} strokeWidth={2} aria-hidden="true" /></span><span>{client.name}<small>{client.orders > 1 ? `${client.orders} commandes` : '1 commande'}</small></span></div></td><td><span className="order-count">{client.orders}</span></td><td><Money value={client.revenue} /></td><td className={client.profit < 0 ? 'negative-value' : 'positive-value'}><Money value={client.profit} /></td><td><span className={`margin-label ${client.profit < 0 ? 'margin-label--negative' : ''}`}>{client.revenue ? (client.profit / client.revenue * 100).toFixed(1) : '0.0'} %</span></td></tr>)}</tbody></table></div>}
                    </section>
                    <div className="overview-lower">
                        <section className="overview-panel products-panel"><div className="overview-panel-heading"><div><h2>Vos produits en chiffres</h2><p>Les tendances de votre catalogue</p></div><Link to="/products" className="icon-button" aria-label="Voir les produits"><ArrowUpRight size={16} /></Link></div><div className="product-tabs" role="tablist" aria-label="Classement des ventes"><button id="top-products-tab" role="tab" aria-selected={productTab === 'top'} aria-controls="ranked-products" onClick={() => setProductTab('top')} className={productTab === 'top' ? 'selected' : ''}>Les plus vendus</button><button id="bottom-products-tab" role="tab" aria-selected={productTab === 'bottom'} aria-controls="ranked-products" onClick={() => setProductTab('bottom')} className={productTab === 'bottom' ? 'selected' : ''}>Les moins vendus</button></div><div id="ranked-products" role="tabpanel" aria-labelledby={productTab === 'top' ? 'top-products-tab' : 'bottom-products-tab'}>{!displayedProducts.length ? <EmptyPanel>Aucune vente sur cette période.</EmptyPanel> : <div className="ranked-products">{displayedProducts.map((product, index) => <div className="ranked-product" key={product.name}><span className="product-rank">0{index + 1}</span><span className="ranked-product-icon"><Package size={17} /></span><div><strong>{product.name}</strong><span>{product.quantity} unités vendues</span></div><div className="ranked-product-amount"><strong><Money value={product.revenue} /></strong><span>Profit : {fmt(product.profit)} MAD</span></div></div>)}</div>}</div></section>
                    </div>
                </div>
                <aside className="overview-rail">
                    <section className="overview-panel stock-panel"><div className="overview-panel-heading"><h2>État du stock</h2><Link to="/products" className="icon-button" aria-label="Gérer le stock"><ArrowUpRight size={16} /></Link></div><div className="stock-total"><span className="stock-icon"><Package size={21} /></span><strong>{productsLoading ? '…' : products.length}<small> références au catalogue</small></strong></div><div className="stock-segments" aria-hidden="true">{products.length ? <><span style={{ flex: products.length - stats.outOfStock.length - stats.lowStock.length }} /><span style={{ flex: stats.lowStock.length }} /><span style={{ flex: stats.outOfStock.length }} /></> : <span className="stock-segment-empty" />}</div><div className="stock-counts"><div><span className="tiny-dot" />Disponible<strong>{products.length - stats.outOfStock.length - stats.lowStock.length}</strong></div><div><span className="tiny-dot tiny-dot--amber" />Stock bas<strong>{stats.lowStock.length}</strong></div><div><span className="tiny-dot tiny-dot--red" />En rupture<strong>{stats.outOfStock.length}</strong></div></div><div className="stock-investment"><span>Valeur du stock investi</span><strong><Money value={stats.stockValue} /></strong></div></section>
                    <section className="quick-actions"><h2>Accès rapide</h2><Link to="/orders/new"><Plus size={16} />Nouvelle commande<ArrowRight size={15} /></Link><Link to="/orders"><ReceiptText size={16} />Voir les commandes<ArrowRight size={15} /></Link><Link to="/products"><Package size={16} />Gérer le stock<ArrowRight size={15} /></Link></section>
                </aside>
            </div>
        </div>
    );
}

function CalendarIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4M17 3v4M3 11h18" /></svg>;
}

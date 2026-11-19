import { useEffect, useMemo, useState } from 'react';
import { ArrowDownUp, CalendarDays, ChevronDown, ChevronRight, CircleDollarSign, Edit2, Package, Pencil, Phone, Plus, Printer, ReceiptText, Search, ShoppingBag, Trash2, TrendingUp, UserPlus, UserRound, Users, X } from 'lucide-react';
import Modal from '../components/Modal';
import AppSelect from '../components/AppSelect';
import ImportButton from '../components/ImportButton';
import ExportButton from '../components/ExportButton';
import { useClients } from '../hooks/useClients';
import { useOrders } from '../hooks/useOrders';
import { transformClientData } from '../utils/importExcel';
import { fmt, fmtFull } from '../utils/format';
import './Clients.css';

const number = value => Number(value) || 0;
const normalize = value => String(value || '').trim().toLocaleLowerCase('fr');
const normalizePhone = value => String(value || '').replace(/\D/g, '');

function Money({ value }) {
    return <span title={`${fmtFull(value)} MAD`}>{fmt(value)}<small className="client-money-unit"> MAD</small></span>;
}

function formatDate(value, options = {}) {
    if (!value) return 'Date inconnue';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date inconnue';
    return date.toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric', ...options });
}

function orderBelongsToClient(order, client) {
    if (!order?.client || !client) return false;
    if (order.client.id && client.id) return String(order.client.id) === String(client.id);
    const orderPhone = normalizePhone(order.client.phone);
    const clientPhone = normalizePhone(client.phone);
    if (orderPhone && clientPhone) return orderPhone === clientPhone;
    const orderName = normalize(order.client.name);
    return Boolean(orderName) && orderName === normalize(client.name);
}

function itemProfit(item) {
    if (item.profit !== null && item.profit !== undefined && Number.isFinite(Number(item.profit))) return Number(item.profit);
    const quantity = number(item.quantity);
    const sale = number(item.total ?? quantity * number(item.price));
    if (item.cost !== null && item.cost !== undefined && Number.isFinite(Number(item.cost))) return sale - Number(item.cost);
    if (item.purchasePrice !== null && item.purchasePrice !== undefined && Number.isFinite(Number(item.purchasePrice))) return sale - quantity * Number(item.purchasePrice);
    return null;
}

function ClientOrderDetails({ order, onDelete }) {
    const items = order.items || [];
    const lossItems = items.filter(item => itemProfit(item) < 0);
    const lossTotal = lossItems.reduce((sum, item) => sum + Math.abs(itemProfit(item)), 0);

    return <div className="client-order-details">
        {lossItems.length > 0 && <div className="client-order-loss-note"><TrendingUp size={16} /><div><strong>{lossItems.length} produit{lossItems.length > 1 ? 's' : ''} à perte · {fmtFull(lossTotal)} MAD perdus</strong><ul>{[...lossItems].sort((a, b) => itemProfit(a) - itemProfit(b)).map((item, index) => <li key={`${item.productId || item.name}-${index}`}><span>{item.name || 'Article'}</span><b>{fmtFull(itemProfit(item))} MAD</b></li>)}</ul></div></div>}
        {number(order.profitAmount) < 0 && lossItems.length === 0 && <div className="client-order-loss-note"><TrendingUp size={16} /><span><strong>Ce bon est déficitaire</strong><small>Le détail des coûts par produit n’est pas disponible pour cette commande.</small></span></div>}
        <div className="client-order-detail-head"><span>Produit</span><span>Qté × Prix</span><span>Total</span><span>Résultat</span></div>
        {items.map((item, index) => {
            const profit = itemProfit(item);
            return <div className={`client-order-line ${profit < 0 ? 'client-order-line--loss' : ''}`} key={`${item.productId || item.name}-${index}`}>
                <span className="client-order-product"><span><Package size={14} />{item.name || 'Article'}</span>{item.purchasePrice !== null && item.purchasePrice !== undefined && <small>Prix d’achat : {fmt(item.purchasePrice)} MAD / unité</small>}</span>
                <span>{number(item.quantity)} × {fmt(item.price)} MAD</span>
                <strong>{fmt(item.total ?? number(item.quantity) * number(item.price))} MAD</strong>
                <strong className={profit === null ? 'client-item-profit-unknown' : profit < 0 ? 'client-item-profit-loss' : profit > 0 ? 'client-item-profit-gain' : 'client-item-profit-neutral'}>{profit === null ? 'Non disponible' : `${profit > 0 ? '+' : ''}${fmt(profit)} MAD`}</strong>
            </div>;
        })}
        {!items.length && <p className="client-order-no-items">Aucun détail produit disponible.</p>}
        <div className="client-order-total"><span>Total de la commande</span><strong><Money value={order.totalAmount} /></strong></div>
        <div className="client-order-actions"><a href={`/orders/print/${order.id}`} target="_blank" rel="noopener noreferrer"><Printer size={15} />Imprimer le bon</a><button type="button" onClick={() => onDelete(order)}><Trash2 size={15} />Supprimer le bon</button></div>
    </div>;
}

export default function Clients() {
    const { clients, loading: clientsLoading, addClient, deleteClient, updateClient, importClients } = useClients();
    const { orders, loading: ordersLoading, deleteOrder } = useOrders();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [selectedClientId, setSelectedClientId] = useState(null);
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('recent-client');
    const [segment, setSegment] = useState('all');
    const [formData, setFormData] = useState({ name: '', phone: '' });

    useEffect(() => {
        if (selectedClientId === null) return undefined;
        const onKeyDown = event => { if (event.key === 'Escape') setSelectedClientId(null); };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedClientId]);

    const clientAnalytics = useMemo(() => clients.map(client => {
        const clientOrders = orders.filter(order => orderBelongsToClient(order, client)).sort((a, b) => new Date(b.date) - new Date(a.date));
        const revenue = clientOrders.reduce((sum, order) => sum + number(order.totalAmount), 0);
        const profit = clientOrders.reduce((sum, order) => sum + number(order.profitAmount), 0);
        const items = clientOrders.reduce((sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + number(item.quantity), 0), 0);
        return {
            ...client,
            orders: clientOrders,
            orderCount: clientOrders.length,
            revenue,
            profit,
            items,
            averageOrder: clientOrders.length ? revenue / clientOrders.length : 0,
            lastOrderDate: clientOrders[0]?.date || null,
            firstOrderDate: clientOrders[clientOrders.length - 1]?.date || null,
            createdDate: client.created_at || client.createdAt || null
        };
    }), [clients, orders]);

    const filteredClients = useMemo(() => {
        const query = normalize(search);
        const filtered = clientAnalytics.filter(client => {
            const matchesSearch = !query || [client.name, client.phone, client.reference].some(value => normalize(value).includes(query));
            const matchesSegment = segment === 'all'
                || (segment === 'buyers' && client.orderCount > 0)
                || (segment === 'inactive' && client.orderCount === 0)
                || (segment === 'profitable' && client.profit > 0)
                || (segment === 'loss' && client.profit < 0);
            return matchesSearch && matchesSegment;
        });
        return [...filtered].sort((a, b) => {
            if (sortBy === 'orders') return b.orderCount - a.orderCount || b.revenue - a.revenue;
            if (sortBy === 'revenue') return b.revenue - a.revenue;
            if (sortBy === 'profit') return b.profit - a.profit;
            if (sortBy === 'last-order') return new Date(b.lastOrderDate || 0) - new Date(a.lastOrderDate || 0);
            if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || ''), 'fr');
            return new Date(b.createdDate || 0) - new Date(a.createdDate || 0);
        });
    }, [clientAnalytics, search, segment, sortBy]);

    const selectedClient = clientAnalytics.find(client => String(client.id) === String(selectedClientId)) || null;
    const totals = useMemo(() => ({
        buyers: clientAnalytics.filter(client => client.orderCount > 0).length,
        orders: clientAnalytics.reduce((sum, client) => sum + client.orderCount, 0),
        revenue: clientAnalytics.reduce((sum, client) => sum + client.revenue, 0),
        profit: clientAnalytics.reduce((sum, client) => sum + client.profit, 0)
    }), [clientAnalytics]);
    const loading = clientsLoading || ordersLoading;

    const handleSubmit = async event => {
        event.preventDefault();
        if (!formData.name.trim()) return;
        try {
            if (editingClient) await updateClient(editingClient.id, formData);
            else await addClient({ reference: `CLI-${String(clients.length + 1).padStart(4, '0')}`, ...formData, created_at: new Date().toISOString() });
            handleCloseModal();
        } catch (error) {
            alert(`Erreur lors de ${editingClient ? 'la modification' : 'l’ajout'} du client : ${error.message}`);
        }
    };

    const handleEdit = client => {
        setEditingClient(client);
        setFormData({ name: client.name || '', phone: client.phone || '' });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingClient(null);
        setFormData({ name: '', phone: '' });
    };

    const handleDelete = async client => {
        if (!confirm(`Supprimer le client « ${client.name} » ?`)) return;
        try {
            await deleteClient(client.id);
            if (String(selectedClientId) === String(client.id)) setSelectedClientId(null);
        } catch (error) {
            alert('Erreur lors de la suppression : ' + error.message);
        }
    };

    const handleDeleteOrder = async order => {
        if (!confirm(`Supprimer définitivement la commande #${String(order.id).slice(-6)} de ce client ?`)) return;
        try {
            await deleteOrder(order.id);
            setExpandedOrderId(null);
        } catch (error) {
            alert('Erreur lors de la suppression du bon : ' + error.message);
        }
    };

    const openProfile = client => {
        setSelectedClientId(client.id);
        setExpandedOrderId(null);
    };

    const handleImport = async excelData => {
        try {
            const validClients = excelData.map(transformClientData).filter(client => client.name);
            await importClients(validClients);
            alert(`${validClients.length} clients importés.`);
        } catch (error) {
            alert('Erreur lors de l’import : ' + error.message);
        }
    };

    return (
        <div className="clients-page fade-in">
            <div className="clients-heading">
                <div><h1><Users size={27} />Clients</h1><p>Suivez chaque relation client, ses commandes et sa rentabilité.</p></div>
                <div className="clients-heading-actions"><button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={16} />Nouveau client</button><ImportButton type="client" onImport={handleImport} /><ExportButton data={clients} type="client" /></div>
            </div>

            <div className="client-kpis">
                <div className="client-kpi client-kpi--blue"><span><Users size={17} />Clients enregistrés</span><strong>{clients.length}</strong><small>{totals.buyers} ont déjà commandé</small></div>
                <div className="client-kpi client-kpi--violet"><span><ShoppingBag size={17} />Commandes clients</span><strong>{totals.orders.toLocaleString('fr-MA')}</strong><small>{clients.length ? (totals.orders / clients.length).toFixed(1) : '0.0'} par client</small></div>
                <div className="client-kpi client-kpi--cyan"><span><CircleDollarSign size={17} />Chiffre d’affaires</span><strong><Money value={totals.revenue} /></strong><small>Dépensé par tous les clients</small></div>
                <div className={`client-kpi ${totals.profit < 0 ? 'client-kpi--red' : 'client-kpi--green'}`}><span><TrendingUp size={17} />Profit généré</span><strong><Money value={totals.profit} /></strong><small>Rentabilité totale</small></div>
            </div>

            <div className="client-toolbar">
                <label className="client-search"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher par nom, téléphone ou référence…" /></label>
                <AppSelect value={segment} onChange={setSegment} label="Filtrer les clients" icon={Users} options={[{ value: 'all', label: 'Tous les clients' }, { value: 'buyers', label: 'Avec commandes' }, { value: 'inactive', label: 'Sans commande' }, { value: 'profitable', label: 'Rentables' }, { value: 'loss', label: 'À perte' }]} />
                <AppSelect value={sortBy} onChange={setSortBy} label="Trier les clients" icon={ArrowDownUp} options={[{ value: 'recent-client', label: 'Derniers ajoutés' }, { value: 'last-order', label: 'Derniers acheteurs' }, { value: 'orders', label: 'Plus de commandes' }, { value: 'revenue', label: 'Plus gros acheteurs' }, { value: 'profit', label: 'Plus rentables' }, { value: 'name', label: 'Nom A–Z' }]} />
                <span className="client-result-count">{filteredClients.length} résultat{filteredClients.length !== 1 ? 's' : ''}</span>
            </div>

            {loading ? <div className="clients-empty"><div className="loading-spinner" /><p>Chargement des clients et des commandes…</p></div> : clients.length === 0 ? <div className="clients-empty"><UserPlus size={42} /><h2>Aucun client</h2><p>Ajoutez votre premier client pour commencer son suivi.</p><button className="btn btn-primary" onClick={() => setIsModalOpen(true)}><Plus size={16} />Ajouter un client</button></div> : (
                <div className="client-table-shell">
                    <table className="client-table">
                        <thead><tr><th>Client</th><th>Ajouté</th><th>Commandes</th><th>Dépenses</th><th>Profit</th><th>Dernier achat</th><th aria-label="Actions" /></tr></thead>
                        <tbody>{filteredClients.map(client => (
                            <tr key={client.id} onClick={() => openProfile(client)} tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' && event.target === event.currentTarget) openProfile(client); }}>
                                <td><div className="client-identity"><span className="client-avatar"><UserRound size={18} /></span><span><strong>{client.name}</strong><small>{client.phone || 'Téléphone non renseigné'} · {client.reference || 'Sans référence'}</small></span></div></td>
                                <td>{formatDate(client.createdDate)}</td>
                                <td><span className="client-order-count">{client.orderCount}</span><small className="client-cell-note">{client.items} article{client.items !== 1 ? 's' : ''}</small></td>
                                <td className="client-revenue"><Money value={client.revenue} /><small className="client-cell-note">Moy. {fmt(client.averageOrder)} MAD</small></td>
                                <td className={`client-profit ${client.profit < 0 ? 'client-profit--loss' : client.profit > 0 ? 'client-profit--gain' : ''}`}><Money value={client.profit} /></td>
                                <td>{client.lastOrderDate ? formatDate(client.lastOrderDate) : 'Aucun achat'}</td>
                                <td><div className="client-actions"><button onClick={event => { event.stopPropagation(); handleEdit(client); }} aria-label={`Modifier ${client.name}`}><Pencil size={15} /></button><button className="client-delete" onClick={event => { event.stopPropagation(); handleDelete(client); }} aria-label={`Supprimer ${client.name}`}><Trash2 size={15} /></button><ChevronRight size={16} /></div></td>
                            </tr>
                        ))}</tbody>
                    </table>
                    {!filteredClients.length && <div className="clients-no-result"><Search size={26} /><p>Aucun client ne correspond à ces filtres.</p></div>}
                </div>
            )}

            {selectedClient && <div className="client-profile-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedClientId(null); }}><aside className="client-profile" aria-label={`Profil de ${selectedClient.name}`}>
                <div className="client-profile-header"><div className="client-profile-person"><span><UserRound size={24} /></span><div><small>Fiche client</small><h2>{selectedClient.name}</h2><p>{selectedClient.reference || 'Sans référence'}</p></div></div><div className="client-profile-actions"><button onClick={() => { handleEdit(selectedClient); setSelectedClientId(null); }}><Pencil size={16} />Modifier</button><button className="client-profile-close" onClick={() => setSelectedClientId(null)} aria-label="Fermer"><X size={19} /></button></div></div>
                <div className="client-contact-strip"><span><Phone size={14} />{selectedClient.phone || 'Téléphone non renseigné'}</span><span><CalendarDays size={14} />Client depuis {formatDate(selectedClient.createdDate)}</span></div>
                <div className="client-profile-stats"><div><span>Commandes</span><strong>{selectedClient.orderCount}</strong></div><div><span>Total dépensé</span><strong><Money value={selectedClient.revenue} /></strong></div><div className={selectedClient.profit < 0 ? 'profile-stat-loss' : selectedClient.profit > 0 ? 'profile-stat-profit' : ''}><span>Profit</span><strong><Money value={selectedClient.profit} /></strong></div><div><span>Panier moyen</span><strong><Money value={selectedClient.averageOrder} /></strong></div></div>
                <div className="client-history-heading"><div><h3>Historique des commandes</h3><p>{selectedClient.orderCount ? `Du ${formatDate(selectedClient.firstOrderDate)} au ${formatDate(selectedClient.lastOrderDate)}` : 'Aucune commande enregistrée'}</p></div><ReceiptText size={18} /></div>
                <div className="client-order-history">{selectedClient.orders.map(order => {
                    const expanded = String(expandedOrderId) === String(order.id);
                    return <article className={`client-order-card ${expanded ? 'client-order-card--open' : ''}`} key={order.id}>
                        <button className="client-order-summary" onClick={() => setExpandedOrderId(expanded ? null : order.id)} aria-expanded={expanded}><span className="client-order-icon"><ReceiptText size={17} /></span><span><strong>Commande #{String(order.id).slice(-6)}</strong><small>{formatDate(order.date, { hour: '2-digit', minute: '2-digit' })}</small></span><span className="client-order-meta"><strong><Money value={order.totalAmount} /></strong><small className={number(order.profitAmount) < 0 ? 'order-profit-loss' : number(order.profitAmount) > 0 ? 'order-profit-positive' : ''}>{number(order.profitAmount) > 0 ? '+' : ''}{fmt(order.profitAmount)} MAD profit</small></span><ChevronDown size={17} /></button>
                        {expanded && <ClientOrderDetails order={order} onDelete={handleDeleteOrder} />}
                    </article>;
                })}{!selectedClient.orders.length && <div className="client-no-orders"><ShoppingBag size={30} /><p>Ce client n’a pas encore passé de commande.</p></div>}</div>
            </aside></div>}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingClient ? 'Modifier le client' : 'Nouveau client'}><form onSubmit={handleSubmit} className="client-form"><div className="form-group"><label>Nom complet *</label><input required type="text" className="input" placeholder="Ex. Ahmed Alami" value={formData.name} onChange={event => setFormData({ ...formData, name: event.target.value })} /></div><div className="form-group"><label>Numéro de téléphone</label><input type="tel" className="input" placeholder="06 12 34 56 78" value={formData.phone} onChange={event => setFormData({ ...formData, phone: event.target.value })} /></div><div className="form-actions"><button type="button" className="btn btn-outline" onClick={handleCloseModal}>Annuler</button><button type="submit" className="btn btn-primary">{editingClient ? <><Edit2 size={16} />Enregistrer</> : <><Plus size={16} />Créer le client</>}</button></div></form></Modal>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useOrders } from '../hooks/useOrders';
import { useProducts } from '../hooks/useProducts';
import { Eye, Printer, Trash2, Search, FileText, ShoppingCart, Calendar, DollarSign, Edit2, Plus, Minus, Package, Check, X, AlertTriangle } from 'lucide-react';
import Modal from '../components/Modal';
import { fmt, fmtFull } from '../utils/format';
import './Orders.css';

export default function Orders() {
    const { orders, deleteOrder: removeOrder, updateOrder, loading } = useOrders();
    const { products, updateStock } = useProducts();

    const [search, setSearch] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);

    // ─── Edit State ───────────────────────────────────────────────
    const [editingOrder, setEditingOrder] = useState(null);   // order being edited
    const [editItems, setEditItems] = useState([]);            // mutable copy of items
    const [isSaving, setIsSaving] = useState(false);

    // Product search inside edit modal
    const [productSearch, setProductSearch] = useState('');
    const [showProductPicker, setShowProductPicker] = useState(false);

    const filteredOrders = orders.filter(o =>
        o.client.name.toLowerCase().includes(search.toLowerCase()) ||
        o.id.includes(search)
    );

    const deleteOrder = (id) => {
        if (confirm('Are you sure you want to delete this order?')) {
            removeOrder(id);
        }
    };

    const handleDeleteAll = async () => {
        if (orders.length === 0) return;
        if (confirm(`ATTENTION: Voulez-vous vraiment supprimer les ${orders.length} commandes ?\n\nCette action est irréversible et supprimera tout l'historique !`)) {
            try {
                for (const order of orders) {
                    await removeOrder(order.id);
                }
                alert('Toutes les commandes ont été supprimées avec succès !');
            } catch (error) {
                alert('Erreur lors de la suppression : ' + error.message);
            }
        }
    };

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const todayOrders = orders.filter(o => {
        const orderDate = new Date(o.date).toDateString();
        const today = new Date().toDateString();
        return orderDate === today;
    });

    const handlePrint = (order) => {
        window.open(`/orders/print/${order.id}`, '_blank');
    };

    // ─── Open Edit Modal ──────────────────────────────────────────
    const openEditModal = (order) => {
        setEditingOrder(order);
        // Deep copy items so we don't mutate original
        setEditItems(order.items.map(item => ({ ...item })));
        setProductSearch('');
        setShowProductPicker(false);
    };

    const closeEditModal = () => {
        setEditingOrder(null);
        setEditItems([]);
        setIsSaving(false);
        setShowProductPicker(false);
    };

    // ─── Edit Item Handlers ───────────────────────────────────────
    const handleQtyChange = (index, value) => {
        const qty = parseFloat(value) || 0;
        setEditItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            const total = qty * item.price;
            const cost  = qty * (item.purchasePrice || 0);
            return { ...item, quantity: qty, total, cost, profit: total - cost };
        }));
    };

    const handlePriceChange = (index, value) => {
        const price = parseFloat(value) || 0;
        setEditItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            const total = item.quantity * price;
            const cost  = item.quantity * (item.purchasePrice || 0);
            return { ...item, price, total, cost, profit: total - cost };
        }));
    };

    const removeEditItem = (index) => {
        setEditItems(prev => prev.filter((_, i) => i !== index));
    };

    // ─── Add product from picker ──────────────────────────────────
    const addProductToEdit = (product) => {
        // If already in list, just bump quantity
        const existing = editItems.findIndex(i => i.productId === product.id);
        if (existing !== -1) {
            handleQtyChange(existing, editItems[existing].quantity + 1);
        } else {
            const price = parseFloat(product.price) || 0;
            const purchasePrice = parseFloat(product.purchase_price) || 0;
            setEditItems(prev => [...prev, {
                productId: product.id,
                name: product.name,
                price,
                purchasePrice,
                quantity: 1,
                total: price,
                cost: purchasePrice,
                profit: price - purchasePrice
            }]);
        }
        setShowProductPicker(false);
        setProductSearch('');
    };

    // ─── Save Edit ────────────────────────────────────────────────
    const handleSaveEdit = async () => {
        if (!editingOrder || editItems.length === 0) return;
        setIsSaving(true);

        try {
            const oldItems = editingOrder.items;

            // Build map of old quantities per productId
            const oldQtyMap = {};
            for (const item of oldItems) {
                if (item.productId) {
                    oldQtyMap[item.productId] = (oldQtyMap[item.productId] || 0) + item.quantity;
                }
            }

            // Build map of new quantities per productId
            const newQtyMap = {};
            for (const item of editItems) {
                if (item.productId) {
                    newQtyMap[item.productId] = (newQtyMap[item.productId] || 0) + item.quantity;
                }
            }

            // Collect all productIds involved
            const allIds = new Set([...Object.keys(oldQtyMap), ...Object.keys(newQtyMap)]);

            // Apply stock deltas: delta = oldQty - newQty (positive = return to stock)
            for (const productId of allIds) {
                const oldQty = oldQtyMap[productId] || 0;
                const newQty = newQtyMap[productId] || 0;
                const delta = oldQty - newQty; // positive means we used fewer → return to stock
                if (delta !== 0) {
                    await updateStock(productId, delta);
                }
            }

            // Recalculate totals
            const totalAmount  = editItems.reduce((s, i) => s + i.total, 0);
            const costAmount   = editItems.reduce((s, i) => s + (i.cost || 0), 0);
            const profitAmount = editItems.reduce((s, i) => s + (i.profit || 0), 0);

            const updatedOrder = {
                ...editingOrder,
                items: editItems,
                totalAmount,
                costAmount,
                profitAmount,
            };

            await updateOrder(editingOrder.id, updatedOrder);
            closeEditModal();
        } catch (err) {
            alert('Erreur lors de la modification : ' + err.message);
            setIsSaving(false);
        }
    };

    // ─── Edit totals ──────────────────────────────────────────────
    const editTotal  = editItems.reduce((s, i) => s + i.total, 0);
    const editProfit = editItems.reduce((s, i) => s + (i.profit || 0), 0);

    const filteredProductsForPicker = products.filter(p =>
        p.name?.toLowerCase().includes(productSearch.toLowerCase())
    );

    return (
        <div className="orders-page fade-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <ShoppingCart size={32} />
                        Order History
                    </h1>
                    <p className="page-subtitle">View and manage all orders</p>
                </div>

                <div className="header-actions">
                    <div className="search-wrapper">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            className="input search-input"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {orders.length > 0 && (
                        <button className="btn btn-danger" onClick={handleDeleteAll} title="Supprimer tout l'historique">
                            <Trash2 size={18} /> Tout Supprimer
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Bar */}
            <div className="stats-bar">
                <div className="stat-item">
                    <FileText size={20} />
                    <span className="stat-label">Total Orders</span>
                    <span className="stat-value">{orders.length}</span>
                </div>
                <div className="stat-item">
                    <Calendar size={20} />
                    <span className="stat-label">Today</span>
                    <span className="stat-value">{todayOrders.length}</span>
                </div>
                <div className="stat-item">
                    <DollarSign size={20} />
                    <span className="stat-label">Total Revenue</span>
                    <span className="stat-value" title={fmtFull(totalRevenue) + ' MAD'}>{fmt(totalRevenue)} MAD</span>
                </div>
            </div>

            {/* Content */}
            {filteredOrders.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <FileText size={64} />
                    </div>
                    <h3>No orders found</h3>
                    <p>{search ? `No results for "${search}"` : 'No orders created yet'}</p>
                </div>
            ) : (
                <div className="orders-table-container">
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th>Date &amp; Time</th>
                                <th>Client</th>
                                <th>Items</th>
                                <th>Status</th>
                                <th className="text-right">Total (MAD)</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map((order, index) => (
                                <tr key={order.id} style={{ animationDelay: `${index * 0.03}s` }}>
                                    <td>
                                        <div className="order-date">
                                            <Calendar size={16} />
                                            <div>
                                                <div className="date-text">{new Date(order.date).toLocaleDateString()}</div>
                                                <div className="time-text">{new Date(order.date).toLocaleTimeString()}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="client-info">
                                            <strong>{order.client.name}</strong>
                                            <span>{order.client.phone}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="items-count">
                                            {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="badge badge-success">
                                            {order.status}
                                        </span>
                                    </td>
                                    <td className="text-right">
                                        <div className="order-total" title={fmtFull(order.totalAmount) + ' MAD'}>
                                            {fmt(order.totalAmount)}
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <div className="action-buttons">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="action-btn view-btn"
                                                title="View Details"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(order)}
                                                className="action-btn edit-btn"
                                                title="Modifier le Bon"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handlePrint(order)}
                                                className="action-btn print-btn"
                                                title="Print Receipt"
                                            >
                                                <Printer size={16} />
                                            </button>
                                            <button
                                                onClick={() => deleteOrder(order.id)}
                                                className="action-btn delete-btn"
                                                title="Delete Order"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── View Details Modal ── */}
            <Modal
                isOpen={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                title="Order Details"
            >
                {selectedOrder && (
                    <div className="order-details">
                        <div className="order-header">
                            <span className="order-id">Order #{selectedOrder.id.slice(-8)}</span>
                            <span className="order-date-time">{new Date(selectedOrder.date).toLocaleString()}</span>
                        </div>

                        <div className="detail-section">
                            <h4>Client Information</h4>
                            <div className="client-card">
                                <p><strong>Name:</strong> {selectedOrder.client.name}</p>
                                <p><strong>Phone:</strong> {selectedOrder.client.phone}</p>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h4>Order Items</h4>
                            <div className="items-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th className="text-right">Qty × Price</th>
                                            <th className="text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedOrder.items.map((item, i) => (
                                            <tr key={i}>
                                                <td>{item.name}</td>
                                                <td className="text-right">
                                                    {item.quantity} × {item.price} MAD
                                                </td>
                                                <td className="text-right text-bold" title={fmtFull(item.total) + ' MAD'}>
                                                    {fmt(item.total)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="order-footer">
                            <span className="total-label">Total Amount</span>
                            <span className="total-amount" title={fmtFull(selectedOrder.totalAmount) + ' MAD'}>{fmt(selectedOrder.totalAmount)} MAD</span>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    handlePrint(selectedOrder);
                                    setSelectedOrder(null);
                                }}
                            >
                                <Printer size={16} /> Print Receipt
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── Edit Order Modal ── */}
            <Modal
                isOpen={!!editingOrder}
                onClose={closeEditModal}
                title=""
                size="lg"
            >
                {editingOrder && (
                    <div className="edit-order-modal">

                        {/* ── Modal Header info ── */}
                        <div className="edit-modal-header">
                            <div className="edit-modal-client">
                                <div className="edit-modal-icon"><Edit2 size={18} /></div>
                                <div>
                                    <div className="edit-modal-client-name">{editingOrder.client.name}</div>
                                    <div className="edit-modal-date">
                                        Bon du {new Date(editingOrder.date).toLocaleDateString('fr-MA', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                            </div>
                            <div className="edit-modal-badge">
                                {editItems.length} article{editItems.length !== 1 ? 's' : ''}
                            </div>
                        </div>

                        {/* ── Items table ── */}
                        <div className="edit-table-wrapper">
                            {/* Table header */}
                            <div className="edit-table-head">
                                <span className="col-product">Produit</span>
                                <span className="col-qty">Quantité</span>
                                <span className="col-price">Prix / unité</span>
                                <span className="col-total">Sous-total</span>
                                <span className="col-action"></span>
                            </div>

                            {/* Table rows */}
                            <div className="edit-table-body">
                                {editItems.length === 0 && (
                                    <div className="edit-empty">
                                        <AlertTriangle size={28} />
                                        <span>Aucun article — ajoutez un produit ci-dessous.</span>
                                    </div>
                                )}
                                {editItems.map((item, index) => (
                                    <div key={index} className="edit-table-row">
                                        {/* Product name */}
                                        <div className="col-product edit-product-label">
                                            <Package size={14} className="edit-product-icon" />
                                            {item.name}
                                        </div>

                                        {/* Quantity */}
                                        <div className="col-qty">
                                            <div className="edit-qty-controls">
                                                <button
                                                    type="button"
                                                    className="edit-qty-btn"
                                                    onClick={() => handleQtyChange(index, Math.max(0.5, item.quantity - 0.5))}
                                                >
                                                    <Minus size={11} />
                                                </button>
                                                <input
                                                    type="number"
                                                    step="0.5"
                                                    min="0.5"
                                                    className="edit-qty-input"
                                                    value={item.quantity}
                                                    onChange={e => handleQtyChange(index, e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    className="edit-qty-btn"
                                                    onClick={() => handleQtyChange(index, item.quantity + 0.5)}
                                                >
                                                    <Plus size={11} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className="col-price">
                                            <div className="edit-price-wrapper">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    className="edit-price-input"
                                                    value={item.price}
                                                    onChange={e => handlePriceChange(index, e.target.value)}
                                                />
                                                <span className="edit-price-unit">MAD</span>
                                            </div>
                                        </div>

                                        {/* Subtotal */}
                                        <div className="col-total">
                                            <span className="edit-subtotal">{fmt(item.total)}</span>
                                            <span className="edit-subtotal-unit">MAD</span>
                                        </div>

                                        {/* Remove */}
                                        <div className="col-action">
                                            <button
                                                type="button"
                                                className="edit-remove-btn"
                                                onClick={() => removeEditItem(index)}
                                                title="Supprimer"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Add product ── */}
                        <div className="edit-add-zone">
                            {!showProductPicker ? (
                                <button
                                    type="button"
                                    className="edit-add-trigger"
                                    onClick={() => setShowProductPicker(true)}
                                >
                                    <Plus size={15} />
                                    Ajouter un produit
                                </button>
                            ) : (
                                <div className="edit-product-picker">
                                    <div className="edit-picker-search">
                                        <Search size={15} />
                                        <input
                                            className="edit-picker-input"
                                            placeholder="Chercher un produit..."
                                            autoFocus
                                            value={productSearch}
                                            onChange={e => setProductSearch(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="edit-close-picker"
                                            onClick={() => { setShowProductPicker(false); setProductSearch(''); }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="edit-picker-list">
                                        {filteredProductsForPicker.length === 0 && (
                                            <p className="edit-picker-empty">Aucun produit trouvé</p>
                                        )}
                                        {filteredProductsForPicker.map(p => (
                                            <div
                                                key={p.id}
                                                className="edit-picker-item"
                                                onClick={() => addProductToEdit(p)}
                                            >
                                                <div className="edit-picker-dot" />
                                                <span className="edit-picker-name">{p.name}</span>
                                                <span className="edit-picker-stock">
                                                    Stock: {p.stock_quantity ?? '—'}
                                                </span>
                                                <span className="edit-picker-price">{p.price} MAD</span>
                                                <Plus size={13} className="edit-picker-plus" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Summary + Actions ── */}
                        <div className="edit-footer">
                            {editItems.length > 0 && (
                                <div className="edit-totals">
                                    <div className="edit-total-chip">
                                        <span className="edit-total-label">Total Vente</span>
                                        <span className="edit-total-value">{fmt(editTotal)} MAD</span>
                                    </div>
                                    <div className="edit-profit-chip" style={{ color: editProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                        <span className="edit-total-label">Profit Net</span>
                                        <span className="edit-profit-value">{editProfit >= 0 ? '+' : ''}{fmt(editProfit)} MAD</span>
                                    </div>
                                </div>
                            )}
                            <div className="edit-actions">
                                <button type="button" className="btn btn-outline" onClick={closeEditModal}>
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSaveEdit}
                                    disabled={isSaving || editItems.length === 0}
                                >
                                    <Check size={16} />
                                    {isSaving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                                </button>
                            </div>
                        </div>

                    </div>
                )}
            </Modal>
        </div>
    );
}

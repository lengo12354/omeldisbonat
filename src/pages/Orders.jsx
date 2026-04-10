import { useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { Eye, Printer, Trash2, Search, FileText, ShoppingCart, Calendar, DollarSign } from 'lucide-react';
import Modal from '../components/Modal';
import { fmt, fmtFull } from '../utils/format';
import './Orders.css';

export default function Orders() {
    const { orders, deleteOrder: removeOrder, loading } = useOrders();
    const [search, setSearch] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);

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
        // Open PrintOrder page in new tab
        window.open(`/orders/print/${order.id}`, '_blank');
    };

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
                                <th>Date & Time</th>
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
        </div>
    );
}

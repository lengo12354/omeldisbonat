import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../hooks/useClients';
import { useProducts } from '../hooks/useProducts';
import { useOrders } from '../hooks/useOrders';
import { Search, User, Package, ShoppingCart, ArrowRight, ArrowLeft, Check, Plus, Minus, Trash2, TrendingUp, AlertTriangle, XCircle, DollarSign } from 'lucide-react';
import Modal from '../components/Modal';
import { fmt, fmtFull } from '../utils/format';
import './NewOrder.css';

export default function NewOrder() {
    const navigate = useNavigate();
    const { clients, loading: clientsLoading } = useClients();
    const { products, loading: productsLoading, updateStock } = useProducts();
    const { addOrder } = useOrders();

    const [step, setStep] = useState(1); // 1: Client, 2: Products
    const [selectedClient, setSelectedClient] = useState(null);
    const [cart, setCart] = useState([]);

    // Search states
    const [clientSearch, setClientSearch] = useState('');
    const [productSearch, setProductSearch] = useState('');

    // Product Add Modal State
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [itemForm, setItemForm] = useState({ price: '', quantity: 1 });

    // Filtering
    const filteredClients = clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));
    const filteredProducts = products.filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase()));

    // Step 1: Client Selection
    const handleSelectClient = (client) => {
        setSelectedClient(client);
        setStep(2);
    };

    // Step 2: Product Addition
    const openAddProductModal = (product) => {
        setCurrentProduct(product);
        setItemForm({ price: product.price || '', quantity: 1 });
        setIsProductModalOpen(true);
    };

    const addToCart = (e) => {
        e.preventDefault();
        if (!currentProduct) return;

        const sellPrice = parseFloat(itemForm.price) || 0;
        const purchasePrice = parseFloat(currentProduct.purchase_price) || 0;
        const quantity = parseFloat(itemForm.quantity) || 1;

        // ❌ منع البيع بأقل من ثمن الشراء
        if (purchasePrice > 0 && sellPrice < purchasePrice) {
            alert(`⚠️ Prix de vente invalide!\nLe prix de vente (${sellPrice} MAD) ne peut pas être inférieur au prix d'achat (${purchasePrice} MAD).`);
            return;
        }
        const totalSell = sellPrice * quantity;
        const totalCost = purchasePrice * quantity;
        const profit = totalSell - totalCost;

        const newItem = {
            productId: currentProduct.id,
            name: currentProduct.name,
            price: sellPrice,
            purchasePrice: purchasePrice,
            quantity: quantity,
            total: totalSell,
            cost: totalCost,
            profit: profit
        };

        setCart(prev => [...prev, newItem]);
        setIsProductModalOpen(false);
        setCurrentProduct(null);
    };

    const removeFromCart = (index) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    // Cart totals
    const cartTotal = cart.reduce((sum, item) => sum + item.total, 0);
    const cartCost = cart.reduce((sum, item) => sum + item.cost, 0);
    const cartProfit = cart.reduce((sum, item) => sum + item.profit, 0);
    const profitMargin = cartTotal > 0 ? ((cartProfit / cartTotal) * 100).toFixed(1) : 0;

    const handleConfirmOrder = async () => {
        if (!selectedClient || cart.length === 0) return;

        const newOrder = {
            id: Date.now().toString(),
            client: selectedClient,
            items: cart,
            totalAmount: cartTotal,
            costAmount: cartCost,
            profitAmount: cartProfit,
            date: new Date().toISOString(),
            status: 'Completed'
        };

        try {
            await addOrder(newOrder);

            // نقص stock لكل منتج في الكارت
            for (const item of cart) {
                if (item.productId) {
                    await updateStock(item.productId, -item.quantity);
                }
            }

            navigate('/orders');
        } catch (err) {
            alert('Erreur lors de la sauvegarde: ' + err.message);
        }
    };

    // Profit color
    const getProfitColor = (profit) => {
        if (profit > 0) return 'var(--success)';
        if (profit < 0) return 'var(--danger)';
        return 'var(--text-muted)';
    };

    return (
        <div className="new-order-page fade-in">
            {/* Header */}
            <div className="order-header">
                <h1 className="page-title">
                    <ShoppingCart size={32} />
                    Nouvelle Commande
                </h1>
                <div className="steps-indicator">
                    <div className={`step ${step >= 1 ? 'active' : ''}`}>
                        <span className="step-number">1</span>
                        <span className="step-label">Client</span>
                    </div>
                    <div className="step-divider"></div>
                    <div className={`step ${step >= 2 ? 'active' : ''}`}>
                        <span className="step-number">2</span>
                        <span className="step-label">Produits</span>
                    </div>
                </div>
            </div>

            <div className="order-content">
                {/* LEFT PANEL */}
                <div className="selection-panel">
                    {clientsLoading || productsLoading ? (
                        <div className="panel-content">
                            <div className="panel-body">
                                <div className="empty-message">
                                    <div className="loading-spinner"></div>
                                    <p>Chargement...</p>
                                </div>
                            </div>
                        </div>
                    ) : step === 1 ? (
                        <div className="panel-content">
                            <div className="panel-header">
                                <div className="search-wrapper">
                                    <Search className="search-icon" size={18} />
                                    <input
                                        className="input search-input"
                                        placeholder="Chercher un client..."
                                        autoFocus
                                        value={clientSearch}
                                        onChange={e => setClientSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="panel-body">
                                <div className="clients-list">
                                    {filteredClients.map(client => (
                                        <div
                                            key={client.id}
                                            onClick={() => handleSelectClient(client)}
                                            className="client-item"
                                        >
                                            <div className="client-avatar"><User size={20} /></div>
                                            <div className="client-info">
                                                <p className="client-name">{client.name}</p>
                                                <p className="client-phone">{client.phone}</p>
                                            </div>
                                            <ArrowRight className="arrow-icon" size={18} />
                                        </div>
                                    ))}
                                    {filteredClients.length === 0 && (
                                        <p className="empty-message">Aucun client trouvé.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="panel-content">
                            <div className="panel-header">
                                <button onClick={() => setStep(1)} className="back-btn">
                                    <ArrowLeft size={20} />
                                </button>
                                <div className="search-wrapper">
                                    <Search className="search-icon" size={18} />
                                    <input
                                        className="input search-input"
                                        placeholder="Chercher un produit..."
                                        autoFocus
                                        value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="panel-body">
                                <div className="products-grid">
                                    {filteredProducts.map(product => {
                                        const stockQty = product.stock_quantity || 0;
                                        const isOut = stockQty === 0;
                                        return (
                                            <div
                                                key={product.id}
                                                onClick={() => !isOut && openAddProductModal(product)}
                                                className={`product-item ${isOut ? 'product-item--out' : ''}`}
                                                title={isOut ? 'Rupture de stock!' : ''}
                                            >
                                                <div className="product-icon">
                                                    {isOut
                                                        ? <AlertTriangle size={32} style={{ color: 'var(--danger)' }} />
                                                        : <Package size={32} />
                                                    }
                                                </div>
                                                <div className="product-name">{product.name}</div>
                                                {product.category && (
                                                    <span className="product-category">{product.category}</span>
                                                )}
                                                <div className={`product-stock-chip ${isOut ? 'out' : stockQty <= (product.reorder_level || 5) ? 'low' : 'ok'}`}>
                                                    {isOut ? <><XCircle size={12} className="inline-icon" /> Rupture</> : <><Package size={12} className="inline-icon" /> Stock: {stockQty}</>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT PANEL: CART */}
                <div className="cart-panel">
                    <div className="cart-header">
                        <h3>
                            <ShoppingCart size={18} />
                            Bon de Commande
                        </h3>
                        {selectedClient && (
                            <div className="selected-client">
                                <span className="label">Client:</span>
                                <span className="client-name">{selectedClient.name}</span>
                                <button onClick={() => setStep(1)} className="change-btn">Changer</button>
                            </div>
                        )}
                    </div>

                    <div className="cart-body">
                        {cart.length === 0 ? (
                            <div className="cart-empty">
                                <ShoppingCart size={48} />
                                <p>Panier vide</p>
                            </div>
                        ) : (
                            <div className="cart-items">
                                {cart.map((item, index) => (
                                    <div key={index} className="cart-item">
                                        <div className="item-info">
                                            <p className="item-name">{item.name}</p>
                                            <p className="item-details">
                                                {item.quantity} × {item.price} MAD
                                            </p>
                                            <p className="item-profit" style={{ color: getProfitColor(item.profit) }}>
                                                <TrendingUp size={12} />
                                                Profit: {item.profit >= 0 ? '+' : ''}{fmt(item.profit)} MAD
                                            </p>
                                        </div>
                                        <div className="item-actions">
                                            <p className="item-total" title={fmtFull(item.total) + ' MAD'}>{fmt(item.total)}</p>
                                            <button onClick={() => removeFromCart(index)} className="remove-btn">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Profit Summary */}
                    {cart.length > 0 && (
                        <div className="cart-profit-summary">
                            <div className="profit-row">
                                <span>Coût Total (Ras el Mal)</span>
                                <span className="profit-cost" title={fmtFull(cartCost) + ' MAD'}>{fmt(cartCost)} MAD</span>
                            </div>
                            <div className="profit-row profit-row--highlight">
                                <span>Profit Net</span>
                                <span style={{ color: getProfitColor(cartProfit), fontWeight: 800 }}>
                                    {cartProfit >= 0 ? '+' : ''}{fmt(cartProfit)} MAD
                                </span>
                            </div>
                            <div className="profit-row">
                                <span>Marge</span>
                                <span className="profit-margin">{profitMargin}%</span>
                            </div>
                        </div>
                    )}

                    <div className="cart-footer">
                        <div className="cart-total">
                            <span>Total Vente</span>
                            <span className="total-amount" title={fmtFull(cartTotal) + ' MAD'}>{fmt(cartTotal)} MAD</span>
                        </div>
                        <button
                            onClick={handleConfirmOrder}
                            disabled={cart.length === 0 || !selectedClient}
                            className="btn btn-primary confirm-btn"
                        >
                            <Check size={18} />
                            Confirmer le Bon
                        </button>
                    </div>
                </div>
            </div>

            {/* ADD ITEM MODAL */}
            <Modal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                title={currentProduct?.name || 'Ajouter'}
            >
                <form onSubmit={addToCart} className="add-item-form">
                    {currentProduct?.purchase_price > 0 && (
                        <div className="modal-cost-info">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><DollarSign size={14} /> Prix d'achat (Ras el Mal):</span>
                            <strong>{parseFloat(currentProduct.purchase_price).toFixed(2)} MAD</strong>
                        </div>
                    )}
                    {currentProduct?.stock_quantity !== undefined && (
                        <div className="modal-stock-info">
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Package size={14} /> Stock disponible:</span>
                            <strong style={{ color: currentProduct.stock_quantity <= (currentProduct.reorder_level || 5) ? 'var(--warning)' : 'var(--success)' }}>
                                {currentProduct.stock_quantity} unités
                            </strong>
                        </div>
                    )}
                    <div className="form-group">
                        <label>Prix de Vente (MAD/unité)</label>
                        <input
                            type="number"
                            step="0.01"
                            min={currentProduct?.purchase_price || 0}
                            className="input"
                            value={itemForm.price}
                            onChange={e => setItemForm({ ...itemForm, price: e.target.value })}
                            autoFocus
                            required
                        />
                        {currentProduct?.purchase_price > 0 && (
                            <span className="form-hint" style={{ color: 'var(--warning)' }}>
                                ⚠️ Prix minimum: {parseFloat(currentProduct.purchase_price).toFixed(2)} MAD (ras el mal)
                            </span>
                        )}
                    </div>
                    <div className="form-group">
                        <label>Quantité</label>
                        <div className="quantity-controls">
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => setItemForm(prev => ({ ...prev, quantity: Math.max(0.5, parseFloat(prev.quantity) - 0.5) }))}
                            >
                                <Minus size={16} />
                            </button>
                            <input
                                type="number"
                                step="0.5"
                                className="input quantity-input"
                                value={itemForm.quantity}
                                min="0.5"
                                max={currentProduct?.stock_quantity || 9999}
                                onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })}
                            />
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={() => setItemForm(prev => ({ ...prev, quantity: parseFloat(prev.quantity) + 0.5 }))}
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Live Profit Preview */}
                    {itemForm.price && currentProduct?.purchase_price > 0 && (
                        <div className="modal-profit-preview">
                            <div className="preview-row">
                                <span>Vente:</span>
                                <span>{(parseFloat(itemForm.price) * parseFloat(itemForm.quantity || 1)).toFixed(2)} MAD</span>
                            </div>
                            <div className="preview-row">
                                <span>Coût:</span>
                                <span>- {(parseFloat(currentProduct.purchase_price) * parseFloat(itemForm.quantity || 1)).toFixed(2)} MAD</span>
                            </div>
                            <div className="preview-row preview-row--profit">
                                <span>Profit:</span>
                                <span style={{
                                    color: getProfitColor(
                                        (parseFloat(itemForm.price) - parseFloat(currentProduct.purchase_price)) * parseFloat(itemForm.quantity || 1)
                                    )
                                }}>
                                    {((parseFloat(itemForm.price) - parseFloat(currentProduct.purchase_price)) * parseFloat(itemForm.quantity || 1) >= 0 ? '+' : '')}
                                    {((parseFloat(itemForm.price) - parseFloat(currentProduct.purchase_price)) * parseFloat(itemForm.quantity || 1)).toFixed(2)} MAD
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="form-total">
                        <span>Sous-total:</span>
                        <span className="subtotal-amount">
                            {(parseFloat(itemForm.price || 0) * parseFloat(itemForm.quantity || 1)).toFixed(2)} MAD
                        </span>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-outline" onClick={() => setIsProductModalOpen(false)}>
                            Annuler
                        </button>
                        <button type="submit" className="btn btn-primary">
                            <Plus size={16} /> Ajouter au Bon
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Trash2, Package, Tag, DollarSign, Grid, Pencil, Edit2, AlertTriangle, Warehouse, TrendingDown } from 'lucide-react';
import Modal from '../components/Modal';
import ImportButton from '../components/ImportButton';
import ExportButton from '../components/ExportButton';
import { useProducts } from '../hooks/useProducts';
import { useCollections } from '../hooks/useCollections';
import { transformProductData } from '../utils/importExcel';
import { fmt, fmtFull } from '../utils/format';
import './Products.css';

export default function Products() {
    const { products, loading, addProduct, deleteProduct, updateProduct, importProducts } = useProducts();
    const { collections } = useCollections();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [search, setSearch] = useState('');
    const [filterStock, setFilterStock] = useState('all'); // all | low | out
    const [visibleCount, setVisibleCount] = useState(50);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        description: '',
        purchase_price: '',
        stock_quantity: '',
        reorder_level: '5'
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) return;

        try {
            const productData = {
                ...formData,
                price: 0,
                purchase_price: parseFloat(formData.purchase_price) || 0,
                stock_quantity: parseInt(formData.stock_quantity) || 0,
                reorder_level: parseInt(formData.reorder_level) || 5,
            };

            if (editingProduct) {
                await updateProduct(editingProduct.id, productData);
            } else {
                const nextNumber = products.length + 1;
                const code_barre = `PRD-${String(nextNumber).padStart(4, '0')}`;
                await addProduct({
                    code_barre,
                    ...productData,
                    created_at: new Date().toISOString()
                });
            }
            setFormData({ name: '', category: '', description: '', purchase_price: '', stock_quantity: '', reorder_level: '5' });
            setEditingProduct(null);
            setIsModalOpen(false);
        } catch (error) {
            alert(`Erreur ${editingProduct ? 'modification' : 'ajout'}: ` + error.message);
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            category: product.category || '',
            description: product.description || '',
            purchase_price: product.purchase_price || '',
            stock_quantity: product.stock_quantity || '',
            reorder_level: product.reorder_level || '5'
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        setFormData({ name: '', category: '', description: '', purchase_price: '', stock_quantity: '', reorder_level: '5' });
    };

    const handleDelete = async (id) => {
        if (confirm('Supprimer ce produit ?')) {
            try {
                await deleteProduct(id);
            } catch (error) {
                alert('Erreur suppression: ' + error.message);
            }
        }
    };

    const handleDeleteAll = async () => {
        if (products.length === 0) { alert('Aucun produit!'); return; }
        if (confirm(`ATTENTION: Supprimer les ${products.length} produits? Action irréversible!`)) {
            try {
                for (const product of products) await deleteProduct(product.id);
                alert('Tous les produits supprimés!');
            } catch (error) {
                alert('Erreur: ' + error.message);
            }
        }
    };

    const handleImport = async (excelData) => {
        try {
            const importedProducts = excelData.map(row => transformProductData(row));
            const validProducts = importedProducts.filter(p => p.name && p.name.trim() !== '');
            const productsWithCodes = validProducts.map((product, index) => {
                if (!product.code_barre || product.code_barre.trim() === '') {
                    const nextNumber = products.length + index + 1;
                    product.code_barre = `PRD-${String(nextNumber).padStart(4, '0')}`;
                }
                return {
                    ...product,
                    purchase_price: product.purchase_price || 0,
                    stock_quantity: product.stock_quantity || 0,
                    reorder_level: product.reorder_level || 5
                };
            });
            await importProducts(productsWithCodes);
            alert(`Succès: ${productsWithCodes.length} produits importés!`);
        } catch (error) {
            alert('Erreur import: ' + error.message);
        }
    };

    // Stats Memoized
    const { categories, outOfStock, lowStock, totalStockValue } = useMemo(() => {
        if (!products) return { categories: [], outOfStock: [], lowStock: [], totalStockValue: 0 };
        const cats = new Set();
        let out = [];
        let low = [];
        let totalVal = 0;

        products.forEach(p => {
            if (p.category) cats.add(p.category);
            const qty = p.stock_quantity || 0;
            const level = p.reorder_level || 5;
            if (qty === 0) out.push(p);
            else if (qty <= level) low.push(p);
            totalVal += (p.purchase_price || 0) * qty;
        });

        return {
            categories: [...cats],
            outOfStock: out,
            lowStock: low,
            totalStockValue: totalVal
        };
    }, [products]);

    // Helper: get stock status
    const getStockStatus = (product) => {
        const qty = product.stock_quantity || 0;
        const level = product.reorder_level || 5;
        if (qty === 0) return 'out';
        if (qty <= level) return 'low';
        return 'ok';
    };

    // Filter products Memoized
    const filteredProducts = useMemo(() => {
        const searchLower = search.toLowerCase();
        return products.filter(p => {
            const matchesSearch = p.name?.toLowerCase().includes(searchLower) || p.code_barre?.toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;

            const qty = p.stock_quantity || 0;
            const level = p.reorder_level || 5;

            if (filterStock === 'out') return qty === 0;
            if (filterStock === 'low') return qty > 0 && qty <= level;
            return true;
        });
    }, [products, search, filterStock]);

    // Reset pagination when search or filter changes
    useEffect(() => {
        setVisibleCount(50);
    }, [search, filterStock]);

    return (
        <div className="products-page fade-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Package size={32} />
                        Inventaire Produits
                    </h1>
                    <p className="page-subtitle">Gérez votre stock et prix d'achat</p>
                </div>

                <div className="header-actions">
                    <div className="search-wrapper">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Chercher produit..."
                            className="input search-input"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <ImportButton type="product" onImport={handleImport} />
                    <ExportButton data={products} type="product" />
                    {products.length > 0 && (
                        <button className="btn btn-danger" onClick={handleDeleteAll} title="Supprimer tout">
                            <Trash2 size={18} /> Tout Supprimer
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} /> Ajouter Produit
                    </button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="stats-bar">
                <div className="stat-item">
                    <Grid size={20} />
                    <span className="stat-label">Total Produits</span>
                    <span className="stat-value">{products.length}</span>
                </div>
                <div className="stat-item">
                    <Tag size={20} />
                    <span className="stat-label">Collections</span>
                    <span className="stat-value">{categories.length}</span>
                </div>
                <div className="stat-item stat-item--warning" onClick={() => setFilterStock(filterStock === 'low' ? 'all' : 'low')} style={{ cursor: 'pointer' }}>
                    <AlertTriangle size={20} />
                    <span className="stat-label">Stock Bas</span>
                    <span className="stat-value">{lowStock.length}</span>
                </div>
                <div className="stat-item stat-item--danger" onClick={() => setFilterStock(filterStock === 'out' ? 'all' : 'out')} style={{ cursor: 'pointer' }}>
                    <TrendingDown size={20} />
                    <span className="stat-label">Rupture</span>
                    <span className="stat-value">{outOfStock.length}</span>
                </div>
                <div className="stat-item stat-item--success">
                    <Warehouse size={20} />
                    <span className="stat-label">Valeur Stock</span>
                    <span className="stat-value" title={fmtFull(totalStockValue) + ' MAD'}>{fmt(totalStockValue)} MAD</span>
                </div>
                {filterStock !== 'all' && (
                    <button className="btn btn-outline btn-sm" onClick={() => setFilterStock('all')}>
                        Tout afficher
                    </button>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="empty-state">
                    <div className="loading-spinner"></div>
                    <p>Chargement...</p>
                </div>
            ) : products.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon"><Package size={64} /></div>
                    <h3>Aucun produit</h3>
                    <p>Ajoutez votre premier produit</p>
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} /> Premier Produit
                    </button>
                </div>
            ) : (
                <div className="products-grid">
                    {filteredProducts.slice(0, visibleCount).map((product, index) => {
                        const stockStatus = getStockStatus(product);
                        const qty = product.stock_quantity || 0;
                        return (
                            <div
                                key={product.id}
                                className={`product-card product-card--${stockStatus}`}
                            >
                                {/* Stock Badge */}
                                <div className={`stock-badge stock-badge--${stockStatus}`}>
                                    {stockStatus === 'out' && <><AlertTriangle size={12} /> Rupture</>}
                                    {stockStatus === 'low' && <><AlertTriangle size={12} /> Stock bas: {qty}</>}
                                    {stockStatus === 'ok' && <><Package size={12} /> Stock: {qty}</>}
                                </div>

                                <div className="product-image">
                                    <Package size={48} />
                                </div>

                                {product.code_barre && (
                                    <span className="product-code badge badge-info">{product.code_barre}</span>
                                )}

                                <div className="product-details">
                                    <h3 className="product-name">{product.name}</h3>
                                    {product.category && (
                                        <span className="product-category">
                                            <Tag size={14} />{product.category}
                                        </span>
                                    )}
                                    {(product.purchase_price > 0) && (
                                        <div className="product-price-info">
                                            <span className="price-label">Prix achat:</span>
                                            <span className="price-value" title={fmtFull(product.purchase_price) + ' MAD'}>{fmt(product.purchase_price)} MAD</span>
                                        </div>
                                    )}
                                </div>

                                <div className="product-actions">
                                    <button onClick={() => handleEdit(product)} className="edit-product-btn">
                                        <Pencil size={16} /> Modifier
                                    </button>
                                    <button onClick={() => handleDelete(product.id)} className="delete-product-btn">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {filteredProducts.length === 0 && (
                        <div className="no-results-card">
                            <Search size={48} />
                            <h3>Aucun résultat</h3>
                            <p>{search ? `"${search}" introuvable` : 'Aucun produit dans ce filtre'}</p>
                        </div>
                    )}

                    {visibleCount < filteredProducts.length && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem 0' }}>
                            <button className="btn btn-outline" onClick={() => setVisibleCount(prev => prev + 50)}>
                                <Plus size={18} style={{ marginRight: '8px' }} />
                                Charger plus ({filteredProducts.length - visibleCount} produits restants)
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingProduct ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Pencil size={18} /> Modifier Produit
                    </span>
                ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={18} /> Nouveau Produit
                    </span>
                )}
            >
                <form onSubmit={handleSubmit} className="product-form">
                    <div className="form-group">
                        <label>Nom du Produit *</label>
                        <input
                            required type="text" className="input"
                            placeholder="ex: T-Shirt Blanc"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Collection</label>
                        <select
                            className="input"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option value="">Choisir une collection...</option>
                            {collections.map(collection => (
                                <option key={collection.id} value={collection.name}>{collection.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Section Stock */}
                    <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Package size={16} /> Stock & Prix
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Prix d'Achat (MAD)</label>
                            <input
                                type="number" step="0.01" min="0" className="input"
                                placeholder="0.00"
                                value={formData.purchase_price}
                                onChange={e => setFormData({ ...formData, purchase_price: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Quantité en Stock</label>
                            <input
                                type="number" min="0" className="input"
                                placeholder="0"
                                value={formData.stock_quantity}
                                onChange={e => setFormData({ ...formData, stock_quantity: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Seuil d'Alerte Stock Bas</label>
                        <input
                            type="number" min="0" className="input"
                            placeholder="5 (défaut)"
                            value={formData.reorder_level}
                            onChange={e => setFormData({ ...formData, reorder_level: e.target.value })}
                        />
                        <span className="form-hint">Alerte rouge si stock ≤ ce nombre</span>
                    </div>



                    <div className="form-actions">
                        <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Annuler</button>
                        <button type="submit" className="btn btn-primary">
                            {editingProduct ? <><Edit2 size={16} /> Enregistrer</> : <><Plus size={16} /> Ajouter</>}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

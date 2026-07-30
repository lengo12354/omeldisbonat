import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../hooks/useClients';
import { useProducts } from '../hooks/useProducts';
import { useOrders } from '../hooks/useOrders';
import { callGemini } from '../lib/gemini';
import { fmt } from '../utils/format';
import {
    Sparkles, Upload, ImagePlus, User, Package,
    Check, X, ChevronRight, ShoppingCart,
    AlertCircle, Loader2, RefreshCw, CheckCircle2, ChevronDown
} from 'lucide-react';
import './AIOrder.css';

/* ─────────────────────────────────────────────
   STEP CONSTANTS
───────────────────────────────────────────── */
const STEP = {
    IDLE: 'idle',           // waiting for image
    READING: 'reading',     // AI reading image
    CONFIRM_CLIENT: 'confirm_client',
    CONFIRM_ITEMS: 'confirm_items',
    PREVIEW: 'preview',
    SAVING: 'saving',
    DONE: 'done',
    ERROR: 'error'
};

/* ─────────────────────────────────────────────
   HELPER — fuzzy match client by name
───────────────────────────────────────────── */
function matchClient(name, clients) {
    if (!name) return [];
    const q = name.toLowerCase().trim();
    return clients
        .map(c => ({ ...c, score: similarity(q, c.name.toLowerCase()) }))
        .filter(c => c.score > 0.35)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
}

function similarity(a, b) {
    if (a === b) return 1;
    if (b.includes(a) || a.includes(b)) return 0.9;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    const editDist = levenshtein(longer, shorter);
    return (longer.length - editDist) / longer.length;
}

function levenshtein(a, b) {
    const dp = Array.from({ length: a.length + 1 }, (_, i) =>
        Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= a.length; i++)
        for (let j = 1; j <= b.length; j++)
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    return dp[a.length][b.length];
}

function matchProduct(name, products) {
    if (!name) return [];
    const q = name.toLowerCase().trim();
    return products
        .map(p => ({ ...p, score: similarity(q, (p.name || '').toLowerCase()) }))
        .filter(p => p.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function AIOrder() {
    const navigate = useNavigate();
    const { clients } = useClients();
    const { products, updateStock } = useProducts();
    const { addOrder } = useOrders();

    const fileRef = useRef(null);
    const dropRef = useRef(null);

    // Image state
    const [imagePreview, setImagePreview] = useState(null);
    const [imageBase64, setImageBase64] = useState(null);
    const [imageMime, setImageMime] = useState('image/jpeg');

    // Flow state
    const [step, setStep] = useState(STEP.IDLE);
    const [errorMsg, setErrorMsg] = useState('');

    // AI extracted data
    const [aiClientName, setAiClientName] = useState('');
    const [aiItems, setAiItems] = useState([]); // [{name, quantity, price?}]

    // Confirmation state
    const [confirmedClient, setConfirmedClient] = useState(null);
    const [clientCandidates, setClientCandidates] = useState([]);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [confirmedItems, setConfirmedItems] = useState([]);

    // Drag over
    const [isDragging, setIsDragging] = useState(false);

    /* ── Load image ── */
    function loadImage(file) {
        if (!file || !file.type.startsWith('image/')) return;
        setImageMime(file.type);
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            setImagePreview(dataUrl);
            // Extract base64 part only
            setImageBase64(dataUrl.split(',')[1]);
        };
        reader.readAsDataURL(file);
    }

    function handleFileChange(e) {
        loadImage(e.target.files[0]);
        setStep(STEP.IDLE);
    }

    function handleDrop(e) {
        e.preventDefault();
        setIsDragging(false);
        loadImage(e.dataTransfer.files[0]);
    }

    /* ── Start AI reading ── */
    async function startReading() {
        if (!imageBase64) return;
        setStep(STEP.READING);
        setErrorMsg('');
        setConfirmedClient(null);
        setConfirmedItems([]);
        setCurrentItemIndex(0);

        try {
            const clientNames = clients.map(c => c.name).join(', ');
            const productNames = products.map(p => p.name).join(', ');

            const prompt = `
Tu es un assistant de gestion de commandes pour un commerce marocain.
Analyse cette image (bon de commande, message WhatsApp, note manuscrite, etc.).

RÈGLES TRÈS IMPORTANTES POUR LA LECTURE DES NOMBRES:
1. POSITION (INVERSÉE) : Le nombre qui se trouve à GAUCHE (left) est la QUANTITÉ (quantity). Le nombre qui se trouve à DROITE (right) est le PRIX UNITAIRE (unit_price).
2. FORMAT DU PRIX (CENTIMES) : Les prix sont souvent écrits sans virgule, où les deux derniers chiffres représentent les centimes. 
   - Exemple : S'il est écrit "1900", cela signifie 19.00 DH (le prix est 19).
   - Exemple : S'il est écrit "350", cela signifie 3.50 DH (le prix est 3.5).
   - Convertis TOUJOURS ce format en dirhams normaux (divise par 100 si le nombre n'a pas de virgule).

Liste de clients existants: ${clientNames || 'aucun'}
Liste de produits existants: ${productNames || 'aucun'}

Extrais les informations suivantes et réponds UNIQUEMENT en JSON valide, sans markdown, sans explication:
{
  "client_name": "nom du client tel qu'écrit dans l'image, ou null si absent",
  "items": [
    { "name": "nom du produit tel qu'écrit", "quantity": nombre, "unit_price": nombre_ou_null }
  ]
}

Si tu ne vois pas de bon de commande ou de liste de produits dans l'image, retourne:
{ "client_name": null, "items": [] }
`;

            const raw = await callGemini({ prompt, imageBase64, imageMimeType: imageMime });

            // Parse JSON — strip any markdown if model adds it
            const jsonStr = raw.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(jsonStr);

            setAiClientName(parsed.client_name || '');
            setAiItems(parsed.items || []);

            // Move to client confirmation
            const matches = matchClient(parsed.client_name, clients);
            setClientCandidates(matches);
            setStep(STEP.CONFIRM_CLIENT);

        } catch (err) {
            setErrorMsg(err.message || 'Erreur lors de la lecture');
            setStep(STEP.ERROR);
        }
    }

    /* ── Client confirmed ── */
    function handleClientConfirm(client) {
        setConfirmedClient(client);
        setCurrentItemIndex(0);
        setConfirmedItems([]);
        setStep(STEP.CONFIRM_ITEMS);
    }

    /* ── Item confirmed ── */
    function handleItemConfirm(product, quantity, price) {
        const purchasePrice = parseFloat(product.purchase_price) || 0;
        const sellPrice = parseFloat(price) || parseFloat(product.price) || 0;
        const qty = parseFloat(quantity) || 1;

        const item = {
            productId: product.id,
            name: product.name,
            price: sellPrice,
            purchasePrice,
            quantity: qty,
            total: sellPrice * qty,
            cost: purchasePrice * qty,
            profit: (sellPrice - purchasePrice) * qty
        };

        const newConfirmed = [...confirmedItems, item];
        setConfirmedItems(newConfirmed);

        const nextIndex = currentItemIndex + 1;
        if (nextIndex >= aiItems.length) {
            // All items done → preview
            setStep(STEP.PREVIEW);
        } else {
            setCurrentItemIndex(nextIndex);
        }
    }

    /* ── Skip item ── */
    function handleItemSkip() {
        const nextIndex = currentItemIndex + 1;
        if (nextIndex >= aiItems.length) {
            setStep(STEP.PREVIEW);
        } else {
            setCurrentItemIndex(nextIndex);
        }
    }

    /* ── Confirm & Save ── */
    async function handleAccept() {
        if (!confirmedClient || confirmedItems.length === 0) return;
        setStep(STEP.SAVING);

        try {
            const totalAmount = confirmedItems.reduce((s, i) => s + i.total, 0);
            const costAmount = confirmedItems.reduce((s, i) => s + i.cost, 0);
            const profitAmount = confirmedItems.reduce((s, i) => s + i.profit, 0);

            const newOrder = {
                id: Date.now().toString(),
                client: confirmedClient,
                items: confirmedItems,
                totalAmount,
                costAmount,
                profitAmount,
                date: new Date().toISOString(),
                status: 'Completed'
            };

            await addOrder(newOrder);

            // Update stock
            for (const item of confirmedItems) {
                if (item.productId) {
                    await updateStock(item.productId, -item.quantity);
                }
            }

            setStep(STEP.DONE);
        } catch (err) {
            setErrorMsg(err.message);
            setStep(STEP.ERROR);
        }
    }

    /* ── Reset all ── */
    function handleReset() {
        setStep(STEP.IDLE);
        setImagePreview(null);
        setImageBase64(null);
        setAiClientName('');
        setAiItems([]);
        setConfirmedClient(null);
        setConfirmedItems([]);
        setCurrentItemIndex(0);
        setErrorMsg('');
        if (fileRef.current) fileRef.current.value = '';
    }

    /* ── Totals ── */
    const previewTotal = confirmedItems.reduce((s, i) => s + i.total, 0);
    const previewProfit = confirmedItems.reduce((s, i) => s + i.profit, 0);

    return (
        <div className="ai-order-page fade-in">
            {/* Header */}
            <div className="ai-page-header">
                <div className="ai-header-left">
                    <div className="ai-header-icon">
                        <Sparkles size={28} />
                    </div>
                    <div>
                        <h1 className="ai-page-title">Bon par IA</h1>
                        <p className="ai-page-subtitle">Donne une photo — l'IA crée le bon</p>
                    </div>
                </div>
                {step !== STEP.IDLE && step !== STEP.DONE && (
                    <button className="btn btn-outline ai-reset-btn" onClick={handleReset}>
                        <RefreshCw size={16} /> Recommencer
                    </button>
                )}
            </div>

            {/* Progress bar */}
            <div className="ai-progress">
                {[
                    { key: 'image', label: '📸 Image' },
                    { key: 'client', label: '👤 Client' },
                    { key: 'articles', label: '📦 Articles' },
                    { key: 'apercu', label: '👁️ Aperçu' },
                ].map((s, i) => {
                    const activeIndex =
                        step === STEP.IDLE || step === STEP.READING ? 0
                            : step === STEP.CONFIRM_CLIENT ? 1
                                : step === STEP.CONFIRM_ITEMS ? 2
                                    : 3;
                    return (
                        <div key={s.key} className={`ai-progress-step ${i <= activeIndex ? 'active' : ''} ${i < activeIndex ? 'done' : ''}`}>
                            <div className="ai-progress-dot">{i < activeIndex ? <Check size={12} /> : i + 1}</div>
                            <span>{s.label}</span>
                            {i < 3 && <ChevronRight size={14} className="ai-progress-arrow" />}
                        </div>
                    );
                })}
            </div>

            {/* ── STEP: IDLE — Upload zone ── */}
            {(step === STEP.IDLE || step === STEP.READING) && (
                <div className="ai-upload-section">
                    <div
                        ref={dropRef}
                        className={`ai-drop-zone ${isDragging ? 'dragging' : ''} ${imagePreview ? 'has-image' : ''}`}
                        onClick={() => !imagePreview && fileRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                    >
                        {imagePreview ? (
                            <div className="ai-image-preview-wrapper">
                                <img src={imagePreview} alt="Bon uploadé" className="ai-image-preview" />
                                <button
                                    className="ai-image-remove"
                                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                                    title="Supprimer"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="ai-drop-content">
                                <ImagePlus size={48} className="ai-drop-icon" />
                                <p className="ai-drop-title">Glisse la photo ici</p>
                                <p className="ai-drop-sub">ou clique pour choisir un fichier</p>
                                <p className="ai-drop-hint">📱 WhatsApp · 📝 Note · 🧾 Bon manuscrit</p>
                            </div>
                        )}
                    </div>

                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />

                    {imagePreview && (
                        <div className="ai-upload-actions">
                            <button className="btn btn-outline" onClick={() => fileRef.current?.click()}>
                                <Upload size={16} /> Changer la photo
                            </button>
                            <button
                                className="btn btn-primary ai-analyze-btn"
                                onClick={startReading}
                                disabled={step === STEP.READING}
                            >
                                {step === STEP.READING ? (
                                    <><Loader2 size={16} className="spin" /> Analyse en cours...</>
                                ) : (
                                    <><Sparkles size={16} /> Analyser avec l'IA</>
                                )}
                            </button>
                        </div>
                    )}

                    {step === STEP.READING && (
                        <div className="ai-reading-indicator">
                            <div className="ai-reading-pulse" />
                            <span>L'IA lit votre bon...</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── STEP: CONFIRM CLIENT ── */}
            {step === STEP.CONFIRM_CLIENT && (
                <ClientConfirmStep
                    aiName={aiClientName}
                    candidates={clientCandidates}
                    allClients={clients}
                    onConfirm={handleClientConfirm}
                />
            )}

            {/* ── STEP: CONFIRM ITEMS ── */}
            {step === STEP.CONFIRM_ITEMS && (
                <ItemConfirmStep
                    aiItem={aiItems[currentItemIndex]}
                    itemIndex={currentItemIndex}
                    totalItems={aiItems.length}
                    products={products}
                    onConfirm={handleItemConfirm}
                    onSkip={handleItemSkip}
                />
            )}

            {/* ── STEP: PREVIEW ── */}
            {step === STEP.PREVIEW && (
                <PreviewStep
                    client={confirmedClient}
                    items={confirmedItems}
                    total={previewTotal}
                    profit={previewProfit}
                    onAccept={handleAccept}
                    onReset={handleReset}
                />
            )}

            {/* ── STEP: SAVING ── */}
            {step === STEP.SAVING && (
                <div className="ai-center-state">
                    <Loader2 size={48} className="spin ai-saving-icon" />
                    <p>Enregistrement du bon...</p>
                </div>
            )}

            {/* ── STEP: DONE ── */}
            {step === STEP.DONE && (
                <div className="ai-center-state ai-done-state">
                    <div className="ai-done-circle">
                        <CheckCircle2 size={56} />
                    </div>
                    <h2>Bon enregistré !</h2>
                    <p>Le bon a été ajouté aux commandes avec succès.</p>
                    <div className="ai-done-actions">
                        <button className="btn btn-outline" onClick={handleReset}>
                            <ImagePlus size={16} /> Nouveau bon IA
                        </button>
                        <button className="btn btn-primary" onClick={() => navigate('/orders')}>
                            <ShoppingCart size={16} /> Voir les commandes
                        </button>
                    </div>
                </div>
            )}

            {/* ── STEP: ERROR ── */}
            {step === STEP.ERROR && (
                <div className="ai-center-state ai-error-state">
                    <AlertCircle size={48} />
                    <h3>Erreur</h3>
                    <p>{errorMsg}</p>
                    <button className="btn btn-primary" onClick={handleReset}>
                        <RefreshCw size={16} /> Réessayer
                    </button>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════
   SUB-COMPONENT: Client Confirmation
═══════════════════════════════════════════ */
function ClientConfirmStep({ aiName, candidates, allClients, onConfirm }) {
    const [showAll, setShowAll] = useState(false);
    const [search, setSearch] = useState('');

    const displayed = showAll
        ? allClients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
        : candidates;

    return (
        <div className="ai-step-card fade-in">
            <div className="ai-step-header">
                <div className="ai-step-badge">1 / 3</div>
                <h2 className="ai-step-title">
                    <User size={22} /> Confirme le client
                </h2>
                <p className="ai-step-sub">
                    L'IA a lu : <strong className="ai-read-value">"{aiName || 'aucun nom'}"</strong>
                </p>
            </div>

            <div className="ai-candidates">
                {displayed.length === 0 ? (
                    <p className="ai-no-match">Aucun client trouvé. Cherche manuellement ↓</p>
                ) : (
                    displayed.map(c => (
                        <button key={c.id} className="ai-candidate-btn" onClick={() => onConfirm(c)}>
                            <div className="ai-candidate-avatar"><User size={18} /></div>
                            <div className="ai-candidate-info">
                                <span className="ai-candidate-name">{c.name}</span>
                                <span className="ai-candidate-phone">{c.phone}</span>
                            </div>
                            <Check size={16} className="ai-candidate-check" />
                        </button>
                    ))
                )}
            </div>

            <div className="ai-step-toggle">
                {!showAll ? (
                    <button className="ai-toggle-btn" onClick={() => setShowAll(true)}>
                        <ChevronDown size={16} /> Chercher un autre client
                    </button>
                ) : (
                    <div className="ai-search-all">
                        <input
                            className="input"
                            placeholder="Chercher un client..."
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════
   SUB-COMPONENT: Item Confirmation
═══════════════════════════════════════════ */
function ItemConfirmStep({ aiItem, itemIndex, totalItems, products, onConfirm, onSkip }) {
    const candidates = matchProduct(aiItem?.name || '', products);
    const [showAll, setShowAll] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(candidates[0] || null);
    const [quantity, setQuantity] = useState(aiItem?.quantity || 1);
    const [price, setPrice] = useState('');

    // Reset when item changes
    useEffect(() => {
        const cands = matchProduct(aiItem?.name || '', products);
        setSelectedProduct(cands[0] || null);
        setQuantity(aiItem?.quantity || 1);
        setPrice(aiItem?.unit_price ? String(aiItem.unit_price) : (cands[0]?.price ? String(cands[0].price) : ''));
        setShowAll(false);
        setSearch('');
    }, [aiItem, itemIndex]);

    useEffect(() => {
        if (selectedProduct) {
            setPrice(prev => prev || String(selectedProduct.price || ''));
        }
    }, [selectedProduct]);

    const displayed = showAll
        ? products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
        : candidates;

    function handleSelect(p) {
        setSelectedProduct(p);
        setPrice(String(aiItem?.unit_price || p.price || ''));
        setShowAll(false);
    }

    function handleConfirm() {
        if (!selectedProduct || !price) return;
        onConfirm(selectedProduct, quantity, price);
    }

    return (
        <div className="ai-step-card fade-in">
            <div className="ai-step-header">
                <div className="ai-step-badge">{itemIndex + 1} / {totalItems} articles</div>
                <h2 className="ai-step-title">
                    <Package size={22} /> Confirme l'article
                </h2>
                <p className="ai-step-sub">
                    L'IA a lu : <strong className="ai-read-value">"{aiItem?.name}"</strong>
                    {aiItem?.quantity && <> · Qté: <strong>{aiItem.quantity}</strong></>}
                </p>
            </div>

            {/* Product candidates */}
            <div className="ai-candidates">
                {displayed.length === 0 ? (
                    <p className="ai-no-match">Aucun produit trouvé.</p>
                ) : (
                    displayed.map(p => (
                        <button
                            key={p.id}
                            className={`ai-candidate-btn ${selectedProduct?.id === p.id ? 'selected' : ''}`}
                            onClick={() => handleSelect(p)}
                        >
                            <div className="ai-candidate-avatar product"><Package size={18} /></div>
                            <div className="ai-candidate-info">
                                <span className="ai-candidate-name">{p.name}</span>
                                <span className="ai-candidate-phone">{p.price} MAD · Stock: {p.stock_quantity ?? '—'}</span>
                            </div>
                            {selectedProduct?.id === p.id && <Check size={16} className="ai-candidate-check" />}
                        </button>
                    ))
                )}
            </div>

            {!showAll ? (
                <button className="ai-toggle-btn" onClick={() => setShowAll(true)}>
                    <ChevronDown size={16} /> Chercher un autre produit
                </button>
            ) : (
                <div className="ai-search-all">
                    <input
                        className="input"
                        placeholder="Chercher un produit..."
                        autoFocus
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            )}

            {/* Quantity & Price inputs */}
            {selectedProduct && (
                <div className="ai-item-inputs">
                    <div className="ai-input-group">
                        <label>Quantité</label>
                        <input
                            type="number"
                            className="input"
                            min="0.5"
                            step="0.5"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                        />
                    </div>
                    <div className="ai-input-group">
                        <label>Prix vente (MAD)</label>
                        <input
                            type="number"
                            className="input"
                            min="0"
                            step="0.01"
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            placeholder={selectedProduct.price}
                        />
                    </div>
                    {price && quantity && (
                        <div className="ai-item-preview-total">
                            Sous-total : <strong>{fmt(parseFloat(price) * parseFloat(quantity))} MAD</strong>
                        </div>
                    )}
                </div>
            )}

            <div className="ai-step-actions">
                <button className="btn btn-outline" onClick={onSkip}>
                    <X size={16} /> Ignorer cet article
                </button>
                <button
                    className="btn btn-primary"
                    onClick={handleConfirm}
                    disabled={!selectedProduct || !price}
                >
                    <Check size={16} /> Confirmer
                </button>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════
   SUB-COMPONENT: Preview / Aperçu
═══════════════════════════════════════════ */
function PreviewStep({ client, items, total, profit, onAccept, onReset }) {
    return (
        <div className="ai-step-card ai-preview-card fade-in">
            <div className="ai-step-header">
                <div className="ai-step-badge final">Aperçu final</div>
                <h2 className="ai-step-title"><ShoppingCart size={22} /> Bon de commande</h2>
            </div>

            {/* Client */}
            <div className="ai-preview-client">
                <User size={16} />
                <div>
                    <div className="ai-preview-client-name">{client.name}</div>
                    <div className="ai-preview-client-phone">{client.phone}</div>
                </div>
            </div>

            {/* Items table */}
            <div className="ai-preview-table">
                <div className="ai-preview-table-head">
                    <span>Produit</span>
                    <span>Qté × Prix</span>
                    <span>Total</span>
                </div>
                {items.map((item, i) => (
                    <div key={i} className="ai-preview-table-row">
                        <span>{item.name}</span>
                        <span>{item.quantity} × {item.price} MAD</span>
                        <span className="ai-preview-subtotal">{fmt(item.total)} MAD</span>
                    </div>
                ))}
            </div>

            {/* Totals */}
            <div className="ai-preview-totals">
                <div className="ai-preview-total-row">
                    <span>Total Vente</span>
                    <span className="ai-preview-total-val">{fmt(total)} MAD</span>
                </div>
                <div className="ai-preview-total-row profit">
                    <span>Profit Net</span>
                    <span style={{ color: profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                        {profit >= 0 ? '+' : ''}{fmt(profit)} MAD
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="ai-preview-actions">
                <button className="btn btn-outline" onClick={onReset}>
                    <X size={16} /> Annuler
                </button>
                <button className="btn btn-primary ai-accept-btn" onClick={onAccept}>
                    <CheckCircle2 size={18} /> Accepté — Enregistrer
                </button>
            </div>
        </div>
    );
}

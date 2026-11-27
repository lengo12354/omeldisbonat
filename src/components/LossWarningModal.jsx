import { AlertTriangle, TrendingDown } from 'lucide-react';
import Modal from './Modal';
import { fmtFull } from '../utils/format';
import './LossWarningModal.css';

export default function LossWarningModal({ items, onClose, onUseCost }) {
    return <Modal isOpen={items.length > 0} onClose={onClose} title="Vente à perte" size="loss-warning">
        <div className="loss-warning">
            <div className="loss-warning-heading"><AlertTriangle size={23} strokeWidth={2} aria-hidden="true" /><h4>Vente à perte</h4></div>
            <p className="loss-warning-explanation">Le prix de vente est inférieur au prix d’achat.</p>
            <ul>{items.map((item, index) => <li key={`${item.name}-${index}`}>
                <strong className="loss-warning-product">{item.name}</strong>
                <div className="loss-warning-prices"><span><small>Prix de vente</small><b>{fmtFull(item.salePrice)} <small>MAD</small></b></span><span><small>Prix d’achat</small><b>{fmtFull(item.purchasePrice)} <small>MAD</small></b></span></div>
                <div className="loss-warning-gap"><span>Perte par unité</span><strong><TrendingDown size={23} strokeWidth={2.4} aria-hidden="true" />{fmtFull(item.purchasePrice - item.salePrice)} MAD</strong></div>
            </li>)}</ul>
            <div className="loss-warning-actions">
                {onUseCost && <button type="button" className="btn btn-outline" onClick={onUseCost}>Ajouter au prix d’achat</button>}
                <button type="button" className="btn btn-primary" onClick={onClose}>Corriger le prix</button>
            </div>
        </div>
    </Modal>;
}

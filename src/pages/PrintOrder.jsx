import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { useOrders } from '../hooks/useOrders';
import './PrintOrder.css';

export default function PrintOrder() {
    const { orderId } = useParams();
    const { orders, loading } = useOrders();
    const [order, setOrder] = useState(null);

    useEffect(() => {
        if (!loading && orders.length > 0) {
            const foundOrder = orders.find(o => o.id === orderId);
            setOrder(foundOrder);
        } else if (!loading && orders.length === 0 && orderId) {
            // If orders are loaded but empty, maybe we should try to fetch just this order?
            // For now, the hook fetches all.
        }
    }, [orderId, orders, loading]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="print-page">
                <div className="print-container">
                    <p>Chargement de la commande...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="print-page">
                <div className="print-container">
                    <p>Order not found</p>
                </div>
            </div>
        );
    }

    const orderDate = new Date(order.date);
    const formattedDate = orderDate.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const formattedTime = orderDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="print-page">
            <div className="print-container">
                {/* Receipt/Invoice */}
                <div className="receipt">
                    {/* Tel Number */}
                    <div className="receipt-tel">
                        Tél : 0691437387
                    </div>

                    {/* Order Number */}
                    <div className="receipt-order-number">
                        COMMANDE N° : {order.id.slice(0, 8).toUpperCase()}
                    </div>

                    {/* Client Info */}
                    <div className="receipt-client">
                        CLIENT : {order.client.name}
                        {order.client.phone && ` - ${order.client.phone}`}
                    </div>

                    {/* Items Table */}
                    <table className="items-table">
                        <thead>
                            <tr>
                                <th>QTE</th>
                                <th>DESIGNATION</th>
                                <th>PRIX</th>
                                <th>TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((item, index) => (
                                <tr key={index}>
                                    <td className="text-center">{item.quantity.toFixed(2)}</td>
                                    <td>{item.name}</td>
                                    <td className="text-right">{item.price.toFixed(2)}</td>
                                    <td className="text-right">{item.total.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Net to Pay */}
                    <div className="receipt-net">
                        NET A PAYER : {order.totalAmount.toFixed(2)}
                    </div>

                    {/* Article Count */}
                    <div className="receipt-article-count">
                        NOMBRE D'ARTICLE : {order.items.length}
                    </div>

                    {/* Date Time */}
                    <div className="receipt-datetime">
                        {formattedDate} - {formattedTime}
                    </div>

                    {/* Footer */}
                    <div className="receipt-footer">
                        Powered by Omeldis
                    </div>
                </div>

                {/* Print Button (hidden when printing) */}
                <div className="print-actions no-print">
                    <button onClick={handlePrint} className="btn-print">
                        <Printer size={20} />
                        Imprimer ticket
                    </button>
                </div>
            </div>
        </div>
    );
}

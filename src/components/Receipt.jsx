export default function Receipt({ order }) {
    if (!order) return null;

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace', width: '300px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', margin: '0 0 10px 0' }}>BON DE COMMANDE</h2>
            <div style={{ textAlign: 'center', marginBottom: '20px', fontSize: '12px' }}>
                {new Date(order.date).toLocaleString()}<br />
                Ref: {order.id.slice(-6)}
            </div>

            <div style={{ marginBottom: '15px', borderBottom: '1px dashed #000', paddingBottom: '10px' }}>
                <strong>Client:</strong> {order.client.name}<br />
                {order.client.phone && <span>Tel: {order.client.phone}</span>}
            </div>

            <table style={{ width: '100%', fontSize: '12px', marginBottom: '15px' }}>
                <thead>
                    <tr style={{ textAlign: 'left' }}>
                        <th>Qte</th>
                        <th>Designation</th>
                        <th style={{ textAlign: 'right' }}>Prix</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item, i) => (
                        <tr key={i}>
                            <td>{item.quantity}</td>
                            <td>{item.name}</td>
                            <td style={{ textAlign: 'right' }}>{item.total.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={{ textAlign: 'right', fontSize: '16px', fontWeight: 'bold', borderTop: '1px dashed #000', paddingTop: '10px' }}>
                TOTAL: {order.totalAmount.toFixed(2)} MAD
            </div>

            <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '10px' }}>
                Merci de votre visite!
            </div>
        </div>
    );
}

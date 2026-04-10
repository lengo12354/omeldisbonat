import { useState, useMemo } from 'react';
import { useOrders } from '../hooks/useOrders';
import { ClipboardList, Printer, RefreshCw, FileDown, Calendar } from 'lucide-react';

import './PickingList.css';

export default function PickingList() {
    const { orders, refresh, loading } = useOrders();
    // Initialize with today's date
    const todayStr = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);

    // -- Logic (similar to previous project) --

    // 1. Filter Orders
    const filteredOrders = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return orders.filter(order => {
            if (!order || !order.date) return false;

            const orderDateObj = new Date(order.date);
            const orderTime = orderDateObj.getTime();

            return orderTime >= start.getTime() && orderTime <= end.getTime();
        });
    }, [orders, startDate, endDate]);

    // 2. Aggregate Items
    const pickingList = useMemo(() => {
        const itemsMap = {};

        filteredOrders.forEach(order => {
            order.items.forEach(item => {
                // Use name as key
                const key = item.name;
                if (!itemsMap[key]) {
                    itemsMap[key] = {
                        productName: item.name,
                        totalQuantity: 0,
                        unit: 'Pcs', // Default unit as it's not in the data model explicitly
                        count: 0
                    };
                }
                itemsMap[key].totalQuantity += Number(item.quantity) || 0;
                itemsMap[key].count += 1;
            });
        });

        return Object.values(itemsMap).sort((a, b) => a.productName.localeCompare(b.productName));
    }, [filteredOrders]);

    // -- PDF Generation --
    const generatePDFContent = () => {
        const dateRangeText = `Du ${new Date(startDate).toLocaleDateString('fr-FR')} au ${new Date(endDate).toLocaleDateString('fr-FR')}`;

        const totalQty = pickingList.reduce((sum, item) => sum + item.totalQuantity, 0);

        return `
            <div style="width: 800px; padding: 40px; background: white; font-family: Arial, sans-serif; direction: rtl; color: black !important;">
                <!-- Header - No Logo -->
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1f2937; padding-bottom: 20px;">
                    <h1 style="font-size: 32px; color: #111827; margin: 0 0 10px 0;">ورقة التجميع</h1>
                    <p style="font-size: 18px; color: #6b7280; margin: 0;">Bon de Charge / Picking List</p>
                </div>

                <!-- Info Section -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; background: #f9fafb; padding: 20px; border-radius: 8px;">
                    <div>
                        <p style="font-size: 12px; color: #6b7280; margin: 0;">التاريخ:</p>
                        <p style="font-weight: bold; color: #111827; margin: 5px 0 0 0; font-size: 14px;">${new Date().toLocaleString('fr-FR')}</p>
                    </div>
                    <div>
                        <p style="font-size: 12px; color: #6b7280; margin: 0;">الفترة:</p>
                        <p style="font-weight: bold; color: #111827; margin: 5px 0 0 0; font-size: 14px;">${dateRangeText}</p>
                    </div>
                    <div>
                        <p style="font-size: 12px; color: #6b7280; margin: 0;">عدد الطلبات:</p>
                        <p style="font-weight: bold; color: #111827; margin: 5px 0 0 0; font-size: 14px;">${filteredOrders.length} طلب</p>
                    </div>
                </div>

                <!-- Table -->
                <table style="width: 100%; border-collapse: collapse; border: 2px solid #1f2937; margin-bottom: 30px;">
                    <thead>
                        <tr style="background-color: #1f2937; color: white;">
                            <th style="border: 1px solid #374151; padding: 12px; text-align: right; font-size: 14px; width: 50px;">#</th>
                            <th style="border: 1px solid #374151; padding: 12px; text-align: right; font-size: 14px;">اسم المنتج</th>
                            <th style="border: 1px solid #374151; padding: 12px; text-align: center; font-size: 14px; width: 100px;">الكمية</th>
                            <th style="border: 1px solid #374151; padding: 12px; text-align: center; font-size: 14px; width: 80px;">الوحدة</th>
                            <th style="border: 1px solid #374151; padding: 12px; text-align: right; font-size: 14px; width: 150px;">ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pickingList.map((item, index) => `
                            <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                                <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; color: #111827; font-size: 13px;">${index + 1}</td>
                                <td style="border: 1px solid #d1d5db; padding: 12px; color: #111827; font-size: 13px; font-weight: 500;">${item.productName}</td>
                                <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; color: #2563eb; font-size: 18px; font-weight: bold;">${item.totalQuantity}</td>
                                <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; color: #111827; font-size: 13px;">${item.unit}</td>
                                <td style="border: 1px solid #d1d5db; padding: 12px; color: #111827; font-size: 13px;"></td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #f3f4f6; font-weight: bold;">
                            <td colspan="2" style="border: 1px solid #d1d5db; padding: 12px; text-align: right; color: #111827; font-size: 14px;">عدد المواد (Nombre d'articles)</td>
                            <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; color: #2563eb; font-size: 18px; font-weight: bold;">${pickingList.length}</td>
                            <td colspan="2" style="border: 1px solid #d1d5db; padding: 12px; color: #111827; font-size: 14px;">مادة</td>
                        </tr>
                    </tfoot>
                </table>

                <!-- Footer -->
                <div style="text-align: center; margin-top: 40px; font-size: 11px; color: #6b7280; border-top: 1px solid #d1d5db; padding-top: 15px;">
                    <p style="margin: 0;">Généré par Omeldis Dashboard - ${new Date().toLocaleString('fr-FR')}</p>
                </div>
            </div>
        `;
    };

    const handleGeneratePDF = async (action = 'print') => {
        try {
            const { default: html2canvas } = await import('html2canvas');
            const { default: jsPDF } = await import('jspdf');

            const container = document.createElement('div');
            container.innerHTML = generatePDFContent();
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            document.body.appendChild(container);

            const canvas = await html2canvas(container.firstElementChild, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            document.body.removeChild(container);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 10;

            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

            if (action === 'print') {
                const pdfBlob = pdf.output('blob');
                const pdfUrl = URL.createObjectURL(pdfBlob);
                window.open(pdfUrl, '_blank');
            } else {
                pdf.save(`picking-list-${Date.now()}.pdf`);
            }

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Erreur lors de la génération du PDF');
        }
    };

    if (loading) {
        return <div className="loading-shimmer" style={{ width: '100%', height: '400px', borderRadius: '1rem' }}></div>;
    }

    return (
        <div className="picking-list-page fade-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <ClipboardList size={32} />
                        Picking List (ورقة التجميع)
                    </h1>
                    <p className="page-subtitle">Aggregate items from orders for fulfillment</p>
                </div>

                <div className="header-actions">
                    <button onClick={refresh} className="btn btn-outline" title="Actualiser">
                        <RefreshCw size={18} /> Refresh
                    </button>
                    <button onClick={() => handleGeneratePDF('download')} className="btn btn-outline" title="Télécharger PDF">
                        <FileDown size={18} /> PDF
                    </button>
                    <button onClick={() => handleGeneratePDF('print')} className="btn btn-primary" title="Imprimer">
                        <Printer size={18} /> Imprimer
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-card">
                <div className="filters-grid">
                    <div className="filter-group">
                        <label>Période (Du &rarr; Au)</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="date"
                                className="input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <span style={{ alignSelf: 'center', color: 'var(--text-muted)' }}>à</span>
                            <input
                                type="date"
                                className="input"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>


                    <div className="stats-summary">
                        <div className="stat-box">
                            <span className="stat-label">Commandes</span>
                            <span className="stat-value">{filteredOrders.length}</span>
                        </div>
                        <div className="stat-box">
                            <span className="stat-label">Articles</span>
                            <span className="stat-value">{pickingList.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Picking Table */}
            {pickingList.length === 0 ? (
                <div className="empty-state card">
                    <ClipboardList size={64} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                    <h3>Aucune commande trouvée</h3>
                    <p>Essayez de changer les filtres</p>
                </div>
            ) : (
                <div className="picking-table-container">
                    <table className="picking-table">
                        <thead>
                            <tr>
                                <th style={{ width: '60px', textAlign: 'center' }}>#</th>
                                <th>Produit</th>
                                <th style={{ textAlign: 'center' }}>Quantité</th>
                                <th style={{ textAlign: 'center' }}>Unité</th>
                                <th style={{ textAlign: 'center' }}>Commandes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pickingList.map((item, index) => (
                                <tr key={index}>
                                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{index + 1}</td>
                                    <td style={{ fontWeight: 500 }}>{item.productName}</td>
                                    <td className="qty-cell">{item.totalQuantity}</td>
                                    <td style={{ textAlign: 'center' }}>{item.unit}</td>
                                    <td style={{ textAlign: 'center' }}>{item.count}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot style={{ backgroundColor: 'var(--bg-secondary)', fontWeight: 'bold' }}>
                            <tr>
                                <td colSpan={2} style={{ textAlign: 'right', paddingRight: '2rem' }}>Nombre d'articles</td>
                                <td className="qty-cell">{pickingList.length}</td>
                                <td></td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}

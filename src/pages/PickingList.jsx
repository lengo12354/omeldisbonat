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
    const generatePDFPage = (itemsChunk, pageIndex, totalPages, isLastPage) => {
        const dateRangeText = `Du ${new Date(startDate).toLocaleDateString('fr-FR')} au ${new Date(endDate).toLocaleDateString('fr-FR')}`;

        return `
            <div style="width: 800px; height: 1120px; position: relative; padding: 40px; background: white; font-family: Arial, sans-serif; direction: rtl; color: black !important; box-sizing: border-box;">
                ${pageIndex === 0 ? `
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
                ` : ''}

                <!-- Table -->
                <table style="width: 100%; border-collapse: collapse; border: 2px solid #1f2937; margin-bottom: 40px;">
                    <thead>
                        <tr style="background-color: #1f2937; color: white;">
                            <th style="border: 1px solid #374151; padding: 12px; text-align: right; font-size: 14px;">اسم المنتج</th>
                            <th style="border: 1px solid #374151; padding: 12px; text-align: center; font-size: 14px; width: 100px;">الكمية</th>
                            <th style="border: 1px solid #374151; padding: 12px; text-align: center; font-size: 14px; width: 80px;">الوحدة</th>
                            <th style="border: 1px solid #374151; padding: 12px; text-align: right; font-size: 14px; width: 150px;">ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsChunk.map((item) => `
                            <tr style="background-color: ${item.originalIndex % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                                <td style="border: 1px solid #d1d5db; padding: 12px; color: #111827; font-size: 15px; font-weight: 700;">${item.productName}</td>
                                <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; color: #2563eb; font-size: 18px; font-weight: bold;">${item.totalQuantity}</td>
                                <td style="border: 1px solid #d1d5db; padding: 12px; text-align: center; color: #111827; font-size: 13px;">${item.unit}</td>
                                <td style="border: 1px solid #d1d5db; padding: 12px; color: #111827; font-size: 13px;"></td>
                            </tr>
                        `).join('')}
                    </tbody>
                    ${isLastPage ? `
                    <tfoot>
                        <tr style="background-color: #f3f4f6; font-weight: bold;">
                            <td style="border: 1px solid #d1d5db; border-top: 2px solid #1f2937; padding: 12px; text-align: right; color: #111827; font-size: 14px;">عدد المواد (Nombre d'articles)</td>
                            <td style="border: 1px solid #d1d5db; border-top: 2px solid #1f2937; padding: 12px; text-align: center; color: #2563eb; font-size: 18px; font-weight: bold;">${pickingList.length}</td>
                            <td colspan="2" style="border: 1px solid #d1d5db; border-top: 2px solid #1f2937; padding: 12px; color: #111827; font-size: 14px;">مادة</td>
                        </tr>
                    </tfoot>
                    ` : ''}
                </table>
            </div>
        `;
    };

    const handleGeneratePDF = async (action = 'print') => {
        try {
            const { default: html2canvas } = await import('html2canvas');
            const { default: jsPDF } = await import('jspdf');

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // Create chunks
            const chunks = [];
            const firstPageCount = 10;
            const otherPageCount = 15;

            const listWithIndices = pickingList.map((item, idx) => ({ ...item, originalIndex: idx }));

            if (listWithIndices.length === 0) {
                alert('Aucune donnée à imprimer');
                return;
            }

            if (listWithIndices.length <= firstPageCount) {
                chunks.push(listWithIndices);
            } else {
                chunks.push(listWithIndices.slice(0, firstPageCount));
                let i = firstPageCount;
                while (i < listWithIndices.length) {
                    chunks.push(listWithIndices.slice(i, i + otherPageCount));
                    i += otherPageCount;
                }
            }

            const totalPages = chunks.length;

            for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
                const chunk = chunks[pageIndex];
                const isLastPage = (pageIndex === totalPages - 1);

                const container = document.createElement('div');
                container.innerHTML = generatePDFPage(chunk, pageIndex, totalPages, isLastPage);
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

                if (pageIndex > 0) {
                    pdf.addPage();
                }

                // We will scale it to fit the page horizontally exactly.
                // Since canvas width is fixed at 1600 (800 * scale 2), the ratio is identical for all pages.
                const ratio = pdfWidth / canvas.width;
                const imgHeight = canvas.height * ratio;

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
            }

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
                                <th>Produit</th>
                                <th style={{ textAlign: 'center' }}>Quantité</th>
                                <th style={{ textAlign: 'center' }}>Unité</th>
                                <th style={{ textAlign: 'center' }}>Commandes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pickingList.map((item, index) => (
                                <tr key={index}>
                                    <td style={{ fontWeight: 500 }}>{item.productName}</td>
                                    <td className="qty-cell">{item.totalQuantity}</td>
                                    <td style={{ textAlign: 'center' }}>{item.unit}</td>
                                    <td style={{ textAlign: 'center' }}>{item.count}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot style={{ backgroundColor: 'var(--bg-secondary)', fontWeight: 'bold' }}>
                            <tr>
                                <td style={{ textAlign: 'right', paddingRight: '2rem' }}>Nombre d'articles</td>
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

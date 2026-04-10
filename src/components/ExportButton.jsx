import { Download } from 'lucide-react';
import { exportToExcel } from '../utils/importExcel';

export default function ExportButton({ data, type = 'client', className = '' }) {
    const handleExport = () => {
        const filename = type === 'client'
            ? `LISTE-DES-CLIENTS-${new Date().toISOString().split('T')[0]}.xlsx`
            : `liste-articles-${new Date().toISOString().split('T')[0]}.xlsx`;

        exportToExcel(data, filename, type);
    };

    return (
        <button
            onClick={handleExport}
            disabled={data.length === 0}
            className={`btn btn-outline ${className}`}
        >
            <Download size={18} />
            Export {type === 'client' ? 'Clients' : 'Products'}
        </button>
    );
}

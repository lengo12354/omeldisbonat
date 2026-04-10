import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { parseExcelFile } from '../utils/importExcel';

export default function ImportButton({ onImport, type = 'client', className = '' }) {
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsLoading(true);
        try {
            const data = await parseExcelFile(file);
            onImport(data);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Error importing file:', error);
            alert('Error importing file: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className={`btn btn-outline ${className}`}
            >
                <Upload size={18} />
                {isLoading ? 'Importing...' : `Import ${type === 'client' ? 'Clients' : 'Products'}`}
            </button>
        </>
    );
}

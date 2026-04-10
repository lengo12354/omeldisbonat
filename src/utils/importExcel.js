import * as XLSX from 'xlsx';

/**
 * Parse Excel file and return JSON data
 */
export async function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                resolve(jsonData);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Get value from row with flexible key matching
 */
function getFlexibleValue(row, possibleKeys) {
    for (const key of possibleKeys) {
        // Try exact match
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
            return row[key];
        }
        // Try case-insensitive match
        const rowKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
        if (rowKey && row[rowKey] !== undefined && row[rowKey] !== null && row[rowKey] !== '') {
            return row[rowKey];
        }
    }
    return '';
}

/**
 * Transform client data from Excel to app format
 */
export function transformClientData(excelRow) {
    return {
        reference: getFlexibleValue(excelRow, ['Reference', 'Référence', 'reference', 'référence', 'REF', 'ref']),
        name: getFlexibleValue(excelRow, ['Designation', 'Désignation', 'Nom', 'Name', 'nom', 'name', 'NOM', 'NAME', 'Client', 'client']),
        phone: getFlexibleValue(excelRow, ['Tel', 'Telephone', 'Téléphone', 'Phone', 'tel', 'telephone', 'phone', 'TELEPHONE', 'TEL']),
        email: getFlexibleValue(excelRow, ['Email', 'email', 'EMAIL', 'E-mail', 'e-mail']),
        address: getFlexibleValue(excelRow, ['Adresse', 'Address', 'adresse', 'address', 'ADRESSE', 'ADDRESS']),
        created_at: new Date().toISOString()
    };
}

/**
 * Transform product data from Excel to app format
 */
export function transformProductData(excelRow) {
    const priceValue = getFlexibleValue(excelRow, [
        'Prix', 'Price', 'prix', 'price', 'PRIX', 'PRICE',
        'Prix Unitaire', 'Unit Price', 'PU', 'pu',
        'Montant', 'Amount', 'montant', 'amount'
    ]);

    return {
        code_barre: getFlexibleValue(excelRow, [
            'Code barre', 'Code Barre', 'CODE BARRE',
            'Barcode', 'barcode', 'BARCODE',
            'Code', 'code', 'CODE'
        ]),
        name: getFlexibleValue(excelRow, [
            'Designation', 'Désignation', 'designation', 'DESIGNATION',
            'Nom', 'Name', 'nom', 'name', 'NOM', 'NAME',
            'Produit', 'Product', 'produit', 'product',
            'Article', 'article', 'ARTICLE'
        ]),
        price: parseFloat(priceValue) || 0,
        category: getFlexibleValue(excelRow, [
            'Categorie', 'Catégorie', 'Category', 'categorie', 'category',
            'CATEGORIE', 'CATEGORY',
            'Type', 'type', 'TYPE'
        ]),
        description: getFlexibleValue(excelRow, [
            'Description', 'description', 'DESCRIPTION',
            'Desc', 'desc', 'Details', 'details', 'Détails'
        ]),
        created_at: new Date().toISOString()
    };
}

/**
 * Export data to Excel file
 */
export function exportToExcel(data, filename, type = 'client') {
    let exportData;

    if (type === 'client') {
        // Map to Excel format for clients
        exportData = data.map(item => ({
            'Référence': item.reference || '',
            'Désignation': item.name || '',
            'Tel': item.phone || '',
            'Email': item.email || '',
            'Adresse': item.address || ''
        }));
    } else if (type === 'product') {
        // Map to Excel format for products
        exportData = data.map(item => ({
            'Code barre': item.code_barre || '',
            'Designation': item.name || '',
            'Categorie': item.category || '',
            'Prix': item.price || 0,
            'Description': item.description || ''
        }));
    }

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === 'client' ? 'Clients' : 'Products');

    // Save file
    XLSX.writeFile(wb, filename);
}

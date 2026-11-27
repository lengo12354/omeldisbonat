const amount = value => Number(value) || 0;

export function repriceItems(items, products = []) {
    const catalog = new Map(products.map(product => [String(product.id), product]));
    return items.map(item => {
        const currentProduct = item.productId ? catalog.get(String(item.productId)) : null;
        const storedCost = item.purchasePrice ?? (amount(item.quantity) > 0 ? amount(item.cost) / amount(item.quantity) : 0);
        const purchasePrice = currentProduct && amount(currentProduct.purchase_price) > 0 ? amount(currentProduct.purchase_price) : amount(storedCost);
        const quantity = amount(item.quantity);
        const salePrice = amount(item.price);
        return { ...item, purchasePrice, cost: purchasePrice * quantity, profit: (salePrice - purchasePrice) * quantity };
    });
}

export function belowCostItems(items) {
    return items.flatMap(item => {
        const purchasePrice = amount(item.purchasePrice);
        const salePrice = amount(item.price);
        if (purchasePrice <= 0 || salePrice + 0.001 >= purchasePrice) return [];
        return [{ name: item.name, salePrice, purchasePrice }];
    });
}

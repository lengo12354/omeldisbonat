import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useLocalStorage } from './useLocalStorage';

/**
 * Hook for managing products with Supabase or localStorage fallback
 * Supports: purchase_price, stock_quantity, reorder_level
 */
export function useProducts() {
    const [localProducts, setLocalProducts] = useLocalStorage('products', []);
    const [supabaseProducts, setSupabaseProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const useSupabase = isSupabaseConfigured();

    // Fetch from Supabase
    const fetchProducts = async () => {
        if (!useSupabase) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSupabaseProducts(data || []);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching products:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (useSupabase) {
            fetchProducts();
        }
    }, [useSupabase]);

    const products = useSupabase ? supabaseProducts : localProducts;

    const addProduct = async (product) => {
        if (useSupabase) {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .insert([product])
                    .select();

                if (error) throw error;
                setSupabaseProducts(prev => [data[0], ...prev]);
                return data[0];
            } catch (err) {
                setError(err.message);
                console.error('Error adding product:', err);
                throw err;
            }
        } else {
            const newProduct = { ...product, id: Date.now().toString() };
            setLocalProducts(prev => [newProduct, ...prev]);
            return newProduct;
        }
    };

    const updateProduct = async (id, updates) => {
        if (useSupabase) {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .update(updates)
                    .eq('id', id)
                    .select();

                if (error) throw error;
                setSupabaseProducts(prev => prev.map(p => p.id === id ? data[0] : p));
                return data[0];
            } catch (err) {
                setError(err.message);
                console.error('Error updating product:', err);
                throw err;
            }
        } else {
            setLocalProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
        }
    };

    /**
     * نقص أو زيد stock ديال منتج
     * delta: عدد سالب لتنقيص (مثلا: -2 عند البيع)، موجب لإضافة
     */
    const updateStock = async (productId, delta) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const newQty = Math.max(0, (product.stock_quantity || 0) + delta);

        if (useSupabase) {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .update({ stock_quantity: newQty })
                    .eq('id', productId)
                    .select();

                if (error) throw error;
                setSupabaseProducts(prev => prev.map(p => p.id === productId ? data[0] : p));
            } catch (err) {
                setError(err.message);
                console.error('Error updating stock:', err);
                throw err;
            }
        } else {
            setLocalProducts(prev =>
                prev.map(p => p.id === productId ? { ...p, stock_quantity: newQty } : p)
            );
        }
    };

    const deleteProduct = async (id) => {
        if (useSupabase) {
            try {
                const { error } = await supabase
                    .from('products')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                setSupabaseProducts(prev => prev.filter(p => p.id !== id));
            } catch (err) {
                setError(err.message);
                console.error('Error deleting product:', err);
                throw err;
            }
        } else {
            setLocalProducts(prev => prev.filter(p => p.id !== id));
        }
    };

    const importProducts = async (productsArray) => {
        if (useSupabase) {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .insert(productsArray)
                    .select();

                if (error) throw error;
                setSupabaseProducts(prev => [...data, ...prev]);
                return data;
            } catch (err) {
                setError(err.message);
                console.error('Error importing products:', err);
                throw err;
            }
        } else {
            const newProducts = productsArray.map(p => ({ ...p, id: Date.now().toString() + Math.random() }));
            setLocalProducts(prev => [...newProducts, ...prev]);
            return newProducts;
        }
    };

    return {
        products,
        loading,
        error,
        addProduct,
        updateProduct,
        updateStock,
        deleteProduct,
        importProducts,
        refresh: fetchProducts
    };
}

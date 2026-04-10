import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useLocalStorage } from './useLocalStorage';

/**
 * Hook for managing orders with Supabase or localStorage fallback
 * Supports: profit_amount, cost_amount
 * Note: stock update is handled in NewOrder.jsx after order creation
 */
export function useOrders() {
    const [localOrders, setLocalOrders] = useLocalStorage('orders', []);
    const [supabaseOrders, setSupabaseOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const useSupabase = isSupabaseConfigured();

    // Fetch from Supabase
    const fetchOrders = async () => {
        if (!useSupabase) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map DB format back to UI format
            const mappedData = data.map(o => ({
                id: o.id,
                client: o.client_data,
                items: o.items,
                totalAmount: o.total_amount,
                costAmount: o.cost_amount || 0,
                profitAmount: o.profit_amount || 0,
                date: o.created_at,
                status: o.status
            }));

            setSupabaseOrders(mappedData || []);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (useSupabase) {
            fetchOrders();
        }
    }, [useSupabase]);

    // Get orders (Supabase or localStorage)
    const orders = useSupabase ? supabaseOrders : localOrders;

    // Add order
    const addOrder = async (order) => {
        if (useSupabase) {
            try {
                // Map UI object to DB columns
                const dbOrder = {
                    client_id: order.client.id && order.client.id.length > 20 ? order.client.id : null,
                    client_data: order.client,
                    items: order.items,
                    total_amount: order.totalAmount,
                    cost_amount: order.costAmount || 0,
                    profit_amount: order.profitAmount || 0,
                    status: order.status,
                    created_at: order.date
                };

                const { data, error } = await supabase
                    .from('orders')
                    .insert([dbOrder])
                    .select();

                if (error) throw error;

                // Map back to UI format for the state
                const newOrder = {
                    id: data[0].id,
                    client: data[0].client_data,
                    items: data[0].items,
                    totalAmount: data[0].total_amount,
                    costAmount: data[0].cost_amount || 0,
                    profitAmount: data[0].profit_amount || 0,
                    date: data[0].created_at,
                    status: data[0].status
                };

                setSupabaseOrders(prev => [newOrder, ...prev]);
                return newOrder;
            } catch (err) {
                setError(err.message);
                console.error('Error adding order:', err);
                throw err;
            }
        } else {
            const newOrder = { ...order, id: Date.now().toString() };
            setLocalOrders(prev => [newOrder, ...prev]);
            return newOrder;
        }
    };

    // Delete order
    const deleteOrder = async (id) => {
        if (useSupabase) {
            try {
                const { error } = await supabase
                    .from('orders')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                setSupabaseOrders(prev => prev.filter(o => o.id !== id));
            } catch (err) {
                setError(err.message);
                console.error('Error deleting order:', err);
                throw err;
            }
        } else {
            setLocalOrders(prev => prev.filter(o => o.id !== id));
        }
    };

    return {
        orders,
        loading,
        error,
        addOrder,
        deleteOrder,
        refresh: fetchOrders
    };
}

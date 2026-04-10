import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useLocalStorage } from './useLocalStorage';

/**
 * Hook for managing clients with Supabase or localStorage fallback
 */
export function useClients() {
    const [localClients, setLocalClients] = useLocalStorage('clients', []);
    const [supabaseClients, setSupabaseClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const useSupabase = isSupabaseConfigured();

    // Fetch from Supabase
    const fetchClients = async () => {
        if (!useSupabase) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSupabaseClients(data || []);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching clients:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (useSupabase) {
            fetchClients();
        }
    }, [useSupabase]);

    // Get clients (Supabase or localStorage)
    const clients = useSupabase ? supabaseClients : localClients;

    // Add client
    const addClient = async (client) => {
        if (useSupabase) {
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .insert([client])
                    .select();

                if (error) throw error;
                setSupabaseClients(prev => [data[0], ...prev]);
                return data[0];
            } catch (err) {
                setError(err.message);
                console.error('Error adding client:', err);
                throw err;
            }
        } else {
            const newClient = { ...client, id: Date.now().toString() };
            setLocalClients(prev => [newClient, ...prev]);
            return newClient;
        }
    };

    // Update client
    const updateClient = async (id, updates) => {
        if (useSupabase) {
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .update(updates)
                    .eq('id', id)
                    .select();

                if (error) throw error;
                setSupabaseClients(prev => prev.map(c => c.id === id ? data[0] : c));
                return data[0];
            } catch (err) {
                setError(err.message);
                console.error('Error updating client:', err);
                throw err;
            }
        } else {
            setLocalClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
        }
    };

    // Delete client
    const deleteClient = async (id) => {
        if (useSupabase) {
            try {
                const { error } = await supabase
                    .from('clients')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                setSupabaseClients(prev => prev.filter(c => c.id !== id));
            } catch (err) {
                setError(err.message);
                console.error('Error deleting client:', err);
                throw err;
            }
        } else {
            setLocalClients(prev => prev.filter(c => c.id !== id));
        }
    };

    // Bulk import
    const importClients = async (clientsArray) => {
        if (useSupabase) {
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .insert(clientsArray)
                    .select();

                if (error) throw error;
                setSupabaseClients(prev => [...data, ...prev]);
                return data;
            } catch (err) {
                setError(err.message);
                console.error('Error importing clients:', err);
                throw err;
            }
        } else {
            const newClients = clientsArray.map(c => ({ ...c, id: Date.now().toString() + Math.random() }));
            setLocalClients(prev => [...newClients, ...prev]);
            return newClients;
        }
    };

    return {
        clients,
        loading,
        error,
        addClient,
        updateClient,
        deleteClient,
        importClients,
        refresh: fetchClients
    };
}

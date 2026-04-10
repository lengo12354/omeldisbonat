import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useLocalStorage } from './useLocalStorage';

/**
 * Hook for managing collections with Supabase or localStorage fallback
 */
export function useCollections() {
    const [localCollections, setLocalCollections] = useLocalStorage('collections', []);
    const [supabaseCollections, setSupabaseCollections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const useSupabase = isSupabaseConfigured();

    // Fetch from Supabase
    const fetchCollections = async () => {
        if (!useSupabase) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('collections')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setSupabaseCollections(data || []);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching collections:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (useSupabase) {
            fetchCollections();
        }
    }, [useSupabase]);

    // Get collections (Supabase or localStorage)
    const collections = useSupabase ? supabaseCollections : localCollections;

    // Add collection
    const addCollection = async (collection) => {
        if (useSupabase) {
            try {
                const { data, error } = await supabase
                    .from('collections')
                    .insert([collection])
                    .select();

                if (error) throw error;
                setSupabaseCollections(prev => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
                return data[0];
            } catch (err) {
                setError(err.message);
                console.error('Error adding collection:', err);
                throw err;
            }
        } else {
            const newCollection = { ...collection, id: Date.now().toString() };
            setLocalCollections(prev => [...prev, newCollection].sort((a, b) => a.name.localeCompare(b.name)));
            return newCollection;
        }
    };

    // Update collection
    const updateCollection = async (id, updates) => {
        if (useSupabase) {
            try {
                const { data, error } = await supabase
                    .from('collections')
                    .update(updates)
                    .eq('id', id)
                    .select();

                if (error) throw error;
                setSupabaseCollections(prev => prev.map(c => c.id === id ? data[0] : c).sort((a, b) => a.name.localeCompare(b.name)));
                return data[0];
            } catch (err) {
                setError(err.message);
                console.error('Error updating collection:', err);
                throw err;
            }
        } else {
            setLocalCollections(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c).sort((a, b) => a.name.localeCompare(b.name)));
        }
    };

    // Delete collection
    const deleteCollection = async (id) => {
        if (useSupabase) {
            try {
                const { error } = await supabase
                    .from('collections')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                setSupabaseCollections(prev => prev.filter(c => c.id !== id));
            } catch (err) {
                setError(err.message);
                console.error('Error deleting collection:', err);
                throw err;
            }
        } else {
            setLocalCollections(prev => prev.filter(c => c.id !== id));
        }
    };

    return {
        collections,
        loading,
        error,
        addCollection,
        updateCollection,
        deleteCollection,
        refresh: fetchCollections
    };
}

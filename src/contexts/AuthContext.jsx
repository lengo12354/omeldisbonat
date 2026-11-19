import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from './useAuth';

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(Boolean(supabase));
    const [error, setError] = useState(supabase ? '' : 'La connexion Supabase doit être configurée avant d’activer les comptes.');

    useEffect(() => {
        if (!supabase) return;

        let active = true;
        async function loadMember(nextSession) {
            if (!active) return;
            setLoading(true);
            setSession(nextSession);
            setMember(null);
            setError('');
            if (nextSession?.user) {
                const { data, error: memberError } = await supabase
                    .from('app_users')
                    .select('user_id, username, name, role')
                    .eq('user_id', nextSession.user.id)
                    .maybeSingle();
                if (!active) return;
                if (memberError) setError('Accès indisponible. Vérifiez la configuration des comptes.');
                else if (!data) setError('Ce compte n’a pas accès à Omeldis.');
                else setMember(data);
            }
            if (active) setLoading(false);
        }

        supabase.auth.getSession().then(({ data, error: sessionError }) => {
            if (!active) return;
            if (sessionError) {
                setError('Impossible de vérifier la session.');
                setLoading(false);
            } else loadMember(data.session);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
            if (event === 'INITIAL_SESSION') return;
            // Defer database access until the auth callback has released its lock.
            setTimeout(() => { if (active) loadMember(nextSession); }, 0);
        });
        return () => { active = false; subscription.unsubscribe(); };
    }, []);

    return <AuthContext.Provider value={{ session, user: session?.user ?? null, member, loading, error, signOut: () => supabase?.auth.signOut() }}>
        {children}
    </AuthContext.Provider>;
}

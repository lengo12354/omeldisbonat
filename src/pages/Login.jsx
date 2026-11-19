import { useState } from 'react';
import { LockKeyhole, UserRound, ArrowRight, Moon, Sun } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';
import logo from '../assets/logo-print.png';
import './Settings.css';

export default function Login() {
    const { user, error: accessError, signOut } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('omeldis-theme') || 'dark');

    function toggleTheme() {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('omeldis-theme', next);
        document.documentElement.dataset.theme = next;
    }

    async function submit(event) {
        event.preventDefault();
        setError('');
        setBusy(true);
        const { data, error: authError } = await supabase.functions.invoke('login-username', { body: { username: username.trim().toLowerCase(), password } });
        if (authError?.context?.status === 404) setError('Connexion par identifiant indisponible. Terminez la configuration Supabase.');
        else if (authError || !data?.session) setError('Nom d’utilisateur ou mot de passe incorrect.');
        else {
            const { error: sessionError } = await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
            if (sessionError) setError('Impossible d’ouvrir la session.');
        }
        setBusy(false);
    }

    return <main className="login-screen">
        <div className="login-card">
            <button className="login-theme" type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
            <img className="login-logo" src={logo} alt="Omeldis" />
            <div className="login-intro"><span>ESPACE DE GESTION</span><h1>Connexion</h1><p>Connectez-vous pour accéder à votre espace Omeldis.</p></div>
            {accessError && <p className="settings-alert" role="alert">{accessError}</p>}
            {user ? <button className="btn btn-outline login-switch" onClick={signOut}>Utiliser un autre compte</button> :
                <form className="login-form" onSubmit={submit}>
                    <label htmlFor="login-username">Nom d’utilisateur</label>
                    <div className="login-field"><UserRound size={17} /><input id="login-username" type="text" autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} placeholder="Votre identifiant" /></div>
                    <label htmlFor="login-password">Mot de passe</label>
                    <div className="login-field"><LockKeyhole size={17} /><input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Votre mot de passe" /></div>
                    {error && <p className="settings-alert" role="alert">{error}</p>}
                    <button className="btn btn-primary login-submit" disabled={busy || !supabase}>{busy ? 'Connexion…' : <>Se connecter <ArrowRight size={17} /></>}</button>
                </form>}
        </div>
    </main>;
}

import { useEffect, useState } from 'react';
import { Check, KeyRound, LogOut, Moon, Plus, ShieldCheck, Sun, UsersRound } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../lib/supabase';
import logo from '../assets/logo-print.png';
import './AdminDashboard.css';

export default function AdminDashboard() {
    const { member, signOut } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [resetUserId, setResetUserId] = useState(null);
    const [resetPassword, setResetPassword] = useState('');
    const [resetBusy, setResetBusy] = useState(false);
    const [resetMessage, setResetMessage] = useState('');
    const [theme, setTheme] = useState(() => localStorage.getItem('omeldis-theme') || 'dark');

    async function loadUsers() {
        const { data, error } = await supabase.functions.invoke('admin-users', { method: 'GET' });
        if (error || !Array.isArray(data?.users)) setListError('La liste des utilisateurs est indisponible. Vérifiez la fonction admin-users.');
        else { setUsers(data.users); setListError(''); }
        setLoading(false);
    }

    useEffect(() => {
        let active = true;
        supabase.functions.invoke('admin-users', { method: 'GET' }).then(({ data, error }) => {
            if (!active) return;
            if (error || !Array.isArray(data?.users)) setListError('La liste des utilisateurs est indisponible. Vérifiez la fonction admin-users.');
            else { setUsers(data.users); setListError(''); }
            setLoading(false);
        });
        return () => { active = false; };
    }, []);

    function toggleTheme() {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        localStorage.setItem('omeldis-theme', next);
        document.documentElement.dataset.theme = next;
    }

    async function createUser(event) {
        event.preventDefault();
        setMessage('');
        if (password.length < 12) { setMessage('Le mot de passe doit contenir au moins 12 caractères.'); return; }
        setBusy(true);
        const { data, error } = await supabase.functions.invoke('admin-users', {
            body: { username: username.trim().toLowerCase(), name: name.trim(), password },
        });
        if (error || data?.error) setMessage(data?.error || 'Impossible de créer le compte.');
        else {
            setMessage(`Compte ${username.trim().toLowerCase()} créé.`);
            setUsername('');
            setName('');
            setPassword('');
            await loadUsers();
        }
        setBusy(false);
    }

    async function changePassword(event) {
        event.preventDefault();
        setResetMessage('');
        if (resetPassword.length < 12) { setResetMessage('12 caractères minimum.'); return; }
        setResetBusy(true);
        const { data, error } = await supabase.functions.invoke('admin-users', {
            method: 'PATCH', body: { userId: resetUserId, password: resetPassword },
        });
        if (error || !data?.updated) setResetMessage(data?.error || 'Impossible de changer le mot de passe.');
        else { setResetMessage('Mot de passe changé.'); setResetPassword(''); }
        setResetBusy(false);
    }

    function toggleReset(userId) {
        setResetUserId(current => current === userId ? null : userId);
        setResetPassword('');
        setResetMessage('');
    }

    return <div className="admin-shell">
        <header className="admin-topbar"><img src={logo} alt="Omeldis" /><div><span className="admin-role"><ShieldCheck size={15} /> Administration</span><span className="admin-account">@{member.username}</span><button type="button" className="admin-icon-button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button><button type="button" className="admin-signout" onClick={signOut}><LogOut size={16} /> Se déconnecter</button></div></header>
        <main className="admin-main"><div className="admin-heading"><span>GESTION DES ACCÈS</span><h1>Utilisateurs</h1><p>Créez les comptes et retrouvez les personnes qui ont accès à Omeldis.</p></div>
            <div className="admin-grid"><section className="admin-panel"><div className="admin-panel-heading"><UsersRound size={19} /><div><h2>Comptes</h2><p>{loading ? 'Chargement…' : `${users.length} utilisateur${users.length > 1 ? 's' : ''}`}</p></div></div>
                    {listError ? <p className="admin-message admin-message--error" role="alert">{listError}</p> : <div className="admin-user-list">{users.map(account => <div className="admin-user-entry" key={account.user_id}>
                        <div className="admin-user-row"><span className="admin-user-mark"><UsersRound size={16} /></span><div><strong>{account.name}</strong><small>@{account.username}</small></div><span className={`admin-user-role ${account.role === 'admin' ? 'admin-user-role--admin' : ''}`}>{account.role === 'admin' ? 'Admin' : 'Utilisateur'}</span>{account.role === 'member' && <button type="button" className="admin-reset-toggle" onClick={() => toggleReset(account.user_id)} aria-label={`Changer le mot de passe de ${account.username}`} title="Changer le mot de passe"><KeyRound size={15} /></button>}</div>
                        {resetUserId === account.user_id && <form className="admin-reset-form" onSubmit={changePassword}><label htmlFor={`reset-${account.user_id}`}>Nouveau mot de passe pour @{account.username}</label><div><input id={`reset-${account.user_id}`} type="password" className="input" minLength={12} maxLength={128} required autoComplete="new-password" value={resetPassword} onChange={event => setResetPassword(event.target.value)} placeholder="12 caractères minimum" /><button type="submit" className="btn btn-primary" disabled={resetBusy}>{resetBusy ? 'Enregistrement…' : 'Enregistrer'}</button></div>{resetMessage && <p className={`admin-message ${resetMessage === 'Mot de passe changé.' ? 'admin-message--ok' : 'admin-message--error'}`} role="status">{resetMessage}</p>}</form>}
                    </div>)}</div>}
                </section>
                <section className="admin-panel"><div className="admin-panel-heading"><Plus size={19} /><div><h2>Nouvel utilisateur</h2><p>Chaque nouveau compte commence avec ses propres données.</p></div></div>
                    <form className="admin-form" onSubmit={createUser}><label htmlFor="admin-name">Nom</label><input id="admin-name" className="input" required value={name} onChange={event => setName(event.target.value)} placeholder="Nom de la personne" /><label htmlFor="admin-username">Nom d’utilisateur</label><input id="admin-username" className="input" required pattern="[A-Za-z0-9._-]{3,32}" title="3 à 32 caractères : lettres, chiffres, point, tiret ou tiret bas" value={username} onChange={event => setUsername(event.target.value)} placeholder="identifiant" autoComplete="off" /><label htmlFor="admin-password">Mot de passe</label><input id="admin-password" className="input" required type="password" minLength={12} value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" placeholder="12 caractères minimum" /><p>Communiquez l’identifiant et le mot de passe directement à cette personne.</p><button className="btn btn-primary" disabled={busy}><Plus size={16} />{busy ? 'Création…' : 'Créer le compte'}</button>{message && <div className={`admin-message ${message.startsWith('Compte ') ? 'admin-message--ok' : 'admin-message--error'}`} role="status">{message.startsWith('Compte ') && <Check size={15} />}{message}</div>}</form>
                </section></div>
        </main>
    </div>;
}

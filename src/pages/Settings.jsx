import { useEffect, useState } from 'react';
import { Check, Eye, EyeOff, KeyRound, LogOut, Moon, Plus, Settings2, Sun, UserRoundPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../lib/supabase';
import './Settings.css';

const THEME_KEY = 'omeldis-theme';

export default function Settings() {
    const { user, member, signOut } = useAuth();
    const navigate = useNavigate();
    const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');
    const [provider, setProvider] = useState('gemini');
    const [apiKey, setApiKey] = useState('');
    const [hasKey, setHasKey] = useState(false);
    const [reveal, setReveal] = useState(false);
    const [keyBusy, setKeyBusy] = useState(false);
    const [keyMessage, setKeyMessage] = useState('');
    const [newName, setNewName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [userBusy, setUserBusy] = useState(false);
    const [userMessage, setUserMessage] = useState('');

    useEffect(() => {
        let active = true;
        supabase.from('user_ai_settings').select('provider, api_key').eq('user_id', user.id).maybeSingle()
            .then(({ data, error }) => {
                if (!active) return;
                if (error) setKeyMessage('Impossible de charger la clé. Vérifiez la configuration.');
                else if (data) { setProvider(data.provider); setApiKey(data.api_key); setHasKey(true); }
            });
        return () => { active = false; };
    }, [user.id]);

    function changeTheme(nextTheme) {
        setTheme(nextTheme);
        localStorage.setItem(THEME_KEY, nextTheme);
        document.documentElement.dataset.theme = nextTheme;
    }

    async function saveKey(event) {
        event.preventDefault();
        setKeyMessage('');
        if (!apiKey.trim()) { setKeyMessage('Entrez une clé API.'); return; }
        setKeyBusy(true);
        const { error } = await supabase.from('user_ai_settings').upsert({ user_id: user.id, provider, api_key: apiKey.trim() }, { onConflict: 'user_id' });
        setKeyMessage(error ? 'La clé n’a pas pu être enregistrée.' : 'Clé API enregistrée pour votre compte.');
        if (!error) { setHasKey(true); setReveal(false); }
        setKeyBusy(false);
    }

    async function removeKey() {
        setKeyBusy(true);
        const { error } = await supabase.from('user_ai_settings').delete().eq('user_id', user.id);
        setKeyMessage(error ? 'La clé n’a pas pu être supprimée.' : 'Clé API supprimée.');
        if (!error) { setApiKey(''); setHasKey(false); setReveal(false); }
        setKeyBusy(false);
    }

    async function createUser(event) {
        event.preventDefault();
        setUserMessage('');
        if (newPassword.length < 12) { setUserMessage('Le mot de passe doit contenir au moins 12 caractères.'); return; }
        setUserBusy(true);
        const { data, error } = await supabase.functions.invoke('admin-users', { body: { name: newName.trim(), username: newUsername.trim().toLowerCase(), password: newPassword } });
        if (error || data?.error) setUserMessage(data?.error || 'Création impossible. Vérifiez que la fonction admin-users est déployée.');
        else { setUserMessage(`Compte créé pour ${newUsername.trim()}.`); setNewName(''); setNewUsername(''); setNewPassword(''); }
        setUserBusy(false);
    }

    async function logout() {
        await signOut();
        navigate('/login', { replace: true });
    }

    return <div className="settings-page fade-in">
        <header className="settings-heading"><Settings2 size={24} /><div><h1>Paramètres</h1><p>Personnalisez votre espace et gérez votre compte.</p></div></header>
        <div className="settings-grid">
            <section className="settings-card"><div className="settings-card-heading"><div className="settings-icon"><Sun size={18} /></div><div><h2>Apparence</h2><p>Choisissez le thème de votre espace.</p></div></div>
                <div className="theme-options"><button type="button" className={`theme-option ${theme === 'dark' ? 'selected' : ''}`} onClick={() => changeTheme('dark')} aria-pressed={theme === 'dark'}><Moon size={19} /><span>Sombre</span>{theme === 'dark' && <Check size={16} />}</button><button type="button" className={`theme-option ${theme === 'light' ? 'selected' : ''}`} onClick={() => changeTheme('light')} aria-pressed={theme === 'light'}><Sun size={19} /><span>Clair</span>{theme === 'light' && <Check size={16} />}</button></div>
            </section>
            <section className="settings-card"><div className="settings-card-heading"><div className="settings-icon"><KeyRound size={18} /></div><div><h2>Assistant IA</h2><p>Chaque utilisateur utilise sa propre clé API.</p></div></div>
                <form onSubmit={saveKey} className="settings-form"><label htmlFor="ai-provider">Fournisseur</label><select id="ai-provider" className="input" value={provider} onChange={event => setProvider(event.target.value)}><option value="gemini">Google Gemini</option><option value="groq">Groq</option></select>
                    <label htmlFor="ai-key">Clé API</label><div className="settings-key-field"><input id="ai-key" className="input" type={reveal ? 'text' : 'password'} autoComplete="off" spellCheck="false" value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder={hasKey ? 'Clé enregistrée' : 'Saisissez votre clé'} /><button type="button" aria-label={reveal ? 'Masquer la clé' : 'Afficher la clé'} onClick={() => setReveal(!reveal)}>{reveal ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
                    <p className="settings-help">La clé est liée à votre compte et n’est utilisée que pour vos demandes IA.</p><div className="settings-actions"><button className="btn btn-primary" disabled={keyBusy}>Enregistrer la clé</button>{hasKey && <button type="button" className="btn btn-outline" disabled={keyBusy} onClick={removeKey}>Supprimer</button>}</div>{keyMessage && <p className="settings-feedback" role="status">{keyMessage}</p>}</form>
            </section>
            {member?.role === 'admin' && <section className="settings-card settings-card--users"><div className="settings-card-heading"><div className="settings-icon"><UserRoundPlus size={18} /></div><div><h2>Créer un utilisateur</h2><p>Seul l’administrateur peut ajouter des comptes.</p></div></div>
                <form onSubmit={createUser} className="settings-form"><label htmlFor="new-user-name">Nom</label><input id="new-user-name" className="input" value={newName} onChange={event => setNewName(event.target.value)} required /><label htmlFor="new-user-username">Nom d’utilisateur</label><input id="new-user-username" className="input" type="text" autoComplete="off" pattern="[A-Za-z0-9._-]{3,32}" title="3 à 32 caractères : lettres, chiffres, point, tiret ou tiret bas" value={newUsername} onChange={event => setNewUsername(event.target.value)} required /><label htmlFor="new-user-password">Mot de passe provisoire</label><input id="new-user-password" className="input" type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={event => setNewPassword(event.target.value)} required /><p className="settings-help">Au moins 12 caractères. Communiquez-le directement au nouvel utilisateur.</p><button className="btn btn-primary" disabled={userBusy}><Plus size={16} />{userBusy ? 'Création…' : 'Créer le compte'}</button>{userMessage && <p className="settings-feedback" role="status">{userMessage}</p>}</form>
            </section>}
            <section className="settings-card settings-card--account"><div className="settings-card-heading"><div className="settings-icon"><LogOut size={18} /></div><div><h2>Compte</h2><p>{member?.name || member?.username}<br /><span>@{member?.username}</span></p></div></div><button className="btn btn-outline settings-signout" onClick={logout}><LogOut size={16} />Se déconnecter</button></section>
        </div>
    </div>;
}

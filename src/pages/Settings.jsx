import { useEffect, useState } from 'react';
import { Check, Eye, EyeOff, KeyRound, LogOut, Moon, Settings2, Sun, UserRound } from 'lucide-react';
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
    const [keyMessageType, setKeyMessageType] = useState('success');

    useEffect(() => {
        let active = true;
        supabase.from('user_ai_settings').select('provider, api_key').eq('user_id', user.id).maybeSingle()
            .then(({ data, error }) => {
                if (!active) return;
                if (error) {
                    setKeyMessageType('error');
                    setKeyMessage('Impossible de charger la clé. Vérifiez la configuration.');
                } else if (data) {
                    setProvider(data.provider);
                    setApiKey(data.api_key);
                    setHasKey(true);
                }
            });
        return () => { active = false; };
    }, [user.id]);

    function changeTheme(nextTheme) {
        setTheme(nextTheme);
        localStorage.setItem(THEME_KEY, nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
    }

    async function saveKey(event) {
        event.preventDefault();
        setKeyMessage('');
        if (!apiKey.trim()) {
            setKeyMessageType('error');
            setKeyMessage('Entrez une clé API.');
            return;
        }
        setKeyBusy(true);
        const { error } = await supabase.from('user_ai_settings')
            .upsert({ user_id: user.id, provider, api_key: apiKey.trim() }, { onConflict: 'user_id' });
        setKeyMessageType(error ? 'error' : 'success');
        setKeyMessage(error ? 'La clé n’a pas pu être enregistrée.' : 'Clé API enregistrée pour votre compte.');
        if (!error) { setHasKey(true); setReveal(false); }
        setKeyBusy(false);
    }

    async function removeKey() {
        setKeyBusy(true);
        const { error } = await supabase.from('user_ai_settings').delete().eq('user_id', user.id);
        setKeyMessageType(error ? 'error' : 'success');
        setKeyMessage(error ? 'La clé n’a pas pu être supprimée.' : 'Clé API supprimée.');
        if (!error) { setApiKey(''); setHasKey(false); setReveal(false); }
        setKeyBusy(false);
    }

    async function logout() {
        await signOut();
        navigate('/login', { replace: true });
    }

    return <div className="settings-page fade-in">
        <header className="settings-heading">
            <Settings2 size={27} aria-hidden="true" />
            <div><h1>Paramètres</h1><p>Gérez l’apparence, l’assistant IA et votre session.</p></div>
        </header>
        <div className="settings-layout">
            <aside className="settings-account">
                <div className="settings-account-top">
                    <span className="settings-account-avatar"><UserRound size={24} aria-hidden="true" /></span>
                    <span className="settings-account-label">Compte connecté</span>
                    <strong>{member?.name || member?.username}</strong>
                    <span className="settings-account-username">@{member?.username}</span>
                </div>
                <button type="button" className="settings-signout" onClick={logout}><LogOut size={17} /> Se déconnecter</button>
            </aside>
            <div className="settings-main">
                <section className="settings-card" aria-labelledby="settings-appearance-title">
                    <div className="settings-card-heading">
                        <span className="settings-section-icon"><Sun size={20} aria-hidden="true" /></span>
                        <div><h2 id="settings-appearance-title">Apparence</h2><p>Choisissez le thème qui vous convient.</p></div>
                    </div>
                    <div className="theme-options" role="group" aria-label="Thème de l’interface">
                        {[
                            { value: 'dark', label: 'Sombre', icon: <Moon size={17} aria-hidden="true" /> },
                            { value: 'light', label: 'Clair', icon: <Sun size={17} aria-hidden="true" /> },
                        ].map(({ value, label, icon }) => <button
                            type="button" key={value}
                            className={`theme-option theme-option--${value} ${theme === value ? 'selected' : ''}`}
                            onClick={() => changeTheme(value)} aria-pressed={theme === value}
                        >
                            <span className="theme-preview" aria-hidden="true"><span className="theme-preview-sidebar" /><span className="theme-preview-content"><i /><i /><b /></span></span>
                            <span className="theme-option-label">{icon}{label}{theme === value && <Check size={17} className="theme-check" aria-hidden="true" />}</span>
                        </button>)}
                    </div>
                </section>
                <section className="settings-card" aria-labelledby="settings-ai-title">
                    <div className="settings-card-heading">
                        <span className="settings-section-icon"><KeyRound size={20} aria-hidden="true" /></span>
                        <div><h2 id="settings-ai-title">Assistant IA</h2><p>Utilisez votre propre clé pour lire les bons avec l’IA.</p></div>
                        <span className={`settings-key-status ${hasKey ? 'settings-key-status--saved' : ''}`}>{hasKey ? 'Clé enregistrée' : 'Aucune clé'}</span>
                    </div>
                    <form onSubmit={saveKey} className="settings-form">
                        <label>Fournisseur</label>
                        <div className="settings-provider-options" role="group" aria-label="Fournisseur IA">
                            <button type="button" className={provider === 'gemini' ? 'selected' : ''} aria-pressed={provider === 'gemini'} onClick={() => setProvider('gemini')}>Google Gemini</button>
                            <button type="button" className={provider === 'groq' ? 'selected' : ''} aria-pressed={provider === 'groq'} onClick={() => setProvider('groq')}>Groq</button>
                        </div>
                        <label htmlFor="ai-key">Clé API</label>
                        <div className="settings-key-field">
                            <input id="ai-key" className="input" type={reveal ? 'text' : 'password'} autoComplete="off" spellCheck="false" value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder={hasKey ? 'Clé enregistrée' : 'Saisissez votre clé'} />
                            <button type="button" aria-label={reveal ? 'Masquer la clé' : 'Afficher la clé'} onClick={() => setReveal(!reveal)}>{reveal ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                        </div>
                        <p className="settings-help">Cette clé est liée uniquement à votre compte.</p>
                        <div className="settings-actions">
                            <button className="btn btn-primary" disabled={keyBusy}>{keyBusy ? 'Enregistrement…' : 'Enregistrer la clé'}</button>
                            {hasKey && <button type="button" className="btn btn-outline" disabled={keyBusy} onClick={removeKey}>Supprimer la clé</button>}
                        </div>
                        {keyMessage && <p className={`settings-feedback settings-feedback--${keyMessageType}`} role="status">{keyMessage}</p>}
                    </form>
                </section>
            </div>
        </div>
    </div>;
}

import { supabase } from './supabase';

async function getOwnAiSettings() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Connectez-vous avant d’utiliser l’assistant IA.');
    const { data, error } = await supabase.from('user_ai_settings')
        .select('provider, api_key').eq('user_id', user.id).maybeSingle();
    if (error) throw new Error('Impossible de charger votre clé API.');
    if (!data?.api_key) throw new Error('Ajoutez votre clé API dans Paramètres pour utiliser l’assistant IA.');
    return data;
}

async function callGroq(key, prompt, imageBase64, imageMimeType) {
    const content = [{ type: 'text', text: prompt }];
    if (imageBase64) content.push({ type: 'image_url', image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } });
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'qwen/qwen3.8-27b', messages: [{ role: 'user', content }], temperature: 0.1, max_completion_tokens: 2048 }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || `Erreur Groq (${response.status}).`);
    return data?.choices?.[0]?.message?.content;
}

async function callGoogle(key, prompt, imageBase64, imageMimeType) {
    const parts = [];
    if (imageBase64) parts.push({ inlineData: { mimeType: imageMimeType, data: imageBase64 } });
    parts.push({ text: prompt });
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message || `Erreur Gemini (${response.status}).`);
    return data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('');
}

export async function callGemini({ prompt, imageBase64 = null, imageMimeType = 'image/jpeg' }) {
    const { provider, api_key: key } = await getOwnAiSettings();
    const result = provider === 'groq'
        ? await callGroq(key, prompt, imageBase64, imageMimeType)
        : await callGoogle(key, prompt, imageBase64, imageMimeType);
    if (!result) throw new Error('L’assistant IA n’a pas renvoyé de réponse.');
    return result;
}

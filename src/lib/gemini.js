/**
 * AI API service supporting both Groq and Gemini (vision models).
 * Automatically detects key type and falls back to Gemini if Groq fails.
 */

// We include the user's Gemini key as a fallback because Groq currently has NO vision models.
const FALLBACK_GEMINI = 'AIzaSyB6yyX7WE5ISfHsFiXxtoVhzFRCdoM7Ojc';

const RAW_KEYS = [
    ...(import.meta.env.VITE_GEMINI_KEYS || '').split(','),
    ...(import.meta.env.VITE_GROQ_KEYS || '').split(','),
    FALLBACK_GEMINI
].map(k => k.trim()).filter(Boolean);

// Unique keys only
const UNIQUE_KEYS = [...new Set(RAW_KEYS)];

// Sort keys: Try Groq first, then Gemini
const KEYS = UNIQUE_KEYS.sort((a, b) => {
    if (a.startsWith('gsk_') && !b.startsWith('gsk_')) return -1;
    if (!a.startsWith('gsk_') && b.startsWith('gsk_')) return 1;
    return 0;
});

let currentKeyIndex = 0;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function callGroqVision(key, prompt, imageBase64, imageMimeType) {
    const messages = [
        {
            role: 'user',
            content: [
                { type: 'text', text: prompt }
            ]
        }
    ];

    if (imageBase64) {
        messages[0].content.push({
            type: 'image_url',
            image_url: {
                url: `data:${imageMimeType};base64,${imageBase64}`
            }
        });
    }

    // Groq vision models (most are currently decommissioned, but we try just in case they bring them back)
    const modelsToTry = ['llama-3.2-90b-vision-preview', 'llama-3.2-11b-vision-preview'];
    
    let lastErr = null;
    for (const model of modelsToTry) {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages,
                temperature: 0.1,
                max_completion_tokens: 1024
            })
        });

        if (res.status === 429) throw new Error('QUOTA');
        
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            lastErr = new Error(err?.error?.message || `Groq API Error: ${res.status}`);
            continue; // try next model
        }

        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) return text;
    }
    
    throw lastErr || new Error('Empty response from Groq');
}

async function callGoogleVision(key, prompt, imageBase64, imageMimeType) {
    const contents = [{ parts: [] }];

    if (imageBase64) {
        contents[0].parts.push({
            inlineData: { mimeType: imageMimeType, data: imageBase64 }
        });
    }
    contents[0].parts.push({ text: prompt });

    // Use Gemini models that are confirmed to work on the free tier
    const models = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-flash-latest'];
    let lastErr = null;

    for (const model of models) {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            }
        );

        if (res.status === 429 || res.status === 503) throw new Error('QUOTA');
        
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            lastErr = new Error(err?.error?.message || `Gemini API Error: ${res.status}`);
            continue;
        }

        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
    }

    throw lastErr || new Error('Empty response from Gemini');
}

export async function callGemini({ prompt, imageBase64 = null, imageMimeType = 'image/jpeg' }) {
    if (KEYS.length === 0) {
        throw new Error('Aucune clé API configurée.');
    }

    let lastError = null;
    let attempts = 0;

    for (let i = 0; i < KEYS.length; i++) {
        const key = KEYS[(currentKeyIndex + i) % KEYS.length];
        const isGroq = key.startsWith('gsk_');
        attempts++;

        try {
            if (attempts > 1) await sleep(500);

            let text;
            if (isGroq) {
                // If there's an image, Groq will fail because they deleted their vision models.
                // We try it anyway, and if it fails, it will move to the next key (Gemini).
                text = await callGroqVision(key, prompt, imageBase64, imageMimeType);
            } else {
                text = await callGoogleVision(key, prompt, imageBase64, imageMimeType);
            }

            // Success
            currentKeyIndex = (currentKeyIndex + i + 1) % KEYS.length;
            return text;

        } catch (err) {
            if (err.message === 'QUOTA') {
                lastError = new Error(`Quota dépassée pour la clé ${isGroq ? 'Groq' : 'Gemini'}`);
                continue; // Try next key
            }
            lastError = err;
            // Si Groq échoue (ex: modèle vision supprimé), la boucle continue vers la clé suivante.
        }
    }

    const msg = lastError?.message || 'Erreur inconnue';
    const isQuota = msg.toLowerCase().includes('quota');
    
    throw new Error(
        isQuota
            ? '⚠️ Toutes les clés ont atteint leur limite.'
            : `Erreur IA: ${msg}`
    );
}

import { DEFAULT_OUTLINE, normalizeOutline } from './outlineUtils.js';

export const OUTLINE_PREFERENCES_KEY = 'sticker_print:lastOutlineSettings';

// Also keep a session fallback when browser storage is unavailable or full.
let sessionPreferences = null;

export function readOutlinePreferences(storage, existingOutline) {
    try {
        const saved = JSON.parse((storage ?? globalThis.localStorage)?.getItem(OUTLINE_PREFERENCES_KEY) || 'null');
        if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
            sessionPreferences = { ...normalizeOutline(saved), enabled: false };
        }
    } catch {
        // A corrupt preference or blocked storage must not prevent editing.
    }
    // Upgrade an existing outlined sticker without losing its previous values,
    // but never replace newer remembered defaults merely by reopening it.
    if (!sessionPreferences && existingOutline?.enabled) {
        return rememberOutlinePreferences(existingOutline, storage);
    }
    return { ...(sessionPreferences || DEFAULT_OUTLINE), enabled: false };
}

export function rememberOutlinePreferences(outline, storage) {
    // Remember the appearance, not the toggle: new stickers remain opt-in.
    sessionPreferences = { ...normalizeOutline(outline), enabled: false };
    try {
        (storage ?? globalThis.localStorage)?.setItem(OUTLINE_PREFERENCES_KEY, JSON.stringify(sessionPreferences));
    } catch {
        // Reuse the in-memory preferences for the rest of this session.
    }
    return { ...sessionPreferences };
}
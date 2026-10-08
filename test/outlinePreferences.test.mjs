import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_OUTLINE } from '../src/utils/outlineUtils.js';
import { OUTLINE_PREFERENCES_KEY, readOutlinePreferences, rememberOutlinePreferences } from '../src/utils/outlinePreferences.js';

function storage(initialValue = null) {
    let value = initialValue;
    return {
        getItem: key => key === OUTLINE_PREFERENCES_KEY ? value : null,
        setItem: (key, nextValue) => { if (key === OUTLINE_PREFERENCES_KEY) value = nextValue; }
    };
}

const appearance = {
    enabled: true, color: '#16a34a', width: 3.75, mode: 'solid', tolerance: 58, removeBackground: false
};

test('new stickers use factory defaults until an outline appearance is remembered', () => {
    rememberOutlinePreferences(DEFAULT_OUTLINE, storage());
    assert.deepEqual(readOutlinePreferences(storage()), DEFAULT_OUTLINE);
});

test('all last-used outline settings are persisted without automatically enabling outlines', () => {
    const local = storage();
    rememberOutlinePreferences(appearance, local);
    const expected = { ...appearance, enabled: false };
    assert.deepEqual(JSON.parse(local.getItem(OUTLINE_PREFERENCES_KEY)), expected);
    assert.deepEqual(readOutlinePreferences(local), expected);
});

test('persisted settings restore independently of current session defaults', () => {
    const local = storage(JSON.stringify(appearance));
    rememberOutlinePreferences(DEFAULT_OUTLINE, storage());
    assert.deepEqual(readOutlinePreferences(local), { ...appearance, enabled: false });
});

test('imported preferences are validated and clamped', () => {
    const local = storage(JSON.stringify({ color: 'invalid', width: 100, tolerance: -10, mode: 'photo', enabled: true }));
    const result = readOutlinePreferences(local);
    assert.equal(result.color, DEFAULT_OUTLINE.color);
    assert.equal(result.width, 5);
    assert.equal(result.tolerance, 4);
    assert.equal(result.mode, 'auto');
    assert.equal(result.enabled, false);
});

test('corrupt or unsupported stored values do not break editing', () => {
    rememberOutlinePreferences(DEFAULT_OUTLINE, storage());
    for (const value of ['{invalid', 'null', '[]', '42', '"outline"']) {
        assert.deepEqual(readOutlinePreferences(storage(value)), DEFAULT_OUTLINE);
    }
});

test('blocked storage falls back to remembered settings for this session', () => {
    const blocked = {
        getItem() { throw new Error('Storage disabled'); },
        setItem() { throw new Error('Storage disabled'); }
    };
    assert.doesNotThrow(() => rememberOutlinePreferences(appearance, blocked));
    assert.deepEqual(readOutlinePreferences(blocked), { ...appearance, enabled: false });
});
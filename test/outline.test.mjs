import test from 'node:test';
import assert from 'node:assert/strict';
import { detectForeground, expandAlpha, normalizeOutline, DEFAULT_OUTLINE } from '../src/utils/outlineUtils.js';

function pixels(width, height, color = [255, 255, 255, 255]) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) data.set(color, i * 4);
    return { width, height, data };
}

function paint(image, x, y, color) { image.data.set(color, (y * image.width + x) * 4); }

test('outline defaults are disabled and imported values are validated', () => {
    assert.deepEqual(normalizeOutline(), DEFAULT_OUTLINE);
    assert.deepEqual(normalizeOutline(null), DEFAULT_OUTLINE);
    const value = normalizeOutline({ enabled: true, color: 'not-a-color', width: 900, mode: 'photo', tolerance: -2 });
    assert.equal(value.color, DEFAULT_OUTLINE.color);
    assert.equal(value.width, 5);
    assert.equal(value.mode, 'auto');
    assert.equal(value.tolerance, 4);
});

test('automatic detection uses the original alpha silhouette', () => {
    const image = pixels(7, 7, [0, 0, 0, 0]);
    paint(image, 3, 3, [220, 0, 0, 255]);
    paint(image, 3, 2, [220, 0, 0, 96]);
    const result = detectForeground(image);
    assert.equal(result.kind, 'alpha');
    assert.equal(result.alpha[3 * 7 + 3], 255);
    assert.equal(result.alpha[2 * 7 + 3], 96);
    assert.equal(result.alpha[0], 0);
});

test('solid detection removes edge-connected background but preserves object details', () => {
    const image = pixels(9, 9);
    for (let y = 2; y < 7; y++) for (let x = 2; x < 7; x++) paint(image, x, y, [220, 0, 0, 255]);
    paint(image, 4, 4, [255, 255, 255, 255]);
    const result = detectForeground(image);
    assert.equal(result.kind, 'solid');
    assert.equal(result.alpha[0], 0);
    assert.equal(result.alpha[2 * 9 + 2], 255);
    assert.equal(result.alpha[4 * 9 + 4], 255);
});

test('tolerance changes removal without erasing a contrasting object', () => {
    const image = pixels(7, 7);
    paint(image, 1, 0, [230, 230, 230, 255]);
    paint(image, 3, 3, [20, 80, 120, 255]);
    assert.equal(detectForeground(image, 'solid', 8).alpha[1], 255);
    assert.equal(detectForeground(image, 'solid', 32).alpha[1], 0);
    assert.equal(detectForeground(image, 'solid', 32).alpha[3 * 7 + 3], 255);
});

test('alpha-only does not invent an object in an opaque image', () => {
    assert.equal(detectForeground(pixels(4, 4), 'alpha').kind, 'none');
});

test('a uniform empty image is kept rather than erased', () => {
    const result = detectForeground(pixels(7, 7));
    assert.equal(result.kind, 'none');
    assert.equal(result.alpha[0], 255);
});

test('nonuniform borders are not guessed as a solid background', () => {
    const image = pixels(20, 20);
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
        paint(image, x, y, [x * 12, y * 12, (x + y) * 6, 255]);
    }
    assert.equal(detectForeground(image, 'solid', 4).kind, 'none');
});

test('outline dilation follows separate objects, not a rectangular image border', () => {
    const alpha = new Uint8ClampedArray(15 * 15);
    alpha[7 * 15 + 7] = 255;
    alpha[2 * 15 + 2] = 255;
    const result = expandAlpha(alpha, 15, 15, 2);
    assert.equal(result[7 * 15 + 7], 255);
    assert.equal(result[7 * 15 + 8], 255);
    assert.ok(result[7 * 15 + 9] > 0);
    assert.equal(result[7 * 15 + 11], 0);
    assert.equal(result[0], 0);
    assert.equal(result[2 * 15 + 3], 255);
});

test('an empty alpha mask never gets an image-rectangle outline', () => {
    assert.ok(expandAlpha(new Uint8ClampedArray(25), 5, 5, 2).every(value => value === 0));
});
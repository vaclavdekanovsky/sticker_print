// A local, deterministic outline pipeline. No image uploads or model downloads.
export const DEFAULT_OUTLINE = Object.freeze({
    enabled: false,
    color: '#7c3aed',
    width: 1.5, // Percentage of the source image's shorter side; scales with zoom.
    mode: 'auto',
    tolerance: 32,
    removeBackground: true
});

export function normalizeOutline(value = {}) {
    value = value || {};
    const number = (input, fallback, min, max) => {
        const parsed = Number(input);
        return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
    };
    return {
        enabled: value.enabled === true,
        color: /^#[0-9a-f]{6}$/i.test(value.color) ? value.color : DEFAULT_OUTLINE.color,
        width: number(value.width ?? DEFAULT_OUTLINE.width, DEFAULT_OUTLINE.width, 0.25, 5),
        mode: ['auto', 'alpha', 'solid'].includes(value.mode) ? value.mode : 'auto',
        tolerance: number(value.tolerance ?? 32, 32, 4, 100),
        removeBackground: value.removeBackground !== false
    };
}

function colorDistance(data, offset, color) {
    return Math.sqrt(((data[offset] - color[0]) ** 2 +
        (data[offset + 1] - color[1]) ** 2 + (data[offset + 2] - color[2]) ** 2) / 3);
}

// Estimate a dominant border color, not the center of the image/object.
function borderColor(data, width, height, tolerance) {
    const samples = [];
    const buckets = new Map();
    const add = (x, y) => {
        const offset = (y * width + x) * 4;
        if (data[offset + 3] < 32) return;
        const color = [data[offset], data[offset + 1], data[offset + 2]];
        const key = color.map(channel => Math.floor(channel / 16)).join(',');
        samples.push(color);
        const bucket = buckets.get(key) || [];
        bucket.push(color);
        buckets.set(key, bucket);
    };
    for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 64))) {
        add(x, 0);
        add(x, height - 1);
    }
    for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 64))) {
        add(0, y);
        add(width - 1, y);
    }
    const dominant = [...buckets.values()].sort((a, b) => b.length - a.length)[0];
    if (!dominant) return null;
    const color = [0, 1, 2].map(channel =>
        dominant.reduce((sum, sample) => sum + sample[channel], 0) / dominant.length);
    const matches = samples.filter(sample => colorDistance(sample, 0, color) <= tolerance).length;
    return matches / samples.length >= 0.55 ? color : null;
}

// Only remove matching pixels connected to an image edge. Similar colors inside
// a closed object are deliberately retained (e.g. white eyes in white artwork).
export function detectForeground(imageData, mode = 'auto', tolerance = 32) {
    const { data, width, height } = imageData;
    const count = width * height;
    const alpha = new Uint8ClampedArray(count);
    let hasTransparency = false;
    for (let i = 0; i < count; i++) {
        alpha[i] = data[i * 4 + 3];
        if (alpha[i] < 16) hasTransparency = true;
    }
    if (mode === 'alpha' || (mode === 'auto' && hasTransparency)) {
        return { alpha, kind: hasTransparency ? 'alpha' : 'none' };
    }
    const color = borderColor(data, width, height, tolerance);
    if (!color) return { alpha, kind: 'none' };

    const visited = new Uint8Array(count);
    const queue = new Uint32Array(count);
    let tail = 0;
    const visit = index => {
        if (visited[index]) return;
        visited[index] = 1;
        if (alpha[index] < 16 || colorDistance(data, index * 4, color) <= tolerance) {
            queue[tail++] = index;
        }
    };
    for (let x = 0; x < width; x++) {
        visit(x);
        visit((height - 1) * width + x);
    }
    for (let y = 0; y < height; y++) {
        visit(y * width);
        visit(y * width + width - 1);
    }
    for (let head = 0; head < tail; head++) {
        const index = queue[head];
        const x = index % width;
        if (x > 0) visit(index - 1);
        if (x < width - 1) visit(index + 1);
        if (index >= width) visit(index - width);
        if (index < count - width) visit(index + width);
    }
    // Refuse a detection that would erase everything or remove nothing.
    if (tail === 0 || tail === count) return { alpha, kind: 'none' };
    for (let i = 0; i < tail; i++) alpha[queue[i]] = 0;
    return { alpha, kind: 'solid' };
}

// Linear-time chamfer distance transform. Unlike a rectangular CSS border this
// follows the alpha silhouette, including concave edges and separate objects.
export function expandAlpha(alpha, width, height, radius) {
    const distance = new Float32Array(alpha.length);
    const diagonal = Math.SQRT2;
    for (let i = 0; i < alpha.length; i++) distance[i] = alpha[i] >= 16 ? 0 : 1e6;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            let d = distance[i];
            if (x > 0) d = Math.min(d, distance[i - 1] + 1);
            if (y > 0) {
                d = Math.min(d, distance[i - width] + 1);
                if (x > 0) d = Math.min(d, distance[i - width - 1] + diagonal);
                if (x < width - 1) d = Math.min(d, distance[i - width + 1] + diagonal);
            }
            distance[i] = d;
        }
    }
    for (let y = height - 1; y >= 0; y--) {
        for (let x = width - 1; x >= 0; x--) {
            const i = y * width + x;
            let d = distance[i];
            if (x < width - 1) d = Math.min(d, distance[i + 1] + 1);
            if (y < height - 1) {
                d = Math.min(d, distance[i + width] + 1);
                if (x > 0) d = Math.min(d, distance[i + width - 1] + diagonal);
                if (x < width - 1) d = Math.min(d, distance[i + width + 1] + diagonal);
            }
            distance[i] = d;
        }
    }
    return Uint8ClampedArray.from(distance, d => Math.max(0, Math.min(1, radius + 0.5 - d)) * 255);
}

const maskCache = new Map();

async function loadMask(source, settings) {
    const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.crossOrigin = 'anonymous';
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('The sticker image could not be loaded.'));
        element.src = source;
    });
    if (image.naturalWidth > 8192 || image.naturalHeight > 8192 ||
        image.naturalWidth * image.naturalHeight > 16000000) {
        throw new Error('Please resize this image to at most 16 megapixels and 8192 pixels per side.');
    }
    // Bound working memory, then return the result at the original dimensions
    // so react-easy-crop's coordinates do not change when toggling the outline.
    const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const mask = detectForeground(pixels, settings.mode, settings.tolerance);
    return { image, width: canvas.width, height: canvas.height, ...mask };
}

export async function prepareOutlinedImage(source, value) {
    const settings = normalizeOutline(value);
    if (!settings.enabled) return { src: source, kind: 'off' };
    const key = JSON.stringify([source, settings.mode, settings.tolerance]);
    if (!maskCache.has(key)) {
        if (maskCache.size >= 4) maskCache.delete(maskCache.keys().next().value);
        const pending = loadMask(source, settings);
        maskCache.set(key, pending);
        pending.catch(() => maskCache.delete(key));
    }
    const { image, width, height, alpha, kind } = await maskCache.get(key);
    if (kind === 'none') return { src: source, kind };

    const radius = Math.max(1, Math.min(width, height) * settings.width / 100);
    const expanded = expandAlpha(alpha, width, height, radius);
    const layer = document.createElement('canvas');
    layer.width = width;
    layer.height = height;
    const layerContext = layer.getContext('2d');
    const ring = layerContext.createImageData(width, height);
    const color = [1, 3, 5].map(start => parseInt(settings.color.slice(start, start + 2), 16));
    for (let i = 0; i < alpha.length; i++) {
        ring.data[i * 4] = color[0];
        ring.data[i * 4 + 1] = color[1];
        ring.data[i * 4 + 2] = color[2];
        ring.data[i * 4 + 3] = expanded[i];
    }
    layerContext.putImageData(ring, 0, 0);

    // Detect at a bounded size, but never downsample the actual artwork.
    const foreground = document.createElement('canvas');
    foreground.width = image.naturalWidth;
    foreground.height = image.naturalHeight;
    const foregroundContext = foreground.getContext('2d');
    foregroundContext.drawImage(image, 0, 0);
    if (kind === 'solid') {
        const mask = layerContext.createImageData(width, height);
        for (let i = 0; i < alpha.length; i++) mask.data[i * 4 + 3] = alpha[i] > 0 ? 255 : 0;
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = width;
        maskCanvas.height = height;
        maskCanvas.getContext('2d').putImageData(mask, 0, 0);
        foregroundContext.globalCompositeOperation = 'destination-in';
        foregroundContext.drawImage(maskCanvas, 0, 0, foreground.width, foreground.height);
        foregroundContext.globalCompositeOperation = 'source-over';
    }

    const result = document.createElement('canvas');
    result.width = image.naturalWidth;
    result.height = image.naturalHeight;
    const context = result.getContext('2d');
    context.drawImage(layer, 0, 0, result.width, result.height);
    const foregroundPixels = foregroundContext.getImageData(0, 0, result.width, result.height);
    const ringPixels = context.getImageData(0, 0, result.width, result.height);
    // An OUTER outline must not recolor or opacify translucent object interiors.
    for (let i = 3; i < ringPixels.data.length; i += 4) {
        if (foregroundPixels.data[i] > 0) ringPixels.data[i] = 0;
    }
    context.putImageData(ringPixels, 0, 0);
    if (!settings.removeBackground) {
        context.globalCompositeOperation = 'destination-over';
        context.drawImage(image, 0, 0);
        context.globalCompositeOperation = 'source-over';
    } else {
        context.drawImage(foreground, 0, 0);
    }
    const src = result.toDataURL('image/png');
    if (!src.startsWith('data:image/png')) throw new Error('This image is too large to render in this browser.');
    return { src, kind };
}
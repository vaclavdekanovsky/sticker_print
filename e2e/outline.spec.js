import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';

const fixture = name => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const preferencesKey = 'sticker_print:lastOutlineSettings';

async function setRange(page, selector, value) {
    await page.locator(selector).evaluate((input, nextValue) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(nextValue));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
}

const rememberedAppearance = { color: '#16a34a', width: 3.75, mode: 'solid', tolerance: 58, removeBackground: false };

async function chooseRememberedAppearance(page) {
    await enableOutline(page, rememberedAppearance.color);
    await setRange(page, '#outline-width', rememberedAppearance.width);
    await page.locator('#outline-mode').selectOption(rememberedAppearance.mode);
    await setRange(page, '#outline-tolerance', rememberedAppearance.tolerance);
    await page.getByLabel('Replace detected background').uncheck();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
}

async function expectRememberedAppearance(page, appearance = rememberedAppearance) {
    await expect(page.locator('#outline-color')).toHaveValue(appearance.color);
    await expect(page.locator('#outline-width')).toHaveValue(String(appearance.width));
    await expect(page.locator('#outline-mode')).toHaveValue(appearance.mode);
    await expect(page.locator('#outline-tolerance')).toHaveValue(String(appearance.tolerance));
    await expect(page.getByLabel('Replace detected background')).toBeChecked({ checked: appearance.removeBackground });
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
}

test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('hasSeenPaperSetup', 'true'));
    await page.goto('/');
});

async function editFixture(page, name = 'transparent-object.svg') {
    await page.locator('.dropzone input[type="file"]').setInputFiles(fixture(name));
    await page.locator('.sticker-slot img').first().click();
    await expect(page.getByRole('dialog', { name: 'Edit sticker' })).toBeVisible();
}

async function enableOutline(page, color = '#16a34a') {
    await page.getByLabel('Add a colored outline around the object').check();
    await expect(page.locator('.outline-status')).toContainText(/Transparency detected|Solid background detected/);
    await page.locator('#outline-color').fill(color);
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
}

async function countGreen(page, selector) {
    return page.locator(selector).first().evaluate(async element => {
        if (!element.complete) await new Promise(resolve => { element.onload = resolve; });
        const canvas = document.createElement('canvas');
        canvas.width = element.naturalWidth;
        canvas.height = element.naturalHeight;
        const context = canvas.getContext('2d');
        context.drawImage(element, 0, 0);
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 1] > 100 && data[i + 1] > data[i] * 1.5 && data[i + 1] > data[i + 2] * 1.5 && data[i + 3] > 100) count++;
        }
        return count;
    });
}

test('live outline saves to the sheet, is reversible, and cancels cleanly', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await editFixture(page);
    await enableOutline(page);
    expect(await countGreen(page, '.reactEasyCrop_Image')).toBeGreaterThan(100);
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await countGreen(page, '.sticker-slot img')).toBeGreaterThan(100);

    await page.locator('.sticker-slot img').first().click();
    await expect(page.getByLabel('Add a colored outline around the object')).toBeChecked();
    await expect(page.locator('#outline-color')).toHaveValue('#16a34a');
    await page.getByLabel('Add a colored outline around the object').uncheck();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(await countGreen(page, '.sticker-slot img')).toBeGreaterThan(100);

    await page.locator('.sticker-slot img').first().click();
    await page.getByLabel('Add a colored outline around the object').uncheck();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await countGreen(page, '.sticker-slot img')).toBe(0);
    expect(errors).toEqual([]);
});

test('solid background detection and original background preservation render correctly', async ({ page }) => {
    await editFixture(page, 'solid-object.svg');
    await enableOutline(page);
    await expect(page.locator('.outline-status')).toContainText('Solid background detected');
    const alphaAtCorner = async () => page.locator('.reactEasyCrop_Image').evaluate(async element => {
        await element.decode();
        const canvas = document.createElement('canvas');
        canvas.width = element.naturalWidth;
        canvas.height = element.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(element, 0, 0);
        return ctx.getImageData(0, 0, 1, 1).data[3];
    });
    expect(await alphaAtCorner()).toBe(0);
    await page.getByLabel('Replace detected background').uncheck();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
    expect(await alphaAtCorner()).toBe(255);
    await page.getByLabel('Background detection').selectOption('alpha');
    await expect(page.locator('.outline-status')).toContainText('No clear object boundary found');
    expect(await countGreen(page, '.reactEasyCrop_Image')).toBe(0);
});

test('outline survives rotation, flip, PDF export, and editable ZIP round-trip', async ({ page }) => {
    await editFixture(page);
    await enableOutline(page);
    await page.getByRole('button', { name: 'Rotate +90°', exact: true }).click();
    await page.getByRole('button', { name: 'Flip Horizontal', exact: true }).click();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const before = await countGreen(page, '.sticker-slot img');
    expect(before).toBeGreaterThan(100);

    const pdfPending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export PDF' }).click();
    const pdf = await pdfPending;
    const pdfBytes = await readFile(await pdf.path());
    expect(pdfBytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdfBytes.length).toBeGreaterThan(3000);

    const zipPending = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export ZIP' }).click();
    const download = await zipPending;
    const zipPath = await download.path();
    const archive = await JSZip.loadAsync(await readFile(zipPath));
    const metadata = JSON.parse(await archive.file('metadata.json').async('string'));
    expect(metadata.version).toBe('2.0');
    expect(metadata.items[0].outline.color).toBe('#16a34a');
    expect(metadata.items[0].editSettings.rotation).toBe(90);
    expect(archive.file(metadata.items[0].sourceFilename)).not.toBeNull();
    expect(archive.file(metadata.items[0].processedFilename)).not.toBeNull();

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await page.locator('input[accept=".zip"]').setInputFiles(zipPath);
    await expect(page.locator('.sticker-slot img')).toHaveCount(1);
    expect(await countGreen(page, '.sticker-slot img')).toBe(before);
    await page.locator('.sticker-slot img').first().click();
    await expect(page.getByLabel('Add a colored outline around the object')).toBeChecked();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await countGreen(page, '.sticker-slot img')).toBe(before);
});

test('PDF rasterization contains the colored object outline and selected background', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const { prepareOutlinedImage } = await import('/src/utils/outlineUtils.js');
        const { optimizeImageForPDF } = await import('/src/utils/pdfUtils.js');
        const { src } = await prepareOutlinedImage('/e2e/fixtures/solid-object.svg', {
            enabled: true, color: '#16a34a', width: 3
        });
        const jpg = await optimizeImageForPDF(src, 34, 47, '#ddeeff', 'contain');
        const image = new Image();
        image.src = jpg;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let green = 0;
        for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 1] > 100 && pixels[i + 1] > pixels[i] * 1.5 && pixels[i + 1] > pixels[i + 2] * 1.5) green++;
        return { green, corner: Array.from(pixels.slice(0, 3)) };
    });
    expect(result.green).toBeGreaterThan(100);
    expect(result.corner[0]).toBeGreaterThan(210);
    expect(result.corner[2]).toBeGreaterThan(245);
});

test('mobile editor keeps preview and save controls inside the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await editFixture(page);
    await enableOutline(page);
    const save = await page.getByRole('button', { name: 'Save Changes' }).boundingBox();
    const preview = await page.locator('.cropper-area').boundingBox();
    expect(save.y + save.height).toBeLessThanOrEqual(844);
    expect(save.x + save.width).toBeLessThanOrEqual(390);
    expect(preview.height).toBeGreaterThanOrEqual(180);
});

test('outline keeps high-resolution detail, translucent interiors, and guards huge sources', async ({ page }) => {
    const result = await page.evaluate(async () => {
        const { prepareOutlinedImage } = await import('/src/utils/outlineUtils.js');
        const canvas = document.createElement('canvas');
        canvas.width = 4096;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        for (let x = 1024; x < 3072; x++) {
            ctx.fillStyle = x % 2 === 0 ? '#ff0000' : '#0000ff';
            ctx.fillRect(x, 20, 1, 88);
        }
        const readPixel = async (src, x, y) => {
            const image = new Image();
            image.src = src;
            await image.decode();
            const output = document.createElement('canvas');
            output.width = image.naturalWidth;
            output.height = image.naturalHeight;
            const context = output.getContext('2d');
            context.drawImage(image, 0, 0);
            return Array.from(context.getImageData(x, y, 1, 1).data);
        };
        const outlined = await prepareOutlinedImage(canvas.toDataURL(), { enabled: true, color: '#00ff00' });
        const detail = [await readPixel(outlined.src, 2000, 60), await readPixel(outlined.src, 2001, 60)];
        canvas.width = 100;
        canvas.height = 100;
        ctx.fillStyle = 'rgba(255,0,0,0.25)';
        ctx.fillRect(25, 25, 50, 50);
        const source = canvas.toDataURL();
        const original = await readPixel(source, 50, 50);
        const transparent = await prepareOutlinedImage(source, { enabled: true, color: '#00ff00' });
        const retained = await prepareOutlinedImage(source, { enabled: true, color: '#00ff00', removeBackground: false });
        let oversized = '';
        try {
            await prepareOutlinedImage('data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="9000" height="8"/>'), { enabled: true });
        } catch (error) { oversized = error.message; }
        return { detail, original, translucent: await readPixel(transparent.src, 50, 50),
            retained: await readPixel(retained.src, 50, 50), oversized };
    });
    expect(result.detail).toEqual([[255, 0, 0, 255], [0, 0, 255, 255]]);
    expect(result.translucent).toEqual(result.original);
    expect(result.retained).toEqual(result.original);
    expect(result.oversized).toContain('resize this image');
});

test('enabling another sticker or re-enabling an outline uses the latest appearance', async ({ page }) => {
    // Both images exist before the user picks defaults; upload-time snapshots
    // must not prevent the second sticker from using the latest preferences.
    await page.locator('.dropzone input[type="file"]').setInputFiles([
        fixture('solid-object.svg'), fixture('transparent-object.svg')
    ]);
    await page.locator('.sticker-slot img').nth(0).click();
    await chooseRememberedAppearance(page);
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.locator('.sticker-slot img').nth(1).click();
    await expect(page.getByLabel('Add a colored outline around the object')).not.toBeChecked();
    await page.getByLabel('Add a colored outline around the object').check();
    await expectRememberedAppearance(page);
    await page.locator('#outline-color').fill('#ff8800');
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // An already-outlined sticker retains its own saved appearance on open.
    await page.locator('.sticker-slot img').nth(0).click();
    await expectRememberedAppearance(page);
    await page.getByLabel('Add a colored outline around the object').uncheck();
    await page.getByLabel('Add a colored outline around the object').check();
    await expectRememberedAppearance(page, { ...rememberedAppearance, color: '#ff8800' });
});

test('last-used settings survive cancellation and a browser refresh without enabling new stickers', async ({ page }) => {
    await editFixture(page, 'solid-object.svg');
    await chooseRememberedAppearance(page);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(await countGreen(page, '.sticker-slot img')).toBe(0);
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), preferencesKey);
    expect(stored).toEqual({ ...rememberedAppearance, enabled: false });

    await page.reload();
    await editFixture(page, 'solid-object.svg');
    await expect(page.getByLabel('Add a colored outline around the object')).not.toBeChecked();
    await page.getByLabel('Add a colored outline around the object').check();
    await expectRememberedAppearance(page);
    expect(await countGreen(page, '.reactEasyCrop_Image')).toBeGreaterThan(100);
});

test('invalid stored outline defaults fall back without breaking the editor', async ({ page }) => {
    await page.evaluate(key => localStorage.setItem(key, '{invalid-json'), preferencesKey);
    await page.reload();
    await editFixture(page);
    await page.getByLabel('Add a colored outline around the object').check();
    await expect(page.locator('#outline-color')).toHaveValue('#7c3aed');
    await expect(page.locator('#outline-width')).toHaveValue('1.5');
    await expect(page.locator('#outline-mode')).toHaveValue('auto');
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
});

test('previously outlined stickers seed defaults if no remembered preferences exist yet', async ({ page }) => {
    const zip = new JSZip();
    zip.file('original.svg', await readFile(fixture('solid-object.svg')));
    zip.file('metadata.json', JSON.stringify({
        version: '2.0', items: [{
            id: 'existing-outline', filename: 'original.svg', quantity: 1,
            outline: { ...rememberedAppearance, enabled: true }
        }]
    }));
    await page.locator('input[accept=".zip"]').setInputFiles({
        name: 'existing-outline.zip', mimeType: 'application/zip',
        buffer: await zip.generateAsync({ type: 'nodebuffer' })
    });
    await page.locator('.sticker-slot img').first().click();
    await expectRememberedAppearance(page);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.locator('.dropzone input[type="file"]').setInputFiles(fixture('solid-object.svg'));
    await page.locator('.sticker-slot img').nth(1).click();
    await page.getByLabel('Add a colored outline around the object').check();
    await expectRememberedAppearance(page);
});

test('blocked preference storage still remembers the appearance during the session', async ({ page }) => {
    await page.addInitScript(key => {
        const get = Storage.prototype.getItem;
        const set = Storage.prototype.setItem;
        Storage.prototype.getItem = function (name) {
            if (name === key) throw new Error('Storage disabled');
            return get.call(this, name);
        };
        Storage.prototype.setItem = function (name, value) {
            if (name === key) throw new Error('Storage disabled');
            return set.call(this, name, value);
        };
    }, preferencesKey);
    await page.reload();
    await editFixture(page, 'solid-object.svg');
    await chooseRememberedAppearance(page);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    // Browsers do not fire change when the same file is selected twice.
    await page.locator('.dropzone input[type="file"]').setInputFiles([]);
    await page.locator('.dropzone input[type="file"]').setInputFiles(fixture('solid-object.svg'));
    await page.locator('.sticker-slot img').nth(1).click();
    await page.getByLabel('Add a colored outline around the object').check();
    await expectRememberedAppearance(page);
});
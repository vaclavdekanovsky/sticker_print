import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const DOC_ASSETS_DIR = path.join(process.cwd(), 'doc-assets');
const INPUT_IMAGES_DIR = path.join(DOC_ASSETS_DIR, 'input_images');
const GENERATED_DOCS_DIR = path.join(DOC_ASSETS_DIR, 'generated_docs');
const IMAGES_OUTPUT_DIR = path.join(GENERATED_DOCS_DIR, 'images');

test.describe('Documentation Generation', () => {
    test.beforeAll(async () => {
        if (!fs.existsSync(IMAGES_OUTPUT_DIR)) {
            fs.mkdirSync(IMAGES_OUTPUT_DIR, { recursive: true });
        }
    });

    test('generate tutorial pdf', async ({ page }) => {
        console.log('--- STARTING DOC GENERATION ---');
        test.setTimeout(180000); // 3 minutes for slower environments
        await page.setViewportSize({ width: 1400, height: 1000 });

        // Setup Files
        const mainSetPaths = [
            'mouse.png',
            'firetruck_1.png',
            'firetruck_2.png',
            'sticker_favicon.png',
            'sweets.png'
        ].map(f => path.join(INPUT_IMAGES_DIR, f));

        const travelFiles = ['hoi_an.png', 'cholula.png', 'serengeti.png'].map(f => path.join(INPUT_IMAGES_DIR, f));

        // --- PHASE 1: Page Setup ---
        console.log('--- PHASE 1: Page Setup ---');
        await page.goto('/');

        const paperModal = page.locator('.paper-setup-modal');
        try {
            await paperModal.waitFor({ state: 'visible', timeout: 3000 });
        } catch (e) {
            await page.click('button[title="Configure Paper & Grid"]');
            await paperModal.waitFor({ state: 'visible' });
        }

        // Capture Setup Modal
        const scSetupModal = path.join(IMAGES_OUTPUT_DIR, 'step1-setup-modal.png');
        await paperModal.screenshot({ path: scSetupModal });

        // Select 6x3
        await page.selectOption('.preset-select', '6x3');
        await page.click('.paper-setup-modal .btn-primary'); // specific selector
        await expect(paperModal).toBeHidden();

        // --- PHASE 2: Upload Images ---
        console.log('--- PHASE 2: Upload Images ---');
        await page.setInputFiles('.dropzone input[type="file"]', mainSetPaths);
        await expect(page.locator('.image-card')).toHaveCount(5);
        await page.waitForTimeout(3000); // Wait for images to load and render

        // Capture All Visible on Canvas
        const scAllVisible = path.join(IMAGES_OUTPUT_DIR, 'step2-all-visible.png');
        await page.screenshot({ path: scAllVisible });

        // --- PHASE 3: Editing ---
        console.log('--- PHASE 3: Editing ---');
        // Mouse was first in mainSetPaths, so it should be the first card
        const mouseCard = page.locator('.image-card').nth(0);
        await mouseCard.locator('button').first().click(); // Edit button

        const modal = page.locator('.modal');
        await expect(modal).toBeVisible();

        // Capture Before Rotate
        const scRotateBefore = path.join(IMAGES_OUTPUT_DIR, 'step2-rotate-before.jpg');
        await modal.screenshot({ path: scRotateBefore, type: 'jpeg', quality: 80 });

        // Rotate 90
        await modal.locator('.btn-icon[title*="Rotate +90"]').first().click();
        await page.waitForTimeout(1000); // Extra wait for rotate animation/render
        const scRotateAfter = path.join(IMAGES_OUTPUT_DIR, 'step2-rotate-after.jpg');
        await modal.screenshot({ path: scRotateAfter, type: 'jpeg', quality: 80 });

        // 2 Slots
        await modal.getByText('2 Slots').click();
        await page.waitForTimeout(1000);
        const scSlots2 = path.join(IMAGES_OUTPUT_DIR, 'step2-slots-2.jpg');
        await modal.screenshot({ path: scSlots2, type: 'jpeg', quality: 80 });

        // Save
        await modal.getByText('Save Changes').click();
        await expect(modal).toBeHidden();

        // Capture Export Buttons (Step 4 in PDF)
        const headerActions = page.locator('.actions');
        const scExportPath = path.join(IMAGES_OUTPUT_DIR, 'step3-4-exports.png');
        await headerActions.screenshot({ path: scExportPath });

        // --- PHASE 4: Global Zoom (Travel on 2x4 1-slot) ---
        console.log('--- PHASE 4: Global Zoom ---');
        await page.reload();

        // Open/Ensure Paper Setup
        const paperModal2 = page.locator('.paper-setup-modal');
        try {
            await paperModal2.waitFor({ state: 'visible', timeout: 3000 });
        } catch (e) {
            await page.click('button[title="Configure Paper & Grid"]');
            await paperModal2.waitFor({ state: 'visible' });
        }

        // Set to [2x4] Grid (ID remains 2x4, but label updated to 4x2)
        await page.selectOption('.preset-select', '2x4');

        // Switch to 1-slot mode (it defaults to 2-slots for 2x4 now)
        await page.locator('select').nth(1).selectOption('1');

        await page.click('.paper-setup-modal .btn-primary');
        await expect(paperModal2).toBeHidden();

        // Upload Travel Images
        await page.setInputFiles('.dropzone input[type="file"]', travelFiles);
        await expect(page.locator('.image-card')).toHaveCount(3);
        await page.waitForTimeout(3000);

        const previewArea = page.locator('.preview-area');
        const scZoomPre = path.join(IMAGES_OUTPUT_DIR, 'zoom-all-pre.png');
        await previewArea.screenshot({ path: scZoomPre });

        // Global Settings
        await page.click('button[title="Global Settings"]');
        const globalModal = page.locator('.modal-content').filter({ hasText: 'Global Settings' });
        await globalModal.locator('input[type="number"][min="0.1"]').fill('0.99');
        await globalModal.locator('button', { hasText: 'Apply Zoom to All' }).click();

        // Modal closes automatically after zoom apply
        await page.waitForTimeout(5000);

        const scZoomPost = path.join(IMAGES_OUTPUT_DIR, 'zoom-all-post.png');
        await previewArea.screenshot({ path: scZoomPost });

        // --- PHASE 5: Generate PDF ---
        console.log('--- PHASE 5: Generate PDF ---');

        const imgToBase64 = (p) => {
            if (!fs.existsSync(p)) {
                console.warn(`File not found for PDF: ${p}`);
                return '';
            }
            const bitmap = fs.readFileSync(p);
            const ext = path.extname(p).toLowerCase().replace('.', '');
            const type = ext === 'png' ? 'png' : 'jpeg';
            return `data:image/${type};base64,${bitmap.toString('base64')}`;
        };

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px; color: #1f2937; line-height: 1.5; }
                header { margin-bottom: 2rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 1rem; }
                h1 { color: #111827; font-size: 2.25rem; font-weight: 700; margin-bottom: 0.5rem; }
                .intro-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem; }
                .step { margin-bottom: 3.5rem; break-inside: avoid; }
                .step h2 { color: #2563eb; font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem; display: flex; align-items: center; }
                .step h2 .number { background: #2563eb; color: white; width: 2.2rem; height: 2.2rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 0.75rem; font-size: 1.1rem; }
                .comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1rem; }
                .img-wrapper { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .img-wrapper img { width: 100%; display: block; }
                .img-wrapper p { padding: 0.6rem; background: #f9fafb; font-size: 0.875rem; color: #4b5563; text-align: center; margin: 0; border-top: 1px solid #e5e7eb; }
                .full-img { width: 100%; display: block; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                footer { margin-top: 4rem; text-align: center; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 1.5rem; font-size: 0.9rem; }
                code { background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.95em; }
            </style>
        </head>
        <body>
            <header>
                <h1>Sticker Sheet Creator Guide</h1>
                <p>Create professional, perfectly aligned sticker sheets in minutes.</p>
            </header>

            <div class="intro-box">
                <h3 style="margin-top:0">Quick Workflow</h3>
                <p>Follow these 5 steps to generate your stickers:</p>
                <ol style="margin: 0; padding-left: 1.2rem;">
                    <li><strong>Page Setup:</strong> Choose your paper format.</li>
                    <li><strong>Upload:</strong> Add your images.</li>
                    <li><strong>Edit:</strong> Rotate, crop, or expand individual stickers.</li>
                    <li><strong>Export:</strong> Generate your print-ready PDF.</li>
                    <li><strong>Global Fix:</strong> Automatically fit all images to slots.</li>
                </ol>
            </div>

            <div class="step">
                <h2><span class="number">1</span> Page Setup</h2>
                <p>Click the <strong>Paper Setup</strong> icon (Gear) to choose your layout. This ensures your stickers match your physical paper perfectly.</p>
                <img class="full-img" style="max-width: 500px; margin: 0 auto; display: block;" src="${imgToBase64(scSetupModal)}" />
            </div>

            <div class="step">
                <h2><span class="number">2</span> Uploading Images</h2>
                <p>Drag and drop multiple images into the sidebar or directly onto the canvas. You can see how they fill the sheet in real-time.</p>
                <img class="full-img" src="${imgToBase64(scAllVisible)}" />
            </div>

            <div class="step">
                <h2><span class="number">3</span> Modifying Stickers</h2>
                <p>Click any sticker to open the Editor. Adjust rotation or expand a sticker to fill <strong>2 Slots</strong> (Full Width).</p>
                <div class="comparison">
                    <div class="img-wrapper">
                        <img src="${imgToBase64(scRotateBefore)}" />
                        <p>Original</p>
                    </div>
                    <div class="img-wrapper">
                        <img src="${imgToBase64(scRotateAfter)}" />
                        <p>Rotated 90°</p>
                    </div>
                </div>
                <div style="margin-top: 1.5rem;">
                    <img class="full-img" src="${imgToBase64(scSlots2)}" />
                    <p style="text-align: center; color: #6b7280; font-size: 0.9rem; margin-top: 0.5rem;">Sticker expanded to fill two slots</p>
                </div>
            </div>

            <div class="step">
                <h2><span class="number">4</span> Exporting Your PDF</h2>
                <p>Once you are happy with the layout, click <strong>Export PDF</strong> to download your file.</p>
                <img class="full-img" src="${imgToBase64(scExportPath)}" style="max-width: 600px; margin: 0 auto; display: block;" />
            </div>

            <div class="step">
                <h2><span class="number">5</span> Global Setup & Zoom All</h2>
                <p>For a perfect fit across all stickers, use <strong>Global Settings</strong>. This automatically centers and crops every image to fill its slot without gaps.</p>
                <div class="comparison">
                    <div class="img-wrapper">
                        <img src="${imgToBase64(scZoomPre)}" />
                        <p>Pre-Zoom (Travel stickers on 2x4)</p>
                    </div>
                    <div class="img-wrapper">
                        <img src="${imgToBase64(scZoomPost)}" />
                        <p>Post-Zoom (Perfect 1-slot alignment)</p>
                    </div>
                </div>
            </div>

            <footer>
                Generated on ${new Date().toLocaleDateString()}
            </footer>
        </body>
        </html>
        `;

        const pdfPath = path.join(GENERATED_DOCS_DIR, 'Sticker_Generator_User_Guide.pdf');
        await page.setContent(htmlContent);
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' }
        });
        console.log(`--- DOC GENERATION COMPLETE: ${pdfPath} ---`);
    });
});

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const DOC_ASSETS_DIR = path.join(process.cwd(), 'doc-assets');
const INPUT_IMAGES_DIR = path.join(DOC_ASSETS_DIR, 'input_images');
const GENERATED_DOCS_DIR = path.join(DOC_ASSETS_DIR, 'generated_docs');
const IMAGES_OUTPUT_DIR = path.join(GENERATED_DOCS_DIR, 'images');

test.describe('Documentation Generation', () => {
    test.beforeAll(async () => {
        // Ensure output directories exist
        if (!fs.existsSync(IMAGES_OUTPUT_DIR)) {
            fs.mkdirSync(IMAGES_OUTPUT_DIR, { recursive: true });
        }
    });

    test('generate tutorial pdf', async ({ page }) => {
        console.log('--- STARTING TEST ---');

        // 1. Check for input images
        if (!fs.existsSync(INPUT_IMAGES_DIR)) {
            console.log('Input images directory not found. Skipping docs generation.');
            return;
        }
        let files = fs.readdirSync(INPUT_IMAGES_DIR).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
        if (files.length === 0) {
            console.log('No images found in doc-assets/input_images. Skipping.');
            return;
        }

        // Prioritize mouse.png if it exists
        const mouseFile = files.find(f => f.toLowerCase() === 'mouse.png');
        if (mouseFile) {
            files = [mouseFile, ...files.filter(f => f !== mouseFile)];
        }

        console.log(`Found ${files.length} images to test with. Leader: ${files[0]}`);

        const sidebarFiles = files.slice(0, Math.max(1, Math.floor(files.length / 2)));
        const canvasFiles = files.slice(Math.max(1, Math.floor(files.length / 2)));
        const sidebarPaths = sidebarFiles.map(f => path.join(INPUT_IMAGES_DIR, f));
        const canvasPaths = (canvasFiles.length > 0 ? canvasFiles : sidebarFiles).map(f => path.join(INPUT_IMAGES_DIR, f));

        // --- CAPTURE PHASE ---

        console.log('--- Loading App ---');
        await page.goto('/');
        await expect(page.locator('h1')).toContainText('Sticker Sheet Creator');

        // Step 1: Upload to Sidebar
        console.log('--- Uploading to Sidebar ---');
        const sidebarInput = page.locator('.sidebar .dropzone input');

        if (await sidebarInput.count() > 0) {
            await sidebarInput.setInputFiles(sidebarPaths);
        } else {
            await page.locator('input[type="file"]').first().setInputFiles(sidebarPaths);
        }

        console.log('--- Waiting for Sidebar Images ---');
        await expect(page.locator('.image-card')).toHaveCount(sidebarFiles.length);

        console.log('--- Taking Screenshot 1 ---');
        const sidebar = page.locator('.sidebar');
        const sc1Path = path.join(IMAGES_OUTPUT_DIR, 'step1-sidebar-upload.jpg');
        await sidebar.screenshot({ path: sc1Path, type: 'jpeg', quality: 80 });

        // Step 1.5: Drop to Main Canvas
        console.log('--- Uploading to Canvas ---');
        const canvasInput = page.locator('.preview-area input[type="file"]');
        if (await canvasInput.count() > 0) {
            await canvasInput.setInputFiles(canvasPaths);
        }

        console.log('--- Waiting for All Images ---');
        const totalImages = sidebarFiles.length + (canvasFiles.length > 0 ? canvasFiles.length : sidebarFiles.length);
        await expect(page.locator('.image-card')).toHaveCount(totalImages);

        console.log('--- Taking Screenshot 2 ---');
        const scDragPath = path.join(IMAGES_OUTPUT_DIR, 'step1-canvas-drop.jpg');
        await page.screenshot({ path: scDragPath, type: 'jpeg', quality: 80 });

        // Step 2: Modify Images
        console.log('--- Opening Editor ---');
        const firstItem = page.locator('.image-card').first();
        const editBtn = firstItem.locator('button').first();
        await editBtn.click();

        console.log('--- Waiting for Modal ---');
        const modal = page.locator('.modal');
        await expect(modal).toBeVisible();
        await page.waitForTimeout(500);

        // State 1: Before Rotation
        console.log('--- Screenshot: Rotate Before ---');
        const scRotateBefore = path.join(IMAGES_OUTPUT_DIR, 'step2-rotate-before.jpg');
        await modal.screenshot({ path: scRotateBefore, type: 'jpeg', quality: 80 });

        // Action: Rotate 90 degrees (click +90 once)
        console.log('--- Rotating 90 ---');
        const rotateBtn = modal.locator('.btn-icon[title*="Rotate +90"]').first();
        if (await rotateBtn.isVisible()) {
            await rotateBtn.click();
            await page.waitForTimeout(500);
        }

        // State 2: After Rotation
        console.log('--- Screenshot: Rotate After ---');
        const scRotateAfter = path.join(IMAGES_OUTPUT_DIR, 'step2-rotate-after.jpg');
        await modal.screenshot({ path: scRotateAfter, type: 'jpeg', quality: 80 });

        // Action: 2 Slots
        console.log('--- Changing Slots ---');
        const fullSizeBtn = modal.getByText('2 Slots');
        if (await fullSizeBtn.isVisible()) await fullSizeBtn.click();
        await page.waitForTimeout(500);

        // Screenshot: 2 Slots (After)
        console.log('--- Screenshot: Slots 2 ---');
        const scSlots2 = path.join(IMAGES_OUTPUT_DIR, 'step2-slots-2.jpg');
        await modal.screenshot({ path: scSlots2, type: 'jpeg', quality: 80 });

        console.log('--- Saving Changes ---');
        await modal.getByText('Save Changes').click();
        await expect(modal).toBeHidden();

        console.log('--- Taking Screenshot 4 ---');
        const headerActions = page.locator('.actions');
        const sc3Path = path.join(IMAGES_OUTPUT_DIR, 'step3-4-exports.jpg');
        await headerActions.screenshot({ path: sc3Path, type: 'jpeg', quality: 80 });

        // --- GENERATE PDF PHASE ---
        console.log('--- Preparing PDF Content ---');

        const imgToBase64 = (p) => {
            if (!fs.existsSync(p)) return '';
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
                header { margin-bottom: 3rem; border-bottom: 2px solid #e5e7eb; padding-bottom: 2rem; }
                h1 { color: #111827; font-size: 2.25rem; font-weight: 700; margin-bottom: 1rem; }
                .intro-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }
                .intro-box h3 { color: #0369a1; margin-top: 0; margin-bottom: 0.5rem; }
                .intro-steps { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.5rem; }
                .intro-steps li { display: flex; align-items: center; gap: 0.5rem; color: #0c4a6e; font-weight: 500; }
                .intro-steps li::before { content: '✓'; color: #0ea5e9; font-weight: bold; }
                
                .step { margin-bottom: 3rem; break-inside: avoid; }
                .step h2 { color: #2563eb; font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem; display: flex; align-items: center; }
                .step h2 .number { background: #2563eb; color: white; width: 2rem; height: 2rem; border-radius: 50%; display: flex; align-items: center; justifyContent: center; margin-right: 0.75rem; font-size: 1rem; }
                
                .comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
                .img-wrapper { position: relative; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
                .img-wrapper img.main-img { width: 100%; display: block; }
                .img-wrapper p { margin: 0; padding: 0.5rem; background: #f9fafb; font-size: 0.875rem; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; }
                
                .screenshot-container { margin-top: 1.5rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); display: block; max-width: 100%; }
                .screenshot { display: block; width: 100%; height: auto; }
                
                footer { margin-top: 4rem; text-align: center; font-size: 0.875rem; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 1rem; }
            </style>
        </head>
        <body>
            <header>
                <h1>Sticker Sheet Creator Guide</h1>
                <p>Create professional A4 sticker sheets in minutes.</p>
            </header>

            <div class="intro-box">
                <h3>Quick Overview</h3>
                <p>Generating a sticker page is easy. Just follow these 4 main steps:</p>
                <ul class="intro-steps">
                    <li>1. Upload Images</li>
                    <li>2. Modify & Adjust</li>
                    <li>3. Export PDF</li>
                    <li>4. Save Project (ZIP)</li>
                </ul>
            </div>

            <div class="step">
                <h2><span class="number">1</span> Upload Images</h2>
                <p>You can drag and drop your images into the <strong>Sidebar</strong> list, OR drop them directly onto the <strong>Main Preview Page</strong>.</p>
                <div class="screenshot-container">
                    <img class="screenshot" src="${imgToBase64(scDragPath)}" alt="Drag and Drop to Canvas" />
                </div>
            </div>

            <div class="step">
                <h2><span class="number">2</span> Modify Images</h2>
                <p>Click on any sticker to open the <strong>Editor Modal</strong>. Here you have full control.</p>

                <h3>Rotation & Sizing</h3>
                <p>Use the rotation buttons or slider to align your sticker.</p>
                <div class="comparison">
                    <div class="img-wrapper">
                        <img class="main-img" src="${imgToBase64(scRotateBefore)}" />
                        <p>1. Edit Mouse</p>
                    </div>
                    <div class="img-wrapper">
                        <img class="main-img" src="${imgToBase64(scRotateAfter)}" />
                        <p>2. Rotate Mouse</p>
                    </div>
                </div>

                <h3 style="margin-top: 2rem;">Expanded View</h3>
                <p>Switch to <strong>2 Slots</strong> (Full Width).</p>
                <div class="screenshot-container">
                     <img class="screenshot" src="${imgToBase64(scSlots2)}" alt="2 Slots View" />
                </div>
            </div>

            <div class="step">
                <h2><span class="number">3</span> Export PDF and Print</h2>
                <p>Once arranged, click the <strong>Export PDF</strong> button.</p>
            </div>

            <div class="step">
                <h2><span class="number">4</span> Export ZIP (Optional)</h2>
                <p>Save your project as a ZIP file to restore it later.</p>
                <div class="screenshot-container" style="max-width: 600px;">
                    <img class="screenshot" src="${imgToBase64(sc3Path)}" alt="Export Buttons" />
                </div>
            </div>

            <footer>
                Generated automatically on ${new Date().toLocaleDateString()}
            </footer>
        </body>
        </html>
        `;

        console.log('--- Setting HTML Content ---');
        await page.setContent(htmlContent);

        console.log('--- Printing PDF ---');
        const pdfPath = path.join(GENERATED_DOCS_DIR, 'Sticker_Generator_User_Guide.pdf');
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' }
        });

        console.log(`PDF documentation generated at: ${pdfPath}`);
    });
});

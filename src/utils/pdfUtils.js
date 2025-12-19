// Constants defined locally for now to avoid dependency issues during refactor

// Making constants local for now to avoid circular dependency mess until we clean up.
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const STICKER_W = 68;
const STICKER_H = 47;
const SLOT_W = STICKER_W / 2; // 34
const SLOT_H = STICKER_H; // 47
const COLS = 3;
const ROWS = 6;
const GRID_WIDTH = COLS * STICKER_W;
const GRID_HEIGHT = ROWS * STICKER_H;
const MARGIN_X = (A4_WIDTH_MM - GRID_WIDTH) / 2;
const MARGIN_Y = (A4_HEIGHT_MM - GRID_HEIGHT) / 2;

// Scale Factor for 300 DPI
const SCALE_FACTOR = 11.8;

export const optimizeImageForPDF = (base64Str, targetW, targetH, bgColor = '#ffffff', fitMode = 'cover') => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const pixelW = Math.ceil(targetW * SCALE_FACTOR); // Target Width in Pixels
            const pixelH = Math.ceil(targetH * SCALE_FACTOR); // Target Height in Pixels

            canvas.width = pixelW;
            canvas.height = pixelH;
            const ctx = canvas.getContext('2d');

            // Fill background
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, pixelW, pixelH);

            const sourceAspect = img.width / img.height;
            const targetAspect = pixelW / pixelH;

            let dx = 0, dy = 0, dWidth = pixelW, dHeight = pixelH;
            let sx, sy, sWidth, sHeight;

            if (fitMode === 'contain') {
                // --- Full Length / Fit (Contain) ---
                if (sourceAspect > targetAspect) {
                    dWidth = pixelW;
                    dHeight = pixelW / sourceAspect;
                    dy = (pixelH - dHeight) / 2;
                } else {
                    dHeight = pixelH;
                    dWidth = pixelH * sourceAspect;
                    dx = (pixelW - dWidth) / 2;
                }
                ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dWidth, dHeight);

            } else {
                // --- Default (Cover) ---
                if (sourceAspect > targetAspect) {
                    sHeight = img.height;
                    sWidth = img.height * targetAspect;
                    sx = (img.width - sWidth) / 2;
                    sy = 0;
                } else {
                    sWidth = img.width;
                    sHeight = img.width / targetAspect;
                    sx = 0;
                    sy = (img.height - sHeight) / 2;
                }
                ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, pixelW, pixelH);
            }

            // Return compressed JPEG
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
    });
};

export const generatePDF = async (images) => {
    // Dynamic import
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // 1. Pack Cells (Logic must match StickerSheet)
    const cells = [];
    let pendingHalf = null;

    images.forEach(img => {
        const src = img.croppedSrc || img.src;
        // We need to keep the image object to access id/bg/fitMode
        const item = { ...img, displaySrc: src };

        for (let i = 0; i < img.quantity; i++) {
            if (img.stickerSize === 'full') {
                if (pendingHalf) {
                    cells.push({ type: 'split', left: pendingHalf, right: null });
                    pendingHalf = null;
                }
                cells.push({ type: 'full', item: item });
            } else {
                if (pendingHalf) {
                    cells.push({ type: 'split', left: pendingHalf, right: item });
                    pendingHalf = null;
                } else {
                    pendingHalf = item;
                }
            }
        }
    });
    if (pendingHalf) {
        cells.push({ type: 'split', left: pendingHalf, right: null });
    }

    // 2. Pre-process unique images to optimize size
    // We need to process for correct sizes. 
    // If an image is used as BOTH Full and Half (possible?), we need two cache entries.
    // So key = id + sizeType
    const processedImages = new Map(); // "id-half" -> base64, "id-full" -> base64

    for (const cell of cells) {
        const itemsToProcess = [];
        if (cell.type === 'full') itemsToProcess.push({ ...cell.item, targetType: 'full' });
        else {
            if (cell.left) itemsToProcess.push({ ...cell.left, targetType: 'half' });
            if (cell.right) itemsToProcess.push({ ...cell.right, targetType: 'half' });
        }

        for (const item of itemsToProcess) {
            const cacheKey = `${item.id}-${item.targetType}`;
            if (!processedImages.has(cacheKey)) {
                const src = item.croppedSrc || item.src;
                const bg = item.backgroundColor || '#ffffff';
                const fitMode = item.croppedSrc ? 'cover' : (item.fitMode || 'cover');

                // Determine target size
                const tW = item.targetType === 'full' ? STICKER_W : SLOT_W;
                const tH = STICKER_H;

                const optimized = await optimizeImageForPDF(src, tW, tH, bg, fitMode);
                processedImages.set(cacheKey, optimized);
            }
        }
    }


    // 3. Draw Cells
    const CELLS_PER_PAGE = ROWS * COLS; // 18

    cells.forEach((cell, idx) => {
        // --- Multipage Logic ---
        if (idx > 0 && idx % CELLS_PER_PAGE === 0) {
            doc.addPage();
        }

        // Calculate Position on CURRENT page
        const idxOnPage = idx % CELLS_PER_PAGE;
        const row = Math.floor(idxOnPage / COLS);
        const col = idxOnPage % COLS;

        const xBase = MARGIN_X + (col * STICKER_W);
        const yBase = MARGIN_Y + (row * STICKER_H);

        if (cell.type === 'full') {
            const cacheKey = `${cell.item.id}-full`;
            const src = processedImages.get(cacheKey);
            // Draw Full Image
            doc.addImage(src, 'JPEG', xBase, yBase, STICKER_W, STICKER_H, undefined, 'FAST');
        } else {
            // Left
            if (cell.left) {
                const src = processedImages.get(`${cell.left.id}-half`);
                doc.addImage(src, 'JPEG', xBase, yBase, SLOT_W, SLOT_H, undefined, 'FAST');
            }
            // Right
            if (cell.right) {
                const src = processedImages.get(`${cell.right.id}-half`);
                doc.addImage(src, 'JPEG', xBase + SLOT_W, yBase, SLOT_W, SLOT_H, undefined, 'FAST');
            }

            // Cut line (only if split)
            doc.setDrawColor(200, 200, 200);
            doc.setLineDash([1, 1], 0);
            doc.line(xBase + SLOT_W, yBase, xBase + SLOT_W, yBase + SLOT_H);
        }
    });

    doc.save('stickers.pdf');
};

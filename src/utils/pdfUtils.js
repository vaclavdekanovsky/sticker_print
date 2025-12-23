// Helper to calculate grid dimensions based on config
const getGridDimensions = (config) => {
    // Default to Avery 6x3 if no config
    const c = config || {
        cols: 3, rows: 6,
        margins: { top: 7.5, bottom: 7.5, left: 3, right: 3 },
        gaps: { x: 0, y: 0 },
        slotCount: 2,
        slotDirection: 'vertical'
    };

    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;

    // Calculate Cell Dimensions
    const effectiveW = A4_WIDTH_MM - (c.margins?.left || 0) - (c.margins?.right || 0);
    const effectiveH = A4_HEIGHT_MM - (c.margins?.top || 0) - (c.margins?.bottom || 0);
    const totalGapX = ((c.cols || 3) - 1) * (c.gaps?.x || 0);
    const totalGapY = ((c.rows || 6) - 1) * (c.gaps?.y || 0);

    const cellWidth = (effectiveW - totalGapX) / (c.cols || 3);
    const cellHeight = (effectiveH - totalGapY) / (c.rows || 6);

    return {
        COLS: c.cols || 3,
        ROWS: c.rows || 6,
        MARGIN_X: c.margins?.left || 0,
        MARGIN_Y: c.margins?.top || 0,
        GAP_X: c.gaps?.x || 0,
        GAP_Y: c.gaps?.y || 0,
        CELL_W: cellWidth,
        CELL_H: cellHeight,
        SLOT_COUNT: c.slotCount || 2,
        SLOT_DIR: c.slotDirection || 'vertical'
    };
};

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

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

export const generatePDF = async (images, paperConfig) => {
    // Dynamic import
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const grid = getGridDimensions(paperConfig);
    const { COLS, ROWS, MARGIN_X, MARGIN_Y, GAP_X, GAP_Y, CELL_W, CELL_H, SLOT_COUNT, SLOT_DIR } = grid;

    // Calculate Slot Dimensions
    let SLOT_W, SLOT_H;
    if (SLOT_COUNT === 1) {
        SLOT_W = CELL_W;
        SLOT_H = CELL_H;
    } else {
        // 2 Slots
        if (SLOT_DIR === 'horizontal') {
            SLOT_W = CELL_W;
            SLOT_H = CELL_H / 2;
        } else {
            SLOT_W = CELL_W / 2;
            SLOT_H = CELL_H;
        }
    }

    // 1. Pack Cells (Logic must match StickerSheet)
    const cells = [];
    let pendingHalf = null;

    images.forEach(img => {
        const src = img.croppedSrc || img.src;
        // We need to keep the image object to access id/bg/fitMode
        const item = { ...img, displaySrc: src };

        for (let i = 0; i < img.quantity; i++) {
            // "1 Slot" config or "Full" sticker size -> Takes Whole Cell
            // Note: If config says 1 slot, everything is "Full Cell".
            // If config says 2 slots, "full" sticker size means "Whole Cell".
            const isFullCell = SLOT_COUNT === 1 || img.stickerSize === 'full';

            if (isFullCell) {
                if (pendingHalf) {
                    cells.push({ type: 'split', slot1: pendingHalf, slot2: null });
                    pendingHalf = null;
                }
                cells.push({ type: 'full', item: item });
            } else {
                if (pendingHalf) {
                    cells.push({ type: 'split', slot1: pendingHalf, slot2: item });
                    pendingHalf = null;
                } else {
                    pendingHalf = item;
                }
            }
        }
    });

    if (pendingHalf) {
        cells.push({ type: 'split', slot1: pendingHalf, slot2: null });
    }

    // 2. Pre-process unique images to optimize size
    const processedImages = new Map(); // "id-half" -> base64, "id-full" -> base64

    for (const cell of cells) {
        const itemsToProcess = [];
        if (cell.type === 'full') itemsToProcess.push({ ...cell.item, targetType: 'full' });
        else {
            if (cell.slot1) itemsToProcess.push({ ...cell.slot1, targetType: 'half' });
            if (cell.slot2) itemsToProcess.push({ ...cell.slot2, targetType: 'half' });
        }

        for (const item of itemsToProcess) {
            const cacheKey = `${item.id}-${item.targetType}`;
            if (!processedImages.has(cacheKey)) {
                const src = item.croppedSrc || item.src;
                const bg = item.backgroundColor || '#ffffff';
                const fitMode = item.croppedSrc ? 'cover' : (item.fitMode || 'cover');

                // Determine target size
                const tW = item.targetType === 'full' ? CELL_W : SLOT_W;
                const tH = item.targetType === 'full' ? CELL_H : SLOT_H;

                const optimized = await optimizeImageForPDF(src, tW, tH, bg, fitMode);
                processedImages.set(cacheKey, optimized);
            }
        }
    }


    // 3. Draw Cells
    const CELLS_PER_PAGE = ROWS * COLS;

    cells.forEach((cell, idx) => {
        // --- Multipage Logic ---
        if (idx > 0 && idx % CELLS_PER_PAGE === 0) {
            doc.addPage();
        }

        // Calculate Position on CURRENT page
        const idxOnPage = idx % CELLS_PER_PAGE;
        const row = Math.floor(idxOnPage / COLS);
        const col = idxOnPage % COLS;

        // Position of the CELL (top-left)
        // With Gaps: margin + col*(cell+gap)
        const xBase = MARGIN_X + (col * (CELL_W + GAP_X));
        const yBase = MARGIN_Y + (row * (CELL_H + GAP_Y));

        if (cell.type === 'full') {
            const cacheKey = `${cell.item.id}-full`;
            const src = processedImages.get(cacheKey);
            // Draw Full Image
            doc.addImage(src, 'JPEG', xBase, yBase, CELL_W, CELL_H, undefined, 'FAST');
        } else {
            // Split Cell
            // Slot 1
            if (cell.slot1) {
                const src = processedImages.get(`${cell.slot1.id}-half`);
                // Slot 1 is always Top-Left
                doc.addImage(src, 'JPEG', xBase, yBase, SLOT_W, SLOT_H, undefined, 'FAST');
            }

            // Slot 2
            if (cell.slot2) {
                const src = processedImages.get(`${cell.slot2.id}-half`);
                // Slot 2 Position Check
                let xOffset = 0;
                let yOffset = 0;

                if (SLOT_DIR === 'horizontal') {
                    // Top / Bottom
                    yOffset = SLOT_H;
                } else {
                    // Left / Right
                    xOffset = SLOT_W;
                }

                doc.addImage(src, 'JPEG', xBase + xOffset, yBase + yOffset, SLOT_W, SLOT_H, undefined, 'FAST');
            }

            // Cut line (only if split)
            doc.setDrawColor(200, 200, 200);
            doc.setLineDash([1, 1], 0);

            if (SLOT_DIR === 'horizontal') {
                // Horizontal Line
                doc.line(xBase, yBase + SLOT_H, xBase + CELL_W, yBase + SLOT_H);
            } else {
                // Vertical Line
                doc.line(xBase + SLOT_W, yBase, xBase + SLOT_W, yBase + CELL_H);
            }
        }
    });

    doc.save('stickers.pdf');
};

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

export const optimizeImageForPDF = (base64Str, bgColor = '#ffffff') => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const pixelW = Math.ceil(SLOT_W * SCALE_FACTOR);
            const pixelH = Math.ceil(SLOT_H * SCALE_FACTOR);

            canvas.width = pixelW;
            canvas.height = pixelH;
            const ctx = canvas.getContext('2d');

            // Fill background
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, pixelW, pixelH);

            // Draw and resize
            ctx.drawImage(img, 0, 0, pixelW, pixelH);

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

    // 1. Pre-process unique images to optimize size
    const uniqueProcessedImages = new Map(); // id -> optimizedBase64

    // Iterate
    for (const img of images) {
        if (!uniqueProcessedImages.has(img.id)) {
            const src = img.croppedSrc || img.src;
            const bg = img.backgroundColor || '#ffffff';
            const optimized = await optimizeImageForPDF(src, bg);
            uniqueProcessedImages.set(img.id, optimized);
        }
    }

    // 2. Flatten slots
    const slots = [];
    images.forEach(img => {
        const optimizedSrc = uniqueProcessedImages.get(img.id);
        for (let k = 0; k < img.quantity; k++) slots.push(optimizedSrc);
    });

    // Draw
    slots.forEach((src, idx) => {
        if (idx >= (ROWS * COLS * 2)) return; // Max page capacity

        // Calculate Position
        const gridIdx = Math.floor(idx / 2);
        const isRightSide = idx % 2 === 1;

        const row = Math.floor(gridIdx / COLS);
        const col = gridIdx % COLS;

        const xBase = MARGIN_X + (col * STICKER_W);
        const yBase = MARGIN_Y + (row * STICKER_H);

        const x = isRightSide ? xBase + SLOT_W : xBase;
        const y = yBase;

        doc.addImage(src, 'JPEG', x, y, SLOT_W, SLOT_H, undefined, 'FAST');

        // Cut lines
        doc.setDrawColor(200, 200, 200);
        doc.setLineDash([1, 1], 0);
        if (isRightSide) {
            doc.line(x, y, x, y + SLOT_H);
        }
    });

    doc.save('stickers.pdf');
};

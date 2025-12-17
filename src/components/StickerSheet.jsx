/* eslint-disable react/prop-types */
import { useMemo } from 'react';
import './StickerSheet.css';

// Dimensions in mm
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

// Sticker configuration (User Provided)
const STICKER_WIDTH_MM = 68;
const STICKER_HEIGHT_MM = 47;
const COLS = 3;
const ROWS = 6;

// Margins (Calculated to center the grid)
const GRID_WIDTH = COLS * STICKER_WIDTH_MM; // 204mm
// const GRID_HEIGHT = ROWS * STICKER_HEIGHT_MM; // 282mm
const MARGIN_X = (A4_WIDTH_MM - GRID_WIDTH) / 2; // 3mm
const MARGIN_Y_COMBINED = A4_HEIGHT_MM - (ROWS * STICKER_HEIGHT_MM); // 15mm total
const MARGIN_Y_TOP = MARGIN_Y_COMBINED / 2;

// CSS units (using mm generally works in print, but for screen we scale)
const SCALE = 0.5; // Scale down for screen preview

export default function StickerSheet({ images }) {

    // Create a flat list of slots to fill
    const slots = useMemo(() => {
        const flatList = [];
        images.forEach(img => {
            // Use processed (cropped) image if available, else original
            const src = img.croppedSrc || img.src;
            for (let i = 0; i < img.quantity; i++) {
                flatList.push({ ...img, displaySrc: src });
            }
        });
        return flatList;
    }, [images]);

    const SLOTS_PER_PAGE = 36; // 18 stickers * 2 slots
    const CELLS_PER_PAGE = 18; // 3 cols * 6 rows

    // Calculate how many pages we need
    // If 0 slots, we still show 1 empty page
    const totalPages = Math.max(1, Math.ceil(slots.length / SLOTS_PER_PAGE));

    const pages = [];
    for (let p = 0; p < totalPages; p++) {
        const pageStickers = [];
        const pageStartSlot = p * SLOTS_PER_PAGE;

        // For each cell in the grid (18 cells)
        for (let i = 0; i < CELLS_PER_PAGE; i++) {
            const slotIndexBase = pageStartSlot + (i * 2);
            const leftImg = slots[slotIndexBase];
            const rightImg = slots[slotIndexBase + 1];
            pageStickers.push({ left: leftImg, right: rightImg });
        }
        pages.push(pageStickers);
    }

    return (
        <div className="sheet-container">
            {pages.map((pageStickers, pageIdx) => (
                <div key={pageIdx} className="a4-page" id={`sticker-sheet-preview-${pageIdx}`} style={{ marginBottom: '20px' }}>
                    <div className="grid">
                        {pageStickers.map((sticker, idx) => (
                            <div key={idx} className="sticker-cell">
                                <div className="sticker-slot left">
                                    {sticker.left && <img src={sticker.left.displaySrc} alt="" />}
                                </div>
                                <div className="sticker-slot right">
                                    {sticker.right && <img src={sticker.right.displaySrc} alt="" />}
                                </div>
                                <div className="cut-line-vertical"></div>
                            </div>
                        ))}
                    </div>
                    {/* Optional Page Number */}
                    {totalPages > 1 && (
                        <div className="page-number" style={{ position: 'absolute', bottom: '5px', right: '10px', fontSize: '10px', color: '#ccc' }}>
                            Page {pageIdx + 1} / {totalPages}
                        </div>
                    )}
                </div>
            ))}

            <div className="sheet-info">
                {slots.length} slots filled ({totalPages} {totalPages === 1 ? 'page' : 'pages'})
            </div>
        </div>
    );
}

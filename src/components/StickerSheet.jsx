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

    // Total grid slots = 18 stickers * 2 photos = 36 slots
    // We need to render the Sticker Grid.
    // The Grid has 3 columns and 6 rows.
    // Each cell is a "Sticker" containing 2 slots (Left/Right).

    const stickers = [];
    for (let i = 0; i < ROWS * COLS; i++) {
        const slotIndexBase = i * 2;
        const leftImg = slots[slotIndexBase];
        const rightImg = slots[slotIndexBase + 1];
        stickers.push({ left: leftImg, right: rightImg });
    }

    return (
        <div className="sheet-container">
            <div className="a4-page" id="sticker-sheet-preview">
                <div className="grid">
                    {stickers.map((sticker, idx) => (
                        <div key={idx} className="sticker-cell">
                            <div className="sticker-slot left">
                                {sticker.left && <img src={sticker.left.displaySrc} alt="" />}
                            </div>
                            <div className="sticker-slot right">
                                {sticker.right && <img src={sticker.right.displaySrc} alt="" />}
                            </div>
                            {/* Cut lines / Decorations could go here */}
                            <div className="cut-line-vertical"></div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="sheet-info">
                {slots.length} / 36 slots filled
            </div>
        </div>
    );
}

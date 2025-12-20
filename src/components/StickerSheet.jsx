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

export default function StickerSheet({ images, onInteract }) {

    // Create a list of cells (each cell is 68x47mm, containing 1 full or 2 half stickers)
    const cells = useMemo(() => {
        const cellList = [];
        let pendingHalf = null;

        images.forEach(img => {
            // Use processed (cropped) image if available, else original
            const src = img.croppedSrc || img.src;
            const item = { ...img, displaySrc: src };

            for (let i = 0; i < img.quantity; i++) {
                if (img.stickerSize === 'full') {
                    // Full sticker takes a whole cell
                    // If we have a pending half, flush it first
                    if (pendingHalf) {
                        cellList.push({ type: 'split', left: pendingHalf, right: null });
                        pendingHalf = null;
                    }
                    cellList.push({ type: 'full', item: item });
                } else {
                    // Half sticker (default)
                    if (pendingHalf) {
                        // Pair with pending
                        cellList.push({ type: 'split', left: pendingHalf, right: item });
                        pendingHalf = null;
                    } else {
                        // Wait for a partner
                        pendingHalf = item;
                    }
                }
            }
        });

        // Flush remaining half
        if (pendingHalf) {
            cellList.push({ type: 'split', left: pendingHalf, right: null });
        }

        return cellList;
    }, [images]);

    const CELLS_PER_PAGE = 18; // 3 cols * 6 rows

    // Calculate pages
    const totalPages = Math.max(1, Math.ceil(cells.length / CELLS_PER_PAGE));

    const pages = [];
    for (let p = 0; p < totalPages; p++) {
        const pageCells = cells.slice(p * CELLS_PER_PAGE, (p + 1) * CELLS_PER_PAGE);
        pages.push(pageCells);
    }

    return (
        <div className="sheet-container">
            {pages.map((pageCells, pageIdx) => (
                <div key={pageIdx} className="a4-page" id={`sticker-sheet-preview-${pageIdx}`} style={{ marginBottom: '20px' }}>
                    <div className="grid">
                        {pageCells.map((cell, idx) => (
                            <div key={idx} className="sticker-cell" style={{ position: 'relative' }}>
                                {cell.type === 'full' ? (
                                    <div
                                        className="sticker-slot full"
                                        style={{
                                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            backgroundColor: cell.item.backgroundColor || '#ffffff'
                                        }}
                                        onClick={() => onInteract(cell.item.id)}
                                        title="Click to Edit (Full Sticker)"
                                    >
                                        <img src={cell.item.displaySrc} alt="" style={{ width: '100%', height: '100%', objectFit: cell.item.fitMode || 'cover' }} />
                                    </div>
                                ) : (
                                    <>
                                        <div
                                            className="sticker-slot left"
                                            onClick={() => cell.left && onInteract(cell.left.id)}
                                            title={cell.left ? "Click to Edit" : ""}
                                            style={{ cursor: cell.left ? 'pointer' : 'default', backgroundColor: cell.left?.backgroundColor || '#ffffff' }}
                                        >
                                            {cell.left && <img src={cell.left.displaySrc} alt="" />}
                                        </div>
                                        <div
                                            className="sticker-slot right"
                                            onClick={() => cell.right && onInteract(cell.right.id)}
                                            title={cell.right ? "Click to Edit" : ""}
                                            style={{ cursor: cell.right ? 'pointer' : 'default', backgroundColor: cell.right?.backgroundColor || '#ffffff' }}
                                        >
                                            {cell.right && <img src={cell.right.displaySrc} alt="" />}
                                        </div>
                                        <div className="cut-line-vertical"></div>
                                    </>
                                )}
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
                {images.reduce((acc, i) => acc + i.quantity, 0)} stickers ({totalPages} {totalPages === 1 ? 'page' : 'pages'})
            </div>
        </div>
    );
}

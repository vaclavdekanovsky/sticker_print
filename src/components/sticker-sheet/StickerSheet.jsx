/* eslint-disable react/prop-types */
import { useMemo } from 'react';
import './StickerSheet.css';

// Dimensions in mm (A4 Fixed for now, could be dynamic later)
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export default function StickerSheet({ images, onInteract, paperConfig }) {
    // Default config if missing (fallback)
    const config = paperConfig || {
        cols: 3, rows: 6,
        margins: { top: 7.5, bottom: 7.5, left: 3, right: 3 },
        gaps: { x: 0, y: 0 },
        slotCount: 2,
        slotDirection: 'vertical'
    };

    const { cols, rows, margins, gaps } = config;

    // Calculate Cell Dimensions
    const isLandscape = config.orientation === 'landscape';
    const pageWidth = isLandscape ? A4_HEIGHT_MM : A4_WIDTH_MM;
    const pageHeight = isLandscape ? A4_WIDTH_MM : A4_HEIGHT_MM;

    const effectiveWidth = pageWidth - margins.left - margins.right;
    const totalGapX = (cols - 1) * (gaps.x || 0);
    const cellWidth = (effectiveWidth - totalGapX) / cols;

    const effectiveHeight = pageHeight - margins.top - margins.bottom;
    const totalGapY = (rows - 1) * (gaps.y || 0);
    const cellHeight = (effectiveHeight - totalGapY) / rows;

    // Create a list of cells
    const cells = useMemo(() => {
        const cellList = [];
        let pendingHalf = null;

        images.forEach(img => {
            const src = img.croppedSrc || img.src;
            const item = { ...img, displaySrc: src };

            for (let i = 0; i < img.quantity; i++) {
                // Determine if we should treat this as a single unit or pairable unit
                const slotCount = config.slotCount || 2;
                const isFullCell = slotCount === 1 || img.stickerSize === 'full';

                if (isFullCell) {
                    // Full sticker takes a whole cell
                    if (pendingHalf) {
                        cellList.push({ type: 'split', slot1: pendingHalf, slot2: null });
                        pendingHalf = null;
                    }
                    cellList.push({ type: 'full', item: item });
                } else {
                    // Half sticker (share a cell)
                    if (pendingHalf) {
                        cellList.push({ type: 'split', slot1: pendingHalf, slot2: item });
                        pendingHalf = null;
                    } else {
                        pendingHalf = item;
                    }
                }
            }
        });

        if (pendingHalf) {
            cellList.push({ type: 'split', slot1: pendingHalf, slot2: null });
        }

        return cellList;
    }, [images, config]);

    const CELLS_PER_PAGE = cols * rows;
    const totalPages = Math.max(1, Math.ceil(cells.length / CELLS_PER_PAGE));

    const pages = [];
    for (let p = 0; p < totalPages; p++) {
        const pageCells = cells.slice(p * CELLS_PER_PAGE, (p + 1) * CELLS_PER_PAGE);
        pages.push(pageCells);
    }

    const slotDir = config.slotDirection || 'vertical';

    return (
        <div className="sheet-container">
            {pages.map((pageCells, pageIdx) => (
                <div
                    key={pageIdx}
                    className={`a4-page ${isLandscape ? 'landscape' : ''}`}
                    id={`sticker-sheet-preview-${pageIdx}`}
                    style={{
                        marginBottom: '20px',
                        paddingTop: `${margins.top}mm`,
                        paddingBottom: `${margins.bottom}mm`,
                        paddingLeft: `${margins.left}mm`,
                        paddingRight: `${margins.right}mm`,
                    }}
                >
                    <div
                        className="grid"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${cols}, ${cellWidth}mm)`,
                            gridTemplateRows: `repeat(${rows}, ${cellHeight}mm)`,
                            columnGap: gaps.x > 0 ? `${gaps.x}mm` : '0',
                            rowGap: gaps.y > 0 ? `${gaps.y}mm` : '0',
                            justifyItems: 'stretch',
                            alignItems: 'stretch',
                            width: 'fit-content',
                            height: 'fit-content',
                            margin: '0 auto',
                        }}
                    >
                        {pageCells.map((cell, idx) => (
                            <div
                                key={idx}
                                className={`sticker-cell ${slotDir}`} // Add class for CSS targeting
                                style={{
                                    position: 'relative',
                                    width: `${cellWidth}mm`,
                                    height: `${cellHeight}mm`
                                }}
                            >
                                {cell.type === 'full' ? (
                                    <div
                                        className="sticker-slot full"
                                        style={{
                                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            backgroundColor: cell.item.backgroundColor || '#ffffff'
                                        }}
                                        onClick={() => onInteract(cell.item.id)}
                                        title="Click to Edit"
                                    >
                                        <img src={cell.item.displaySrc} alt="" style={{ width: '100%', height: '100%', objectFit: cell.item.fitMode || 'cover', transform: `scale(${cell.item.croppedSrc ? 1 : (cell.item.zoom || 1)})` }} />
                                    </div>
                                ) : (
                                    <>
                                        {/* Abstracted Slots: slot1 (Top/Left) and slot2 (Bottom/Right) */}
                                        <div
                                            className="sticker-slot slot-1"
                                            onClick={() => cell.slot1 && onInteract(cell.slot1.id)}
                                            title={cell.slot1 ? "Click to Edit" : ""}
                                            style={{ cursor: cell.slot1 ? 'pointer' : 'default', backgroundColor: cell.slot1?.backgroundColor || '#ffffff' }}
                                        >
                                            {cell.slot1 && <img src={cell.slot1.displaySrc} alt="" style={{ width: '100%', height: '100%', objectFit: cell.slot1.fitMode || 'cover', transform: `scale(${cell.slot1.croppedSrc ? 1 : (cell.slot1.zoom || 1)})` }} />}
                                        </div>
                                        <div
                                            className="sticker-slot slot-2"
                                            onClick={() => cell.slot2 && onInteract(cell.slot2.id)}
                                            title={cell.slot2 ? "Click to Edit" : ""}
                                            style={{ cursor: cell.slot2 ? 'pointer' : 'default', backgroundColor: cell.slot2?.backgroundColor || '#ffffff' }}
                                        >
                                            {cell.slot2 && <img src={cell.slot2.displaySrc} alt="" style={{ width: '100%', height: '100%', objectFit: cell.slot2.fitMode || 'cover', transform: `scale(${cell.slot2.croppedSrc ? 1 : (cell.slot2.zoom || 1)})` }} />}
                                        </div>
                                        {/* Dynamic Cut Line */}
                                        <div className={slotDir === 'horizontal' ? 'cut-line-horizontal' : 'cut-line-vertical'}></div>
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
                {images.reduce((acc, i) => acc + i.quantity, 0)} images • {totalPages} {totalPages === 1 ? 'page' : 'pages'} • {cols}x{rows} Grid
            </div>
        </div>
    );
}

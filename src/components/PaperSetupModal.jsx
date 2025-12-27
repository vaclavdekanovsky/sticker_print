import { useState, useEffect } from 'react';
import { PAPER_PRESETS } from '../config/paperPresets';
import './PaperSetupModal.css';

export default function PaperSetupModal({ config, onSave, onCancel, isOpen }) {
    const [localConfig, setLocalConfig] = useState(config);

    // Update local state when prop changes
    useEffect(() => {
        if (isOpen) {
            setLocalConfig(config);
        }
    }, [config, isOpen]);

    const handleChange = (field, value) => {
        setLocalConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleMarginChange = (side, value) => {
        setLocalConfig(prev => ({
            ...prev,
            margins: { ...prev.margins, [side]: parseFloat(value) || 0 }
        }));
    };

    const handleGapChange = (axis, value) => {
        setLocalConfig(prev => ({
            ...prev,
            gaps: { ...prev.gaps, [axis]: parseFloat(value) || 0 }
        }));
    };

    const handleOrientationChange = (newOrientation) => {
        const oldOrientation = localConfig.orientation || 'portrait';
        if (newOrientation === oldOrientation) return;

        // Physical Rotation Logic (Clockwise 90deg or back)
        setLocalConfig(prev => {
            const { cols, rows, gaps, margins } = prev;

            // Swap Cols/Rows and Gaps
            const newCols = rows;
            const newRows = cols;
            const newGaps = { x: gaps.y, y: gaps.x };

            // Rotate Margins (Clockwise 90deg map)
            // New Top = Old Left
            // New Right = Old Top
            // New Bottom = Old Right
            // New Left = Old Bottom
            let newMargins;
            if (newOrientation === 'landscape') {
                // Portrait -> Landscape (CW)
                newMargins = {
                    top: margins.left,
                    right: margins.top,
                    bottom: margins.right,
                    left: margins.bottom
                };
            } else {
                // Landscape -> Portrait (CCW)
                // New Top = Old Right
                // New Right = Old Bottom
                // New Bottom = Old Left
                // New Left = Old Top
                newMargins = {
                    top: margins.right,
                    right: margins.bottom,
                    bottom: margins.left,
                    left: margins.top
                };
            }

            return {
                ...prev,
                orientation: newOrientation,
                cols: newCols,
                rows: newRows,
                gaps: newGaps,
                margins: newMargins
            };
        });
    };

    const applyPreset = (presetName) => {
        const preset = PAPER_PRESETS[presetName];
        if (preset) {
            let configToApply = { ...preset };

            // If currently in Landscape, rotate the preset
            if (localConfig.orientation === 'landscape') {
                const { cols, rows, gaps, margins } = configToApply;
                configToApply.cols = rows;
                configToApply.rows = cols;
                configToApply.gaps = { x: gaps.y, y: gaps.x };
                configToApply.margins = {
                    top: margins.left,
                    right: margins.top,
                    bottom: margins.right,
                    left: margins.bottom
                };
            }

            setLocalConfig({ ...localConfig, ...configToApply });
        }
    };

    if (!isOpen) return null;

    // Calculate dimensions for preview info
    const isLandscape = localConfig.orientation === 'landscape';
    const pageWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;

    const effectiveWidth = pageWidth - localConfig.margins.left - localConfig.margins.right;
    const effectiveHeight = pageHeight - localConfig.margins.top - localConfig.margins.bottom;
    const totalGapX = (localConfig.cols - 1) * localConfig.gaps.x;
    const totalGapY = (localConfig.rows - 1) * localConfig.gaps.y;

    // Check for validity
    const cellW = (effectiveWidth - totalGapX) / localConfig.cols;
    const cellH = (effectiveHeight - totalGapY) / localConfig.rows;
    const isValid = cellW > 0 && cellH > 0;

    // Calculate Per-Sticker Size
    let stickerW = cellW;
    let stickerH = cellH;
    const currentSlotCount = localConfig.slotCount === undefined ? 2 : localConfig.slotCount;
    if (currentSlotCount === 2) {
        if ((localConfig.slotDirection || 'vertical') === 'vertical') {
            stickerW = cellW / 2;
        } else {
            stickerH = cellH / 2;
        }
    }

    const totalLabels = localConfig.cols * localConfig.rows;

    return (
        <div className="modal-overlay">
            <div className="paper-setup-modal">
                <div className="modal-header">
                    <h2>Paper Setup</h2>
                    <button className="close-btn" onClick={onCancel}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="form-group presets">
                        <label>Presets:</label>
                        <select
                            className="preset-select"
                            value={localConfig.id || ''}
                            onChange={(e) => applyPreset(e.target.value)}
                        >
                            <option value="">-- Choose a Preset --</option>
                            {Object.values(PAPER_PRESETS)
                                .map(p => {
                                    const pTotalLabels = p.cols * p.rows;
                                    const pIsLandscape = (p.orientation || localConfig.orientation) === 'landscape';
                                    const pPageW = pIsLandscape ? 297 : 210;
                                    const effW = pPageW - p.margins.left - p.margins.right;
                                    const tx = (p.cols - 1) * p.gaps.x;
                                    const cW = (effW - tx) / p.cols;

                                    // Use 1-slot width for naming/sorting consistency
                                    const pStickerW = cW;

                                    return { ...p, totalLabels: pTotalLabels, stickerW: pStickerW };
                                })
                                .sort((a, b) => {
                                    if (a.totalLabels !== b.totalLabels) {
                                        return a.totalLabels - b.totalLabels;
                                    }
                                    return a.stickerW - b.stickerW;
                                })
                                .map(preset => (
                                    <option key={preset.id} value={preset.id}>
                                        {preset.name} - {preset.totalLabels} Labels
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Orientation</label>
                        <select
                            value={localConfig.orientation || 'portrait'}
                            onChange={(e) => handleOrientationChange(e.target.value)}
                        >
                            <option value="portrait">Portrait (Vertical)</option>
                            <option value="landscape">Landscape (Horizontal)</option>
                        </select>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Columns</label>
                            <input
                                type="number" min="1" max="10"
                                value={localConfig.cols}
                                onChange={(e) => handleChange('cols', parseInt(e.target.value) || 1)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Rows</label>
                            <input
                                type="number" min="1" max="20"
                                value={localConfig.rows}
                                onChange={(e) => handleChange('rows', parseInt(e.target.value) || 1)}
                            />
                        </div>
                    </div>

                    <div className="total-labels-summary" style={{ textAlign: 'center', margin: '0.5rem 0', padding: '0.5rem', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2563eb' }}>
                            Total Labels: {totalLabels}
                        </span>
                    </div>

                    <fieldset>
                        <legend>Slot Configuration</legend>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Stickers per Cell</label>
                                <select
                                    value={localConfig.slotCount || 2}
                                    onChange={(e) => handleChange('slotCount', parseInt(e.target.value))}
                                >
                                    <option value={1}>1 (Single)</option>
                                    <option value={2}>2 (Double)</option>
                                </select>
                            </div>
                            {(localConfig.slotCount || 2) === 2 && (
                                <div className="form-group">
                                    <label>Split Direction</label>
                                    <select
                                        value={localConfig.slotDirection || 'vertical'}
                                        onChange={(e) => handleChange('slotDirection', e.target.value)}
                                    >
                                        <option value="vertical">Vertical (Left/Right)</option>
                                        <option value="horizontal">Horizontal (Top/Bottom)</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend>Margins (mm)</legend>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Top</label>
                                <input type="number" step="0.1" value={localConfig.margins.top} onChange={(e) => handleMarginChange('top', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Bottom</label>
                                <input type="number" step="0.1" value={localConfig.margins.bottom} onChange={(e) => handleMarginChange('bottom', e.target.value)} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Left</label>
                                <input type="number" step="0.1" value={localConfig.margins.left} onChange={(e) => handleMarginChange('left', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Right</label>
                                <input type="number" step="0.1" value={localConfig.margins.right} onChange={(e) => handleMarginChange('right', e.target.value)} />
                            </div>
                        </div>
                    </fieldset>

                    <fieldset>
                        <legend>Gaps (mm)</legend>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Horizontal (X)</label>
                                <input type="number" step="0.1" value={localConfig.gaps.x} onChange={(e) => handleGapChange('x', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Vertical (Y)</label>
                                <input type="number" step="0.1" value={localConfig.gaps.y} onChange={(e) => handleGapChange('y', e.target.value)} />
                            </div>
                        </div>
                    </fieldset>

                    <div className="preview-info" style={{ marginTop: '1rem', padding: '0.5rem', background: isValid ? '#e6fffa' : '#fff5f5', borderRadius: '4px', fontSize: '0.9rem' }}>
                        {isValid ? (
                            <div>
                                <div><strong>Grid Cell:</strong> {cellW.toFixed(1)} x {cellH.toFixed(1)} mm</div>
                                {(localConfig.slotCount || 2) === 2 && (
                                    <div style={{ marginTop: '4px', color: '#0066cc' }}>
                                        <strong>Sticker Size:</strong> {stickerW.toFixed(1)} x {stickerH.toFixed(1)} mm
                                        <span style={{ fontSize: '0.8em', marginLeft: '6px', color: '#666' }}>
                                            ({localConfig.slotDirection === 'horizontal' ? 'Top/Bottom' : 'Left/Right'})
                                        </span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <span style={{ color: 'red' }}>Invalid Dimensions: Content exceeds page size!</span>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onCancel}>Cancel</button>
                    <button className="btn-primary" onClick={() => isValid && onSave(localConfig)} disabled={!isValid}>Apply Setup</button>
                </div>
            </div>
        </div>
    );
}

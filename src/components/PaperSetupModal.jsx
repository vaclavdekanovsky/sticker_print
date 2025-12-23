import { useState, useEffect } from 'react';
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

    const applyPreset = (presetName) => {
        if (presetName === '6x3') {
            setLocalConfig({
                ...localConfig,
                id: '6x3',
                name: '6x3 Grid (68x47mm)',
                cols: 3,
                rows: 6,
                margins: { top: 7.5, bottom: 7.5, left: 3, right: 3 },
                gaps: { x: 0, y: 0 },
                slotCount: 2,
                slotDirection: 'vertical'
            });
        } else if (presetName === '2x4') {
            setLocalConfig({
                ...localConfig,
                id: '2x4',
                name: '2x4 Grid (105x74mm)',
                cols: 2,
                rows: 4,
                margins: { top: 0, bottom: 0, left: 0, right: 0 },
                gaps: { x: 0, y: 0 },
                slotCount: 2,
                slotDirection: 'vertical'
            });
        } else if (presetName === '3x8') {
            setLocalConfig({
                ...localConfig,
                id: '3x8',
                name: '3x8 Grid (70x36mm)',
                cols: 3,
                rows: 8,
                margins: { top: 4.5, bottom: 4.5, left: 0, right: 0 },
                gaps: { x: 0, y: 0 },
                slotCount: 1,
                slotDirection: 'vertical'
            });
        }
    };

    if (!isOpen) return null;

    // Calculate dimensions for preview info
    const effectiveWidth = 210 - localConfig.margins.left - localConfig.margins.right;
    const effectiveHeight = 297 - localConfig.margins.top - localConfig.margins.bottom;
    const totalGapX = (localConfig.cols - 1) * localConfig.gaps.x;
    const totalGapY = (localConfig.rows - 1) * localConfig.gaps.y;

    // Check for validity
    const cellW = (effectiveWidth - totalGapX) / localConfig.cols;
    const cellH = (effectiveHeight - totalGapY) / localConfig.rows;
    const isValid = cellW > 0 && cellH > 0;

    // Calculate Per-Sticker Size
    let stickerW = cellW;
    let stickerH = cellH;
    if ((localConfig.slotCount || 2) === 2) {
        if ((localConfig.slotDirection || 'vertical') === 'vertical') {
            stickerW = cellW / 2;
        } else {
            stickerH = cellH / 2;
        }
    }

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
                        <div className="preset-buttons">
                            <button
                                className={localConfig.id === '6x3' ? 'active' : ''}
                                onClick={() => applyPreset('6x3')}
                            >
                                6x3 (68x47mm)
                            </button>
                            <button
                                className={localConfig.id === '2x4' ? 'active' : ''}
                                onClick={() => applyPreset('2x4')}
                            >
                                2x4 (105x74mm)
                            </button>
                            <button
                                className={localConfig.id === '3x8' ? 'active' : ''}
                                onClick={() => applyPreset('3x8')}
                            >
                                3x8 (70x36mm)
                            </button>
                        </div>
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

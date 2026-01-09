import React, { useState } from 'react';

const GlobalSettingsModal = ({
    isOpen,
    onClose,
    onApplyBackground,
    onApplySize,
    onApplyZoom,
    currentGlobalBackground
}) => {
    if (!isOpen) return null;

    const [bgColor, setBgColor] = useState(currentGlobalBackground);
    const [zoomLevel, setZoomLevel] = useState(1);

    const handleApplyBg = () => {
        onApplyBackground(bgColor);
        onClose();
    };

    const handleApplyZoom = () => {
        onApplyZoom(zoomLevel);
        onClose();
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
            <div className="modal-content" style={{
                maxWidth: '400px', width: '90%',
                backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                <h2>Global Settings</h2>

                {/* Background Section */}
                <div className="setting-section" style={{ marginBottom: '1.5rem' }}>
                    <h3>Background Color</h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <input
                            type="color"
                            value={bgColor}
                            onChange={(e) => setBgColor(e.target.value)}
                        />
                        <button className="btn-primary" onClick={handleApplyBg}>Apply to All</button>
                    </div>
                </div>

                <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid #eee' }} />

                {/* Size Section */}
                <div className="setting-section" style={{ marginBottom: '1.5rem' }}>
                    <h3>Sticker Size</h3>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn-secondary" onClick={() => { onApplySize('half'); onClose(); }}>
                            Set All to 1 Slot
                        </button>
                        <button className="btn-secondary" onClick={() => { onApplySize('full'); onClose(); }}>
                            Set All to 2 Slots
                        </button>
                    </div>
                </div>

                <hr style={{ margin: '1rem 0', border: 'none', borderTop: '1px solid #eee' }} />

                {/* Zoom Section */}
                <div className="setting-section">
                    <h3>Global Zoom</h3>
                    <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                        Applying zoom will reset individual crops.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="range"
                                min={0.1}
                                max={3}
                                step={0.01}
                                value={zoomLevel}
                                onChange={(e) => setZoomLevel(Number(e.target.value))}
                                style={{ flex: 1 }}
                            />
                            <input
                                type="number"
                                min={0.1}
                                max={10}
                                step={0.01}
                                value={zoomLevel}
                                onChange={(e) => setZoomLevel(Number(e.target.value))}
                                style={{ width: '60px' }}
                            />
                        </div>
                        <button className="btn-primary" onClick={handleApplyZoom}>Apply Zoom to All</button>
                    </div>
                </div>

                <div className="modal-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default GlobalSettingsModal;

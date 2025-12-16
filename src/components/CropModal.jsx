import React from 'react';
import Cropper from 'react-easy-crop';
import { FlipHorizontal, FlipVertical } from 'lucide-react';

const CropModal = ({
    editingImage,
    crop,
    zoom,
    rotation,
    flip,
    backgroundColor,
    setCrop,
    setZoom,
    setRotation,
    setFlip,
    setBackgroundColor,
    onCropComplete,
    onCancel,
    onSave
}) => {
    if (!editingImage) return null;

    return (
        <div className="modal">
            <div className="cropper-wrapper">
                <div className="cropper-area" style={{
                    backgroundColor: backgroundColor,
                    transform: `scaleX(${flip.horizontal ? -1 : 1}) scaleY(${flip.vertical ? -1 : 1})`
                }}>
                    <Cropper
                        image={editingImage.src}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={34 / 47}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        minZoom={0.1}
                        restrictPosition={false}
                    />
                </div>
                <div className="cropper-controls">
                    <div className="control-row">
                        <label>Zoom</label>
                        <input
                            type="range"
                            value={zoom}
                            min={0.1}
                            max={3}
                            step={0.1}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="zoom-range"
                        />
                    </div>
                    <div className="control-row">
                        <label>Rotate</label>
                        <input
                            type="range"
                            value={rotation}
                            min={0}
                            max={360}
                            step={1}
                            onChange={(e) => setRotation(Number(e.target.value))}
                            className="zoom-range"
                        />
                    </div>
                    <div className="control-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <label>Background</label>
                        <input
                            type="color"
                            value={backgroundColor}
                            onChange={(e) => setBackgroundColor(e.target.value)}
                        />
                        <button onClick={() => setBackgroundColor('#ffffff')} className="btn-small">Reset White</button>
                    </div>

                    <div className="control-row" style={{ display: 'flex', gap: '1rem' }}>
                        <label>Flip</label>
                        <button
                            className={`btn-icon ${flip.horizontal ? 'active' : ''}`}
                            onClick={() => setFlip(prev => ({ ...prev, horizontal: !prev.horizontal }))}
                        >
                            <FlipHorizontal size={20} />
                        </button>
                        <button
                            className={`btn-icon ${flip.vertical ? 'active' : ''}`}
                            onClick={() => setFlip(prev => ({ ...prev, vertical: !prev.vertical }))}
                        >
                            <FlipVertical size={20} />
                        </button>
                    </div>

                    <div className="cropper-buttons">
                        <button onClick={onCancel}>Cancel</button>
                        <button className="btn-primary" onClick={onSave}>Save Crop</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CropModal;

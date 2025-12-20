import React from 'react';
import Cropper from 'react-easy-crop';
import { FlipHorizontal, FlipVertical, RotateCw, RotateCcw } from 'lucide-react';

const CropModal = ({
    editingImage,
    crop,
    zoom,
    rotation,
    flip,
    backgroundColor,
    // imgFitMode, // Removed
    stickerSize,
    quantity,
    setCrop,
    setZoom,
    setRotation,
    setFlip,
    setBackgroundColor,
    // setImgFitMode, // Removed
    setStickerSize,
    setQuantity,
    onCropComplete,
    onCancel,
    onSave
}) => {
    if (!editingImage) return null;

    const [mediaSize, setMediaSize] = React.useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
    const aspect = stickerSize === 'full' ? 68 / 47 : 34 / 47;

    const onMediaLoaded = (mediaSize) => {
        setMediaSize(mediaSize);
    };

    const handleFitHeight = () => {
        if (!mediaSize.naturalHeight) return;
        const imgAspect = mediaSize.naturalWidth / mediaSize.naturalHeight;
        // If image is taller (imgAspect < aspect), it matches Width at Zoom 1 (Cover), so Height overflows.
        // To fit Height, we must zoom out: newZoom = imgAspect / aspect.
        // If image is wider (imgAspect > aspect), it matches Height at Zoom 1 (Cover).
        const newZoom = imgAspect < aspect ? imgAspect / aspect : 1;
        setZoom(newZoom);
        setCrop({ x: 0, y: 0 }); // Optional: center it
    };

    const handleFitWidth = () => {
        if (!mediaSize.naturalWidth) return;
        const imgAspect = mediaSize.naturalWidth / mediaSize.naturalHeight;
        // If image is wider (imgAspect > aspect), it matches Height at Zoom 1 (Cover), so Width overflows.
        // To fit Width, we must zoom out: newZoom = aspect / imgAspect.
        // If image is taller (imgAspect < aspect), it matches Width at Zoom 1 (Cover).
        const newZoom = imgAspect > aspect ? aspect / imgAspect : 1;
        setZoom(newZoom);
        setCrop({ x: 0, y: 0 });
    };

    const handleCenter = () => {
        setCrop({ x: 0, y: 0 });
    };


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
                        aspect={aspect}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onMediaLoaded={onMediaLoaded}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        minZoom={0.1}
                        restrictPosition={false}
                    />
                </div>
                <div className="cropper-controls">
                    {/* Row 1: Quantity & Sticker Size */}
                    <div className="control-row" style={{ display: 'flex', gap: '3rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label style={{ minWidth: 'auto', marginRight: '0' }}>Qty</label>
                            <input
                                type="number"
                                min="1"
                                max="99"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                style={{ width: '60px', padding: '4px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label style={{ minWidth: 'auto', marginRight: '0' }}>Size</label>
                            <div style={{ display: 'flex', gap: '0.2rem' }}>
                                <button
                                    className={`btn-small ${stickerSize === 'half' ? 'active' : ''}`}
                                    onClick={() => setStickerSize('half')}
                                    style={{ background: stickerSize === 'half' ? '#646cff' : '#eee', color: stickerSize === 'half' ? 'white' : 'black' }}
                                >
                                    1 Slot
                                </button>
                                <button
                                    className={`btn-small ${stickerSize === 'full' ? 'active' : ''}`}
                                    onClick={() => setStickerSize('full')}
                                    style={{ background: stickerSize === 'full' ? '#646cff' : '#eee', color: stickerSize === 'full' ? 'white' : 'black' }}
                                >
                                    2 Slots
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Fit Mode & Flip */}
                    <div className="control-row" style={{ display: 'flex', gap: '3rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label style={{ minWidth: 'auto', marginRight: '0' }}>Actions</label>
                            <div style={{ display: 'flex', gap: '0.2rem' }}>
                                <button className="btn-small" onClick={handleFitHeight} title="Fit to Height">Fit H</button>
                                <button className="btn-small" onClick={handleFitWidth} title="Fit to Width">Fit W</button>
                                <button className="btn-small" onClick={handleCenter} title="Center Image">Center</button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label style={{ minWidth: 'auto', marginRight: '0' }}>Flip</label>
                            <div style={{ display: 'flex', gap: '0.2rem' }}>
                                <button
                                    className={`btn-icon ${flip.horizontal ? 'active' : ''}`}
                                    onClick={() => setFlip(prev => ({ ...prev, horizontal: !prev.horizontal }))}
                                    title="Flip Horizontal"
                                >
                                    <FlipHorizontal size={18} />
                                </button>
                                <button
                                    className={`btn-icon ${flip.vertical ? 'active' : ''}`}
                                    onClick={() => setFlip(prev => ({ ...prev, vertical: !prev.vertical }))}
                                    title="Flip Vertical"
                                >
                                    <FlipVertical size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 3: Background */}
                <div className="control-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label>Background</label>
                    <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                    />
                    <button onClick={() => setBackgroundColor('#ffffff')} className="btn-small">Reset White</button>
                </div>

                {/* Row 4: Zoom */}
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
                    <button className="btn-small" onClick={() => setZoom(0.1)} title="Fit Entire Image">Fit</button>
                </div>

                {/* Row 5: Rotate */}
                <div className="control-row">
                    <label>Rotate</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        <button
                            className="btn-icon"
                            onClick={() => setRotation(prev => (prev - 90 + 360) % 360)}
                            title="Rotate -90°"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button
                            className="btn-icon"
                            onClick={() => setRotation(prev => (prev + 90) % 360)}
                            title="Rotate +90°"
                        >
                            <RotateCw size={18} />
                        </button>
                        <input
                            type="range"
                            value={rotation}
                            min={0}
                            max={360}
                            step={1}
                            onChange={(e) => setRotation(Number(e.target.value))}
                            className="zoom-range"
                            style={{ flex: 1 }}
                        />
                    </div>
                </div>

                <div className="cropper-buttons">
                    <button onClick={onCancel}>Cancel</button>
                    <button className="btn-primary" onClick={onSave}>Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default CropModal;

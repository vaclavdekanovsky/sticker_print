import { useEffect, useMemo, useState } from 'react';
import Cropper from 'react-easy-crop';
import { FlipHorizontal, FlipVertical, RotateCw, RotateCcw, ScanLine } from 'lucide-react';
import { prepareOutlinedImage } from '../../utils/outlineUtils';

const CropModal = ({
    editingImage,
    paperConfig,
    crop,
    zoom,
    rotation,
    flip,
    backgroundColor,
    outline,
    onOutlineChange,
    isSaving,
    saveError,
    stickerSize,
    quantity,
    setCrop,
    setZoom,
    setRotation,
    setFlip,
    setBackgroundColor,
    setStickerSize,
    setQuantity,
    onCropComplete,
    onCancel,
    onSave
}) => {
    const [mediaSize, setMediaSize] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 });
    const [preview, setPreview] = useState(null);
    const source = editingImage?.src;
    const previewKey = JSON.stringify([source, outline]);

    useEffect(() => {
        if (!source || !outline.enabled) return;
        let cancelled = false;
        // Debounce sliders; discard stale work when settings change or close.
        const timer = setTimeout(() => {
            prepareOutlinedImage(source, outline).then(result => {
                if (!cancelled) setPreview({ ...result, key: previewKey });
            }).catch(error => {
                if (!cancelled) setPreview({ src: source, key: previewKey, error: error.message });
            });
        }, 120);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [source, outline, previewKey]);

    const processing = outline.enabled && preview?.key !== previewKey;
    const currentPreview = outline.enabled && preview?.key === previewKey ? preview : null;
    const previewSource = currentPreview?.src || source;
    const updateOutline = onOutlineChange;

    // Calculate Aspect Ratio based on Paper Config and Sticker Mode
    const aspect = useMemo(() => {
        // Default to Avery 6x3 if no config
        const config = paperConfig || {
            cols: 3, rows: 6,
            margins: { top: 7.5, bottom: 7.5, left: 3, right: 3 },
            gaps: { x: 0, y: 0 },
            slotCount: 2,
            slotDirection: 'vertical'
        };

        const isLandscape = config.orientation === 'landscape';
        const pageW = isLandscape ? 297 : 210;
        const pageH = isLandscape ? 210 : 297;

        const effectiveW = pageW - (config.margins.left || 0) - (config.margins.right || 0);
        const effectiveH = pageH - (config.margins.top || 0) - (config.margins.bottom || 0);
        const totalGapX = ((config.cols || 3) - 1) * (config.gaps?.x || 0);
        const totalGapY = ((config.rows || 6) - 1) * (config.gaps?.y || 0);

        const cellW = (effectiveW - totalGapX) / (config.cols || 3);
        const cellH = (effectiveH - totalGapY) / (config.rows || 6);

        // If Sticker Size is "Full" (2 Slots) OR Paper is configured for 1 Slot -> Use Whole Cell Ratio
        if (stickerSize === 'full' || (config.slotCount || 2) === 1) {
            return cellW / cellH;
        }

        // If Sticker Size is "1 Slot" -> Check Direction
        const slotDir = config.slotDirection || 'vertical';
        if (slotDir === 'horizontal') {
            // Horizontal Split: Top/Bottom.
            // Width is same, Height is Half.
            // Aspect = W / (H/2) = 2 * (W/H)
            return cellW / (cellH / 2);
        } else {
            // Vertical Split: Left/Right (Default)
            // Width is Half, Height is same.
            // Aspect = (W/2) / H = 0.5 * (W/H)
            return (cellW / 2) / cellH;
        }
    }, [paperConfig, stickerSize]);

    const onMediaLoaded = (mediaSize) => {
        setMediaSize(mediaSize);
    };

    const handleFitHeight = () => {
        if (!mediaSize.naturalHeight) return;
        const imgAspect = mediaSize.naturalWidth / mediaSize.naturalHeight;
        const newZoom = imgAspect < aspect ? imgAspect / aspect : 1;
        setZoom(newZoom);
        setCrop({ x: 0, y: 0 });
    };

    const handleFitWidth = () => {
        if (!mediaSize.naturalWidth) return;
        const imgAspect = mediaSize.naturalWidth / mediaSize.naturalHeight;
        const newZoom = imgAspect > aspect ? aspect / imgAspect : 1;
        setZoom(newZoom);
        setCrop({ x: 0, y: 0 });
    };

    const handleCenter = () => {
        setCrop({ x: 0, y: 0 });
    };

    // Determine Cut Line style if in 2-Slot mode (Full)
    const slotDir = paperConfig?.slotDirection || 'vertical';
    const showCutLine = stickerSize === 'full' && (paperConfig?.slotCount || 2) === 2;

    if (!editingImage) return null;

    return (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Edit sticker">
            <div className="cropper-wrapper">
                <div className="editor-heading">
                    <div><strong>Edit sticker</strong><span>{editingImage.name}</span></div>
                    <span className="editor-private">Processed locally · no uploads</span>
                </div>
                <div className="cropper-area" style={{
                    backgroundColor: backgroundColor,
                    position: 'relative' // For cut line absolute positioning
                }}>
                    <Cropper
                        image={previewSource}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        transform={`translate(${crop.x}px, ${crop.y}px) rotate(${rotation}deg) scale(${zoom}) scaleX(${flip.horizontal ? -1 : 1}) scaleY(${flip.vertical ? -1 : 1})`}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onMediaLoaded={onMediaLoaded}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        minZoom={0.1}
                        maxZoom={10}
                        restrictPosition={false}
                    />

                    {/* Visual Cut Line Overlay for "2 Slots" mode */}
                    {showCutLine && (
                        <div
                            style={{
                                position: 'absolute',
                                pointerEvents: 'none',
                                zIndex: 10,
                                opacity: 0.8,
                                ...(slotDir === 'horizontal' ? {
                                    // Horizontal Line (Left to Right, Centered Vertically)
                                    top: '50%', left: '10%', right: '10%', height: '1px',
                                    borderTop: '2px dashed rgba(255, 255, 255, 0.8)',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.5)'
                                } : {
                                    // Vertical Line (Top to Bottom, Centered Horizontally)
                                    left: '50%', top: '10%', bottom: '10%', width: '1px',
                                    borderLeft: '2px dashed rgba(255, 255, 255, 0.8)',
                                    boxShadow: '1px 0 2px rgba(0,0,0,0.5)'
                                })
                            }}
                        />
                    )}
                </div>
                <div className="cropper-controls">
                    {/* Row 1: Quantity & Sticker Size */}
                    <div className="control-row" style={{ display: 'flex', gap: '3rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label style={{ minWidth: 'auto', marginRight: '0' }}>Qty</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                style={{ width: '60px', padding: '4px' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label style={{ minWidth: 'auto', marginRight: '0' }}>Size</label>
                            <div style={{ display: 'flex', gap: '0.2rem' }}>
                                <button
                                    className={`btn-small ${stickerSize === 'half' ? 'active' : ''}`}
                                    onClick={() => setStickerSize('half')}
                                    disabled={(paperConfig?.slotCount || 2) === 1}
                                    style={{
                                        background: stickerSize === 'half' ? '#646cff' : '#eee',
                                        color: stickerSize === 'half' ? 'white' : 'black',
                                        opacity: (paperConfig?.slotCount || 2) === 1 ? 0.5 : 1
                                    }}
                                    title={(paperConfig?.slotCount || 2) === 1 ? "Not available in 1-slot mode" : "Half Size"}
                                >
                                    1 Slot
                                </button>
                                <button
                                    className={`btn-small ${stickerSize === 'full' ? 'active' : ''}`}
                                    onClick={() => setStickerSize('full')}
                                    style={{ background: stickerSize === 'full' ? '#646cff' : '#eee', color: stickerSize === 'full' ? 'white' : 'black' }}
                                >
                                    {(paperConfig?.slotCount || 2) === 1 ? "Full (1 Slot)" : "2 Slots"}
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

                {/* Row 3: Background */}
                <div className="control-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label htmlFor="sticker-background">Background</label>
                    <input
                        id="sticker-background"
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                    />
                    <button onClick={() => setBackgroundColor('#ffffff')} className="btn-small">Reset White</button>
                </div>

                <fieldset className={`outline-panel ${outline.enabled ? 'is-enabled' : ''}`}>
                    <legend><ScanLine size={16} /> Object outline</legend>
                    <label className="outline-toggle" htmlFor="outline-enabled">
                        <input id="outline-enabled" type="checkbox" checked={outline.enabled}
                            onChange={event => updateOutline({ enabled: event.target.checked })} />
                        Add a colored outline around the object
                    </label>
                    {outline.enabled && (
                        <>
                            <div className="outline-options">
                                <label htmlFor="outline-color">Color
                                    <input id="outline-color" type="color" value={outline.color}
                                        onChange={event => updateOutline({ color: event.target.value })} />
                                </label>
                                <label className="outline-width" htmlFor="outline-width">Thickness
                                    <input id="outline-width" type="range" min="0.25" max="5" step="0.25"
                                        value={outline.width}
                                        onChange={event => updateOutline({ width: Number(event.target.value) })} />
                                    <output htmlFor="outline-width">{outline.width}%</output>
                                </label>
                                <label htmlFor="outline-mode">Background detection
                                    <select id="outline-mode" value={outline.mode}
                                        onChange={event => updateOutline({ mode: event.target.value })}>
                                        <option value="auto">Auto (transparent / solid)</option>
                                        <option value="alpha">Transparency only</option>
                                        <option value="solid">Solid background</option>
                                    </select>
                                </label>
                                {outline.mode !== 'alpha' && (
                                    <label className="outline-width" htmlFor="outline-tolerance">Tolerance
                                        <input id="outline-tolerance" type="range" min="4" max="100" step="1"
                                            value={outline.tolerance}
                                            onChange={event => updateOutline({ tolerance: Number(event.target.value) })} />
                                        <output htmlFor="outline-tolerance">{outline.tolerance}</output>
                                    </label>
                                )}
                            </div>
                            <label className="outline-toggle" htmlFor="outline-remove-background">
                                <input id="outline-remove-background" type="checkbox" checked={outline.removeBackground}
                                    onChange={event => updateOutline({ removeBackground: event.target.checked })} />
                                Replace detected background with the selected sticker background
                            </label>
                            <p className={`outline-status ${currentPreview?.kind === 'none' || currentPreview?.error ? 'is-warning' : ''}`}
                                role="status" aria-live="polite">
                                {processing ? 'Detecting object edges…' : currentPreview?.error
                                    ? `${currentPreview.error} Turn off the outline or try another image.`
                                    : currentPreview?.kind === 'none'
                                        ? 'No clear object boundary found. Try a transparent PNG or a simpler background; adjust tolerance for solid colors.'
                                        : currentPreview?.kind === 'solid'
                                            ? 'Solid background detected. Only edge-connected background pixels are removed.'
                                            : 'Transparency detected. The outline follows the object’s silhouette.'}
                            </p>
                            <p className="outline-hint">Best for transparent artwork or a plain background, not complex photos. Thickness is relative to image size and scales with zoom. Edges at the image boundary may be clipped.</p>
                        </>
                    )}
                    <p className="outline-hint">Your last-used color, thickness, detection, tolerance, and background option are remembered in this browser and reused when you enable an outline.</p>
                </fieldset>

                {/* Row 4: Zoom */}
                <div className="control-row">
                    <label>Zoom</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        <input
                            type="range"
                            value={zoom}
                            min={0.1}
                            max={3}
                            step={0.01}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="zoom-range"
                            style={{ flex: 1 }}
                        />
                        <input
                            type="number"
                            value={zoom}
                            min={0.1}
                            max={10}
                            step={0.01}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            style={{ width: '60px', padding: '4px' }}
                            title="Exact Zoom Value"
                        />
                    </div>
                    <button className="btn-small" onClick={() => setZoom(1)} title="reset zoom">100%</button>
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

                </div>
                <div className="editor-footer">
                    {saveError && <p className="editor-error" role="alert">{saveError}</p>}
                    <div className="cropper-buttons">
                        <button onClick={onCancel} disabled={isSaving}>Cancel</button>
                        <button className="btn-primary" onClick={() => onSave(previewSource)}
                            disabled={processing || isSaving || currentPreview?.error}>
                            {isSaving ? 'Saving…' : processing ? 'Processing…' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CropModal;

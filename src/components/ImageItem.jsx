import React from 'react';
import { Crop as CropIcon, X } from 'lucide-react';

// Using React.memo to prevent unnecessary re-renders of the image list items
// only update if props change.
const ImageItem = React.memo(({ img, onUpdate, onEdit, onRemove }) => {
    return (
        <div className="image-card">
            <img src={img.croppedSrc || img.src} alt="thumb" />
            <div className="controls">
                <div className="qty">
                    <label>Qty:</label>
                    <input
                        type="number"
                        min="1"
                        max="36"
                        value={img.quantity}
                        onChange={(e) => onUpdate(img.id, { quantity: parseInt(e.target.value) || 1 })}
                        onPointerDown={(e) => e.stopPropagation()}
                    />
                </div>
                <button onClick={() => onEdit(img.id)} title="Crop/Resize" onPointerDown={(e) => e.stopPropagation()}><CropIcon size={16} /></button>
                <button onClick={() => onRemove(img.id)} title="Remove" onPointerDown={(e) => e.stopPropagation()}><X size={16} /></button>
            </div>
        </div>
    );
});

export default ImageItem;

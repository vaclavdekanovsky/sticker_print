import { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Plus, Download, FileArchive, Upload, Trash2, GripVertical } from 'lucide-react'
import JSZip from 'jszip'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

import getCroppedImg from './utils/cropUtils'
import { generatePDF } from './utils/pdfUtils'
import { generateZip } from './utils/zipUtils'
import StickerSheet from './components/StickerSheet'
import CropModal from './components/CropModal'
import SortableImageItem from './components/SortableImageItem'
import './App.css'

function App() {
  const [images, setImages] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  // Global Settings
  const [globalBackground, setGlobalBackground] = useState('#ffffff');
  // fitMode: 'cover' (Fill/Crop) vs 'contain' (Fit/Full Length)
  const [fitMode, setFitMode] = useState('cover');

  // Cropper State
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState({ horizontal: false, vertical: false });
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [imgFitMode, setImgFitMode] = useState('cover'); // Local editor state
  const [stickerSize, setStickerSize] = useState('half'); // Local editor state
  const [quantity, setQuantity] = useState(1); // Local editor state
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- Blob URL Cleanup ---
  useEffect(() => {
    return () => {
      // Cleanup on verify
      images.forEach(img => {
        if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
        if (img.croppedSrc && img.croppedSrc.startsWith('blob:')) URL.revokeObjectURL(img.croppedSrc);
      });
    };
  }, []);

  // Dropzone handler
  const onDrop = useCallback(acceptedFiles => {
    const newImages = acceptedFiles.map(file => {
      const objectUrl = URL.createObjectURL(file);
      return {
        id: Math.random().toString(36).substr(2, 9),
        src: objectUrl,
        croppedSrc: null,
        crop: { x: 0, y: 0 },
        zoom: 1,
        rotation: 0,
        flip: { horizontal: false, vertical: false },
        backgroundColor: globalBackground,
        quantity: 1,
        name: file.name,
        fitMode: fitMode,
        stickerSize: 'half' // Default to half size (1 slot)
      };
    });
    setImages(prev => [...prev, ...newImages]);
  }, [globalBackground, fitMode]);

  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'image/*': [] } });

  // Helpers
  const updateImage = useCallback((id, updates) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
  }, []);

  const removeImage = useCallback((id) => {
    setImages(prev => {
      const imgToRemove = prev.find(i => i.id === id);
      if (imgToRemove) {
        if (imgToRemove.src.startsWith('blob:')) URL.revokeObjectURL(imgToRemove.src);
        if (imgToRemove.croppedSrc && imgToRemove.croppedSrc.startsWith('blob:')) URL.revokeObjectURL(imgToRemove.croppedSrc);
      }
      return prev.filter(i => i.id !== id);
    });
  }, []);

  const clearAllImages = useCallback(() => {
    if (window.confirm("Are you sure you want to clear all images? This cannot be undone.")) {
      setImages(prev => {
        prev.forEach(img => {
          if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
          if (img.croppedSrc && img.croppedSrc.startsWith('blob:')) URL.revokeObjectURL(img.croppedSrc);
        });
        return [];
      });
    }
  }, []);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const startEditing = useCallback((id) => {
    const img = images.find(i => i.id === id);
    if (img) {
      setEditingId(id);
      setCrop(img.crop);
      setZoom(img.zoom);
      setRotation(img.rotation || 0);
      setFlip(img.flip || { horizontal: false, vertical: false });
      setBackgroundColor(img.backgroundColor || '#ffffff');
      setImgFitMode(img.fitMode || 'cover');
      setStickerSize(img.stickerSize || 'half');
      setQuantity(img.quantity || 1);
    }
  }, [images]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, []);

  const saveCrop = async () => {
    if (!editingId || !croppedAreaPixels) return;
    const img = images.find(i => i.id === editingId);
    try {
      // If we are in fit logic (contain/full len), we might not crop unless manual edit?
      // Actually we always crop/process to ensure background color is applied.
      const croppedBase64 = await getCroppedImg(
        img.src,
        croppedAreaPixels,
        rotation,
        flip,
        backgroundColor
      );

      // Convert Base64 to Blob URL for performance
      const res = await fetch(croppedBase64);
      const blob = await res.blob();
      const croppedBlobUrl = URL.createObjectURL(blob);

      // Clean up old cropped blob if it existed
      if (img.croppedSrc && img.croppedSrc.startsWith('blob:')) {
        URL.revokeObjectURL(img.croppedSrc);
      }

      updateImage(editingId, {
        croppedSrc: croppedBlobUrl,
        crop,
        zoom,
        rotation,
        flip,
        backgroundColor,
        fitMode: imgFitMode,
        stickerSize: stickerSize,
        quantity: quantity
      });
      setEditingId(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Import ZIP
  const handleImportZip = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const zip = await JSZip.loadAsync(file);
      const newImages = [];
      const entries = Object.keys(zip.files).filter(filename => !zip.files[filename].dir && !filename.startsWith('__MACOSX'));

      for (const filename of entries) {
        const fileData = await zip.files[filename].async('blob');
        const objectUrl = URL.createObjectURL(fileData);

        newImages.push({
          id: Math.random().toString(36).substr(2, 9),
          src: objectUrl,
          croppedSrc: null,
          crop: { x: 0, y: 0 },
          zoom: 1,
          rotation: 0,
          flip: { horizontal: false, vertical: false },
          backgroundColor: globalBackground,
          quantity: 1,
          name: filename.replace(/\.[^/.]+$/, ""),
          fitMode: fitMode,
          stickerSize: 'half'
        });
      }
      setImages(prev => [...prev, ...newImages]);
    } catch (e) {
      console.error("Failed to load ZIP", e);
      alert("Failed to load ZIP file.");
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const applyGlobalBackground = () => {
    if (window.confirm("Apply this background color to ALL stickers?")) {
      setImages(prev => prev.map(img => ({ ...img, backgroundColor: globalBackground })));
    }
  };

  const applyGlobalFitMode = (mode) => {
    if (window.confirm(`Set ALL stickers to ${mode === 'contain' ? 'Full Length (Fit)' : 'Fill (Cover)'}?`)) {
      setFitMode(mode);
      setImages(prev => prev.map(img => {
        if (img.croppedSrc && img.croppedSrc.startsWith('blob:')) {
          URL.revokeObjectURL(img.croppedSrc);
        }
        return { ...img, fitMode: mode, croppedSrc: null };
      }));
    }
  };

  const applyGlobalSize = (size) => {
    if (window.confirm(`Set ALL stickers to ${size === 'full' ? 'Full Size (2 Slots)' : 'Half Size (1 Slot)'}?`)) {
      setImages(prev => prev.map(img => ({ ...img, stickerSize: size })));
    }
  }

  const editingImage = images.find(i => i.id === editingId);

  return (
    <div className="container">
      <header>
        <div className="header-content">
          <div>
            <h1>Sticker Sheet Creator</h1>
            <p>A4 size • 6x3 Grid • {fitMode === 'contain' ? 'Fit' : 'Crop'}</p>
          </div>
          <div className="actions">
            {/* Global Controls */}
            <div className="global-controls" style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', background: '#f5f5f5', padding: '0.4rem 0.8rem', borderRadius: '6px' }}>

              {/* Background */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input type="color" value={globalBackground} onChange={(e) => setGlobalBackground(e.target.value)} title="Global Background Color" />
                <button className="btn-small" onClick={applyGlobalBackground} title="Apply BG to All">Set All</button>
              </div>

              <div style={{ height: '24px', width: '1px', background: '#ccc' }}></div>

              {/* Fit Mode */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <select value={fitMode} onChange={(e) => applyGlobalFitMode(e.target.value)} style={{ fontSize: '0.8rem', padding: '2px' }}>
                  <option value="cover">Fill (Crop)</option>
                  <option value="contain">Fit (Whole)</option>
                </select>
              </div>

              <div style={{ height: '24px', width: '1px', background: '#ccc' }}></div>

              {/* Size Mode */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button className="btn-small" onClick={() => applyGlobalSize('half')} title="Set All to Half (1 Slot)">1 Slot</button>
                <button className="btn-small" onClick={() => applyGlobalSize('full')} title="Set All to Full (2 Slots)">2 Slots</button>
              </div>

            </div>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".zip"
              onChange={handleImportZip}
            />
            <button className="btn-secondary" onClick={clearAllImages} disabled={images.length === 0} title="Clear All"><Trash2 size={18} /> Clear</button>
            <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}><Upload size={18} /> Import ZIP</button>
            <button className="btn-secondary" onClick={() => generateZip(images)} disabled={images.length === 0}><FileArchive size={18} /> Export ZIP</button>
            <button className="btn-primary" onClick={() => generatePDF(images)} disabled={images.length === 0}><Download size={18} /> Export PDF</button>
          </div>
        </div>
      </header>

      <div className="main-content">
        <div className="sidebar">
          <div {...getRootProps()} className="dropzone">
            <input {...getInputProps()} />
            <Plus size={32} />
            <p>Drag & drop images here</p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="image-list">
              <SortableContext
                items={images.map(i => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {images.map(img => (
                  <SortableImageItem
                    key={img.id}
                    id={img.id}
                    img={img}
                    onUpdate={updateImage}
                    onEdit={startEditing}
                    onRemove={removeImage}
                  />
                ))}
              </SortableContext>
            </div>
          </DndContext>
        </div>

        <div className="preview-area">
          <div className="preview-scale-wrapper" style={{ transform: 'scale(0.6)', transformOrigin: 'top center' }}>
            <StickerSheet images={images} onInteract={startEditing} />
          </div>
        </div>
      </div>

      <CropModal
        editingImage={editingImage}
        crop={crop}
        zoom={zoom}
        rotation={rotation}
        flip={flip}
        backgroundColor={backgroundColor}
        imgFitMode={imgFitMode}
        stickerSize={stickerSize}
        quantity={quantity}
        setCrop={setCrop}
        setZoom={setZoom}
        setRotation={setRotation}
        setFlip={setFlip}
        setBackgroundColor={setBackgroundColor}
        setImgFitMode={setImgFitMode}
        setStickerSize={setStickerSize}
        setQuantity={setQuantity}
        onCropComplete={onCropComplete}
        onCancel={() => setEditingId(null)}
        onSave={saveCrop}
      />
    </div>
  )
}

export default App

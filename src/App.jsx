import { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Plus, Download, FileArchive, Upload, Trash2, GripVertical, Settings } from 'lucide-react'
import JSZip from 'jszip'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

import getCroppedImg from './utils/cropUtils'
import { generatePDF } from './utils/pdfUtils'
import { generateZip } from './utils/zipUtils'
import StickerSheet from './components/StickerSheet'
import CropModal from './components/CropModal'
import PaperSetupModal from './components/PaperSetupModal'
import SortableImageItem from './components/SortableImageItem'
import './App.css'

function App() {
  const [images, setImages] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  // Paper Config State
  const [paperConfig, setPaperConfig] = useState({
    id: '6x3',
    name: '6x3 Grid (68x47mm)',
    cols: 3,
    rows: 6,
    margins: { top: 7.5, bottom: 7.5, left: 3, right: 3 },
    gaps: { x: 0, y: 0 },
    slotCount: 2,
    slotDirection: 'vertical'
  });
  const [isPaperSetupOpen, setIsPaperSetupOpen] = useState(false);

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

  // First time setup check
  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenPaperSetup');
    if (!hasSeen) {
      setIsPaperSetupOpen(true);
      localStorage.setItem('hasSeenPaperSetup', 'true');
    }
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
  const { getRootProps: getCanvasRootProps, getInputProps: getCanvasInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    noClick: true
  });

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
      const croppedBase64 = await getCroppedImg(
        img.src,
        croppedAreaPixels,
        rotation,
        flip,
        backgroundColor
      );

      const res = await fetch(croppedBase64);
      const blob = await res.blob();
      const croppedBlobUrl = URL.createObjectURL(blob);

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

      // Check for metadata.json
      const metadataFile = zip.file("metadata.json");

      if (metadataFile) {
        // --- Smart Import with Metadata ---
        try {
          const metadataStr = await metadataFile.async("string");
          const metadata = JSON.parse(metadataStr);

          // Restore Paper Config if present
          if (metadata.paperConfig) {
            setPaperConfig(metadata.paperConfig);
          }
          const items = metadata.items || metadata; // Handle legacy array vs new object structure

          // Sort by order just in case
          if (Array.isArray(items)) {
            items.sort((a, b) => (a.order || 0) - (b.order || 0));

            for (const item of items) {
              let zipFile = zip.file(`stickers/${item.filename}`);
              if (!zipFile) zipFile = zip.file(item.filename);

              if (zipFile) {
                const fileData = await zipFile.async('blob');
                const objectUrl = URL.createObjectURL(fileData);

                newImages.push({
                  id: item.id || Math.random().toString(36).substr(2, 9),
                  src: objectUrl,
                  croppedSrc: null,
                  crop: item.editSettings?.crop || { x: 0, y: 0 },
                  zoom: item.editSettings?.zoom || 1,
                  rotation: item.editSettings?.rotation || 0,
                  flip: item.editSettings?.flip || { horizontal: false, vertical: false },
                  backgroundColor: item.backgroundColor || globalBackground,
                  quantity: item.quantity || 1,
                  name: item.originalName || item.filename,
                  fitMode: item.fitMode || 'cover',
                  stickerSize: item.stickerSize || 'half'
                });
              }
            }
          }
        } catch (err) {
          console.error("Error parsing metadata, falling back to legacy", err);
          alert("Error processing metadata.json. Imported images might be incomplete.");
        }

      } else {
        // Legacy import
        const entries = Object.keys(zip.files).filter(filename =>
          !zip.files[filename].dir &&
          !filename.startsWith('__MACOSX') &&
          !filename.endsWith('metadata.json')
        );

        for (const filename of entries) {
          if (!filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) continue;

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

  const applyGlobalSize = (size) => {
    if (window.confirm(`Set ALL stickers to ${size === 'full' ? 'Full Size (2 Slots)' : 'Half Size (1 Slot)'}?`)) {
      setImages(prev => prev.map(img => ({ ...img, stickerSize: size })));
    }
  }

  const handlePaperSetupSave = (newConfig) => {
    setPaperConfig(newConfig);
    setIsPaperSetupOpen(false);
  };

  const editingImage = images.find(i => i.id === editingId);

  return (
    <div className="container">
      <header>
        <div className="header-content">
          <div>
            <h1>Sticker Sheet Creator</h1>
            <button className="btn-icon" onClick={() => setIsPaperSetupOpen(true)} title="Configure Paper & Grid">
              <Settings size={16} style={{ marginRight: '6px' }} />
              {paperConfig.name}
            </button>
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
            <button className="btn-secondary" onClick={() => generateZip(images, paperConfig)} disabled={images.length === 0}><FileArchive size={18} /> Export ZIP</button>
            <button className="btn-primary" onClick={() => generatePDF(images, paperConfig)} disabled={images.length === 0}><Download size={18} /> Export PDF</button>
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

        <div className="preview-area" {...getCanvasRootProps()}>
          <input {...getCanvasInputProps()} />
          <div className="preview-scale-wrapper" style={{ transform: 'scale(0.6)', transformOrigin: 'top center' }}>
            <StickerSheet images={images} onInteract={startEditing} paperConfig={paperConfig} />
          </div>
        </div>
      </div>

      <CropModal
        editingImage={editingImage}
        paperConfig={paperConfig}
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

      <PaperSetupModal
        isOpen={isPaperSetupOpen}
        config={paperConfig}
        onSave={handlePaperSetupSave}
        onCancel={() => setIsPaperSetupOpen(false)}
      />
    </div>
  )
}

export default App

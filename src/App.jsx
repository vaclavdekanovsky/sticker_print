import { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Plus, Download, FileArchive, Upload, Trash2, GripVertical, Settings, SlidersHorizontal } from 'lucide-react'
import JSZip from 'jszip'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

import getCroppedImg from './utils/cropUtils'
import { generatePDF } from './utils/pdfUtils'
import { generateZip } from './utils/zipUtils'
import { PAPER_PRESETS, DEFAULT_PRESET_ID } from './config/paperPresets'
import StickerSheet from './components/StickerSheet'
import CropModal from './components/CropModal'
import PaperSetupModal from './components/PaperSetupModal'
import GlobalSettingsModal from './components/GlobalSettingsModal'
import SortableImageItem from './components/SortableImageItem'
import './App.css'

function App() {
  const [images, setImages] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  // Paper Config State
  const [paperConfig, setPaperConfig] = useState(PAPER_PRESETS[DEFAULT_PRESET_ID]);
  const [isPaperSetupOpen, setIsPaperSetupOpen] = useState(false);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);

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

  const applyGlobalBackground = (color) => {
    if (window.confirm("Apply this background color to ALL stickers?")) {
      setGlobalBackground(color);
      setImages(prev => prev.map(img => ({ ...img, backgroundColor: color })));
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

  // Helper: Calculate Aspect Ratio (Mirroring CropModal logic)
  const getAspectRatio = (config, stickerSize) => {
    const isLandscape = c.orientation === 'landscape';
    const pageWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;

    const effectiveW = pageWidth - (c.margins.left || 0) - (c.margins.right || 0);
    const effectiveH = pageHeight - (c.margins.top || 0) - (c.margins.bottom || 0);
    const totalGapX = ((c.cols || 3) - 1) * (c.gaps?.x || 0);
    const totalGapY = ((c.rows || 6) - 1) * (c.gaps?.y || 0);

    const cellW = (effectiveW - totalGapX) / (c.cols || 3);
    const cellH = (effectiveH - totalGapY) / (c.rows || 6);

    // If Sticker Size is "Full" (2 Slots) OR Paper is configured for 1 Slot
    if (stickerSize === 'full' || (c.slotCount || 1) === 1) {
      return cellW / cellH; // Whole Cell
    }

    // "1 Slot" - Check Direction
    const slotDir = c.slotDirection || 'vertical';
    if (slotDir === 'horizontal') {
      return cellW / (cellH / 2); // Horizontal Split
    } else {
      return (cellW / 2) / cellH; // Vertical Split
    }
  };

  const applyZoomToAll = async (zoomValue) => {
    if (window.confirm(`Apply zoom level ${zoomValue} to ALL stickers?\n\nThis will re-process all images to be perfectly centered and filled. It may take a few seconds.`)) {

      const newImages = [...images];

      // Batch process
      const promises = newImages.map(async (img) => {
        try {
          // 1. Determine Aspect Ratio needed
          const aspect = getAspectRatio(paperConfig, img.stickerSize);

          // 2. Load Image to get natural dimensions
          const imageEl = await new Promise((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = img.src;
          });

          // 3. Calculate "Cover" Dimensions centered
          const imgAspect = imageEl.width / imageEl.height;
          let cropWidth, cropHeight;

          // Logic for "Cover" fit
          if (imgAspect > aspect) {
            // Image is wider than slot -> Height limits
            cropHeight = imageEl.height;
            cropWidth = imageEl.height * aspect;
          } else {
            // Slot is wider than image -> Width limits
            cropWidth = imageEl.width;
            cropHeight = imageEl.width / aspect;
          }

          // 4. Apply Zoom (shrink the crop area)
          // Zoom > 1 means we show LESS of the image (smaller crop rect)
          const zoomedWidth = cropWidth / zoomValue;
          const zoomedHeight = cropHeight / zoomValue;

          // 5. Center the crop
          const x = (imageEl.width - zoomedWidth) / 2;
          const y = (imageEl.height - zoomedHeight) / 2;

          const pixelCrop = { x, y, width: zoomedWidth, height: zoomedHeight };

          // 6. Generate Blob
          const croppedBase64 = await getCroppedImg(
            img.src,
            pixelCrop,
            0, // rotation
            img.flip || { horizontal: false, vertical: false },
            img.backgroundColor || '#ffffff'
          );

          const res = await fetch(croppedBase64);
          const blob = await res.blob();
          const croppedBlobUrl = URL.createObjectURL(blob);

          // Cleanup old blob if needed
          if (img.croppedSrc && img.croppedSrc.startsWith('blob:')) {
            URL.revokeObjectURL(img.croppedSrc);
          }

          return {
            ...img,
            croppedSrc: croppedBlobUrl,
            crop: { x: 0, y: 0 }, // Reset UI crop to center since it's baked in
            zoom: zoomValue
          };

        } catch (err) {
          console.error("Failed to process image for bulk zoom", img.id, err);
          return img; // Return original on failure
        }
      });

      const processedImages = await Promise.all(promises);
      setImages(processedImages);
    }
  };

  const handleApplyGlobalZoom = (zoomValue) => {
    applyZoomToAll(zoomValue);
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
            <button className="btn-icon" onClick={() => setIsGlobalSettingsOpen(true)} title="Global Settings">
              <SlidersHorizontal size={16} style={{ marginRight: '6px' }} />
              Global Settings
            </button>
          </div>
          <div className="actions">

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
        onApplyZoomToAll={applyZoomToAll}
      />

      <PaperSetupModal
        isOpen={isPaperSetupOpen}
        config={paperConfig}
        onSave={handlePaperSetupSave}
        onCancel={() => setIsPaperSetupOpen(false)}
      />

      <GlobalSettingsModal
        isOpen={isGlobalSettingsOpen}
        onClose={() => setIsGlobalSettingsOpen(false)}
        onApplyBackground={applyGlobalBackground}
        onApplySize={applyGlobalSize}
        onApplyZoom={handleApplyGlobalZoom}
        currentGlobalBackground={globalBackground}
      />
    </div>
  )
}

export default App

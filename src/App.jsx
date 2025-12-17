import { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Plus, Download, FileArchive, Upload, Trash2 } from 'lucide-react'
import JSZip from 'jszip'
import getCroppedImg from './utils/cropUtils'
import { generatePDF } from './utils/pdfUtils'
import { generateZip } from './utils/zipUtils'
import StickerSheet from './components/StickerSheet'
import CropModal from './components/CropModal'
import ImageItem from './components/ImageItem'
import './App.css'

function App() {
  const [images, setImages] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  // Cropper State
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState({ horizontal: false, vertical: false });
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // --- Blob URL Cleanup ---
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      images.forEach(img => {
        if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
        if (img.croppedSrc && img.croppedSrc.startsWith('blob:')) URL.revokeObjectURL(img.croppedSrc);
      });
    };
  }, []);

  // Dropzone handler (Now using Blob URLs)
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
        backgroundColor: '#ffffff',
        quantity: 1,
        name: file.name
      };
    });
    setImages(prev => [...prev, ...newImages]);
  }, []);

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

  const startEditing = useCallback((id) => {
    const img = images.find(i => i.id === id);
    if (img) {
      setEditingId(id);
      setCrop(img.crop);
      setZoom(img.zoom);
      setRotation(img.rotation || 0);
      setFlip(img.flip || { horizontal: false, vertical: false });
      setBackgroundColor(img.backgroundColor || '#ffffff');
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
        backgroundColor
      });
      setEditingId(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Import ZIP (Modified for Blob URLs)
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
          croppedSrc: objectUrl, // Already processed
          crop: { x: 0, y: 0 },
          zoom: 1,
          rotation: 0,
          flip: { horizontal: false, vertical: false },
          backgroundColor: '#ffffff',
          quantity: 1,
          name: filename.replace(/\.[^/.]+$/, "")
        });
      }
      setImages(prev => [...prev, ...newImages]);
    } catch (e) {
      console.error("Failed to load ZIP", e);
      alert("Failed to load ZIP file.");
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const editingImage = images.find(i => i.id === editingId);

  return (
    <div className="container">
      <header>
        <div className="header-content">
          <div>
            <h1>Sticker Sheet Creator</h1>
            <p>A4 size • 6x3 Grid • 2 photos per sticker</p>
          </div>
          <div className="actions">
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".zip"
              onChange={handleImportZip}
            />
            <button className="btn-secondary" onClick={clearAllImages} disabled={images.length === 0} title="Clear All"><Trash2 size={18} /> Clear All</button>
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

          <div className="image-list">
            {images.map(img => (
              <ImageItem
                key={img.id}
                img={img}
                onUpdate={updateImage}
                onEdit={startEditing}
                onRemove={removeImage}
              />
            ))}
          </div>
        </div>

        <div className="preview-area">
          <div className="preview-scale-wrapper" style={{ transform: 'scale(0.6)', transformOrigin: 'top center' }}>
            <StickerSheet images={images} />
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
        setCrop={setCrop}
        setZoom={setZoom}
        setRotation={setRotation}
        setFlip={setFlip}
        setBackgroundColor={setBackgroundColor}
        onCropComplete={onCropComplete}
        onCancel={() => setEditingId(null)}
        onSave={saveCrop}
      />
    </div>
  )
}

export default App

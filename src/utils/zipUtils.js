import { saveAs } from 'file-saver';
import { normalizeOutline } from './outlineUtils';

export async function readZipImage(file, filename) {
    const types = { svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg',
        jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
    const extension = filename.split('.').pop().toLowerCase();
    // JSZip does not retain a Blob's MIME type. SVG decoding requires it.
    return new Blob([await file.async('uint8array')], { type: types[extension] || 'image/png' });
}

export const generateZip = async (images, paperConfig) => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const folder = zip.folder("stickers");
    const originals = zip.folder("originals");
    const itemsMetadata = [];

    // Process images sequentially
    for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const src = img.croppedSrc || img.src;
        let filename = `${img.name || 'sticker'}-${i + 1}`;
        let extension = 'png';

        try {
            if (src.startsWith('blob:')) {
                // Fetch blob data
                const response = await fetch(src);
                const blob = await response.blob();

                // Determine extension from blob type
                if (blob.type === 'image/jpeg') extension = 'jpg';
                else if (blob.type === 'image/webp') extension = 'webp';

                folder.file(`${filename}.${extension}`, blob);
            } else if (src.startsWith('data:image')) {
                // Base64
                const base64Data = src.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
                extension = src.match(/image\/(png|jpeg|jpg)/)?.[1] || 'png';
                folder.file(`${filename}.${extension}`, base64Data, { base64: true });
            }

            // Keep the editable source separate from the rendered sticker, so
            // importing cannot bake in or double-apply the outline/transforms.
            const originalBlob = await (await fetch(img.src)).blob();
            const originalExtension = ({ 'image/jpeg': 'jpg', 'image/webp': 'webp',
                'image/svg+xml': 'svg', 'image/gif': 'gif' })[originalBlob.type] || 'png';
            const sourceFilename = `${filename}-original.${originalExtension}`;
            originals.file(sourceFilename, originalBlob);

            // Add to metadata
            itemsMetadata.push({
                order: i + 1,
                id: img.id,
                originalName: img.name,
                filename: `${filename}.${extension}`,
                sourceFilename: `originals/${sourceFilename}`,
                processedFilename: img.croppedSrc ? `stickers/${filename}.${extension}` : null,
                quantity: img.quantity || 1,
                stickerSize: img.stickerSize || 'half',
                fitMode: img.fitMode || 'cover',
                backgroundColor: img.backgroundColor,
                outline: normalizeOutline(img.outline),
                editSettings: {
                    crop: img.crop,
                    zoom: img.zoom,
                    rotation: img.rotation,
                    flip: img.flip,
                    pixelCrop: img.pixelCrop || null
                }
            });

        } catch (e) {
            console.error(`Failed to add image ${i} to zip`, e);
        }
    }

    // Add metadata file with both items and paperConfig
    const metadata = {
        version: "2.0",
        createdAt: new Date().toISOString(),
        paperConfig: paperConfig || null,
        items: itemsMetadata
    };

    zip.file("metadata.json", JSON.stringify(metadata, null, 2));

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "stickers-collection.zip");
};

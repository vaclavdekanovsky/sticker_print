import { saveAs } from 'file-saver';

export const generateZip = async (images, paperConfig) => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const folder = zip.folder("stickers");
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

            // Add to metadata
            itemsMetadata.push({
                order: i + 1,
                id: img.id,
                originalName: img.name,
                filename: `${filename}.${extension}`,
                quantity: img.quantity || 1,
                stickerSize: img.stickerSize || 'half',
                fitMode: img.fitMode || 'cover',
                backgroundColor: img.backgroundColor,
                editSettings: {
                    crop: img.crop,
                    zoom: img.zoom,
                    rotation: img.rotation,
                    flip: img.flip
                }
            });

        } catch (e) {
            console.error(`Failed to add image ${i} to zip`, e);
        }
    }

    // Add metadata file with both items and paperConfig
    const metadata = {
        version: "1.0",
        createdAt: new Date().toISOString(),
        paperConfig: paperConfig || null,
        items: itemsMetadata
    };

    zip.file("metadata.json", JSON.stringify(metadata, null, 2));

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "stickers-collection.zip");
};

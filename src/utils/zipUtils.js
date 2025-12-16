import { saveAs } from 'file-saver';

export const generateZip = async (images) => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const folder = zip.folder("stickers");

    // Add each processed image
    images.forEach((img, i) => {
        const src = img.croppedSrc || img.src;
        // Check if src is Blob URL or Base64
        // If it's a blob URL, we should probably fetch it. 
        // But for now, assuming base64 as per current implementation. 
        // We will update this when we switch to blobs.

        let base64Data = src;
        if (src.startsWith('data:image')) {
            base64Data = src.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
            folder.file(`${img.name || 'image'}-${i}.jpg`, base64Data, { base64: true });
        }
        // TODO: Handle Blob URLs later
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "stickers-images.zip");
};

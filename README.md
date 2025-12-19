# Christmas Sticker Creator

A web application for creating, organizing, and printing custom sticker sheets (A4 size). Designed for easy personalization of Christmas stickers, but versatile enough for any sticker needs.

## Features

-   **Easy Image Upload**: Drag and drop images directly or import a ZIP file.
-   **A4 Print Layout**: Automatically arranges stickers on a standard A4 grid (3 columns x 6 rows).
-   **Advanced Editing**:
    -   **Crop & Zoom**: Focus on the best part of your image.
    -   **Fit Modes**: Choose between **Fill** (crop to fill the slot) or **Whole** (fit entire image without cropping).
    -   **Sticker Sizes**: Support for **1 Slot** (Standard) or **2 Slots** (Wide/Full Width) stickers.
    -   **Rotate & Flip**: Fine-tune orientation with 90° rotation buttons and flip controls.
    -   **Background Color**: Set custom background colors for individual stickers or the entire sheet.
-   **Drag-and-Drop Organization**: Reorder stickers in the sidebar simply by dragging them.
-   **PDF Export**: Generates a high-quality A4 PDF ready for printing.
-   **ZIP Export/Import**: Save your work-in-progress or export all processed images.

## Quick Start Guide

1.  **Add Images**: Drag images onto the "Drag & drop images here" area or click the "+" button.
2.  **Organize**: Drag items in the left sidebar to change their order on the sheet.
3.  **Edit**: Click the "Crop" icon on an image (or click the sticker in the preview) to open the editor.
    *   **Qty**: Set how many copies of this sticker you want (directly in the editor).
    *   **Size**: Toggle between "1 Slot" and "2 Slots".
    *   **Fit**: Use "Fill" for full-bleed photos or "Whole" for logos/clipart.
    *   **Rotate/Zoom**: Adjust to perfection.
4.  **Global Settings**: Use the top toolbar to set the background color or size for *all* stickers at once.
5.  **Export**: Click "Export PDF" to download your print-ready file.

## Tech Stack

-   React + Vite
-   dnd-kit (for drag-and-drop)
-   react-easy-crop (for image manipulation)
-   jspdf (for PDF generation)

# Christmas Sticker Creator

A web application for creating, organizing, and printing custom sticker sheets (A4 size). Designed for easy personalization of Christmas stickers, but versatile enough for any sticker needs.

## Features

-   **Easy Image Upload**: Drag and drop images directly or import a ZIP file.
-   **Flexible Paper Layout**: 
    -   Choose from standard presets (e.g., 2x4, 3x6).
    -   **Custom Grid**: Create any layout (e.g., "5x5 Custom") by simply adjusting rows/columns.
    -   **Orientation**: Visual buttons to easily switch between Portrait and Landscape modes.
-   **Multipage Support**: Automatically handles overflow by generating multiple pages in both the preview and PDF export.
-   **Advanced Editing**:
    -   **Crop & Zoom**: Focus on the best part of your image.
    -   **Fit Modes**: Choose between **Fill** (crop to fill the slot) or **Whole** (fit entire image without cropping).
    -   **Sticker Sizes**: Support for **1 Slot** (Standard) or **2 Slots** (Wide/Full Width) stickers.
    -   **Rotate & Flip**: Fine-tune orientation with 90° rotation buttons and flip controls.
    -   **Background Color**: Set custom background colors for individual stickers or the entire sheet.
-   **Global Settings**: One-click actions to apply background colors, sticker sizes, or zoom levels to all images on the sheet.
-   **Drag-and-Drop Organization**: Reorder stickers in the sidebar simply by dragging them.
-   **PDF Export**: Generates a high-quality A4 PDF ready for printing.
-   **Smart ZIP Export/Import**: 
    -   Exports all processed images along with a `metadata.json` file.
    -   **Restores Everything**: When you import the ZIP back, it remembers your sticker quantity, size, edit settings, and order.
    -   Also supports importing standard ZIPs containing just images.

## Quick Start Guide

1.  **Configure Paper**: Click the gear icon to set your paper size, rows, and columns.
2.  **Add Images**: Drag images onto the "Drag & drop images here" area or click the "+" button.
3.  **Organize**: Drag items in the left sidebar to change their order on the sheet.
4.  **Edit**: Click the "Crop" icon on an image (or click the sticker in the preview) to open the editor.
    *   **Qty**: Set how many copies of this sticker you want (directly in the editor).
    *   **Size**: Toggle between "1 Slot" and "2 Slots".
    *   **Fit**: Use "Fill" for full-bleed photos or "Whole" for logos/clipart.
    *   **Rotate/Zoom**: Adjust to perfection.
5.  **Global Settings**: Use the **Global Settings** button (Gear icon) to apply background color, size, or zoom to *all* stickers at once.
6.  **Export**: Click "Export PDF" to download your print-ready file.

## Development

### Prerequisites

-   Node.js (LTS version recommended)
-   npm

### Setup

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Start the development server:
    ```bash
    npm run dev
    ```

3.  Build for production:
    ```bash
    npm run build
    ```

## Tech Stack

-   **Frontend**: React + Vite
-   **Drag & Drop**: dnd-kit
-   **Image Manipulation**: react-easy-crop
-   **PDF Generation**: jspdf

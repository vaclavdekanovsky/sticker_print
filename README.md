# Sticker Sheet Creator — Outline edition

GitHub fork: [supriyopaul/sticker_print](https://github.com/supriyopaul/sticker_print), based on [vaclavdekanovsky/sticker_print](https://github.com/vaclavdekanovsky/sticker_print). The outline changes are on branch `feature/object-outlines`; `master` remains the original upstream version.

## Colored object outlines

Upload an image and click its edit button or its sheet preview. **Object outline** is beside **Background**, **Zoom**, and **Rotate**:

- Enable the outline and choose its color and thickness (0.25–5% of the image's shorter side). Thickness scales with zoom.
- The last-used outline color, thickness, detection mode, tolerance, and background option are remembered in this browser, including after a refresh. Enabling an outline reuses those settings; new stickers still start with the outline off. Already outlined stickers keep their own saved settings when reopened. Changing an outline control updates these defaults immediately; Cancel leaves the sticker unchanged but keeps the last-used defaults.
- **Auto** uses existing transparency, or detects a dominant solid color around the image's edges. **Transparency only** and **Solid background** let you choose explicitly.
- **Tolerance** controls how close pixels must be to the detected background color. Only connected background pixels reaching an image edge are removed; enclosed same-color object details are retained.
- Choose whether to replace the detected background with the selected sticker background or keep the original background behind the outline.
- Changes preview live. **Save Changes** applies the same image processing to the sheet and PDF. ZIP version 2 includes both original and processed images plus outline/crop settings, so imported stickers remain editable without double outlines.

Processing runs locally in your browser: no image uploads, AI models, or external services. It is intended for transparent artwork and simple, nearly uniform backgrounds, **not subject segmentation in complex photographs**. If no clear boundary is found, the editor warns and keeps the original image. Objects touching the image or crop boundary may have clipped outlines. Large-image mask detection is limited to 2048 pixels on the longest side; original artwork resolution is retained. Outline rendering accepts up to 16 megapixels and 8192 pixels per side, and asks you to resize larger sources.

Run the fork with `npm run dev -- --host 127.0.0.1 --port 5174`. Pure mask tests: `npm test`. Browser regressions: `npm run test:e2e` (install Playwright Chromium first with `npx playwright install chromium`). Set the `STICKER_PORT` environment variable to test another port. Production build: `npm run build`.

---

## Original application

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

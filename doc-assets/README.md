# Documentation Automation

This folder contains the assets and generated output for the automated documentation system.

## How to use

1.  **Add Images**: Place your sample images (JPG, PNG) into the `input_images/` folder.
    *   *Note: These files are ignored by git, so they won't clutter the repo.*
2.  **Run the Generator**:
    Run the following command in the project root:
    ```bash
    npx playwright test
    ```
3.  **View Results**:
    Open `generated_docs/Sticker_Generator_User_Guide.pdf` to see the generated guide.

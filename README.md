# Fathom Transcript Downloader

Download all Fathom transcripts for a given meeting filter into a local folder.

## Setup

1. **Install dependencies:**

    ```bash
    npm install
    ```

2. **Configure:**

    - Open `download-fathom-transcripts.ts`.
    - Set your `x-xsrf-token` and `cookie` in the `HEADERS` object.
    - Optionally, change `SEARCH_FILTER` and `OUTPUT_DIR`.

3. **Run the script:**
    ```bash
    npm run download
    ```

## Requirements

-   Node.js 18+ (for native fetch)
-   Your Fathom session cookies and XSRF token (copy from browser dev tools)

## Output

-   Transcripts will be saved as `.txt` files in the specified output directory.

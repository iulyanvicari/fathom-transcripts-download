# Fathom Transcript Downloader

Download all Fathom transcripts for a given meeting filter into a local folder.

## Setup

1. **Install dependencies:**

    ```bash
    npm install
    ```

2. **Configure authentication:**

    - Copy `.env.example` to `.env` (create `.env` if it doesn't exist).
    - Set your `XSRF_TOKEN` and `COOKIE` in the `.env` file. These are required for authentication.
    - If you don't know your values, just run the script and follow the browser instructions (see below).

3. **Configure script options:**

    - Open `download-fathom-transcripts.ts`.
    - Optionally, change `SEARCH_FILTER` and `OUTPUT_DIR` at the top of the file.

## Usage

Run the script:

```bash
npm run download
```

-   The script will fetch all paginated meetings matching your filter and download their transcripts as `.txt` files in the output directory.
-   Only the `plain_text` field of each transcript is saved.
-   Filenames include the meeting title and date.

## Authentication Flow

-   If your credentials are missing or expired, the script will open the Fathom home page in your browser.
-   **After logging in:**
    1. Open DevTools > Network.
    2. Reload the page.
    3. Find the request called `previous`.
    4. Copy the `cookie` and `x-xsrf-token` headers from that request ("Copy as cURL" is easiest).
    5. Paste these values into your `.env` file as `COOKIE` and `XSRF_TOKEN`.
    6. Re-run the script.

## Troubleshooting

-   If you see an `[AUTH ERROR]`, your credentials are missing or expired.
-   If you see HTML in the debug output, your authentication is not working—refresh your credentials as above.
-   If you get no meetings, check your `SEARCH_FILTER` and that you have access to the calls in Fathom.

## Requirements

-   Node.js 18+ (for native fetch)
-   Your Fathom session cookies and XSRF token (see above)

## Output

-   Transcripts will be saved as `.txt` files in the specified output directory, named with the meeting title and date.

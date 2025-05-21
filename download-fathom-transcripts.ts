// download-fathom-transcripts.ts
// Usage: Set your XSRF token and cookie in the HEADERS object below. Run with Node.js 18+ (for native fetch).
// If using an older Node version, install 'node-fetch' and import it.
//
// To run:
//   npx tsx download-fathom-transcripts.ts
//
// Output: Transcripts will be saved in the OUTPUT_DIR folder.

/// <reference types="node" />

import "dotenv/config";
import { mkdir, writeFile } from "fs/promises";
import open from "open";
import path from "path";

// --- CONFIGURABLE VARIABLES ---
const SEARCH_FILTER = "Pipeline Review"; // Change as needed
const OUTPUT_DIR = "./fathom-transcripts"; // Change as needed

// Load sensitive values from environment variables
const XSRF_TOKEN = process.env.XSRF_TOKEN;
const COOKIE = process.env.COOKIE;
console.log(XSRF_TOKEN, COOKIE);
if (!XSRF_TOKEN || !COOKIE) {
    console.warn("[DEBUG] XSRF_TOKEN or COOKIE not set in environment variables. Set them in your .env file.");
}

// Copy your headers from your browser session here if needed
// otherwise just use the XSRF_TOKEN and COOKIE variables in .env like the example
const HEADERS = {
    accept: "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    dnt: "1",
    priority: "u=1, i",
    referer: `https://fathom.video/calls/search/title?input=${encodeURIComponent(SEARCH_FILTER)}`,
    "sec-ch-ua": '"Not.A/Brand";v="99", "Chromium";v="136"',
    "sec-ch-ua-mobile": "?1",
    "sec-ch-ua-platform": '"Android"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36",
    "x-xsrf-token": XSRF_TOKEN || "",
    cookie: COOKIE || "",
};

async function main() {
    await mkdir(OUTPUT_DIR, { recursive: true });

    // Fetch all paginated meetings
    const meetings = await fetchAllMeetings();
    console.log("[DEBUG] Total meetings found:", meetings.length);
    if (!meetings.length) {
        console.log("No meetings found.");
        return;
    }

    // Download each transcript
    for (const meeting of meetings) {
        const id = meeting.id || meeting.call_id || extractIdFromPermalink(meeting.permalink);
        if (!id) continue;
        const transcriptUrl = `https://fathom.video/calls/${id}/copy_transcript`;
        const plainText = await getTranscript(transcriptUrl, id);
        if (!plainText) continue;

        const filename = getFileName(meeting, id);
        await writeFile(filename, plainText, "utf8");
        console.log(`Saved transcript: ${filename}`);
    }
}

async function fetchAllMeetings() {
    let allMeetings: any[] = [];
    let cursor: string | undefined = undefined;
    let page = 1;
    while (true) {
        const url = `https://fathom.video/calls/search/title/paginate?input=${encodeURIComponent(SEARCH_FILTER)}${
            cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""
        }`;
        console.log(`[DEBUG] Fetching page ${page} from:`, url);
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) throw new Error(`Failed to fetch meetings: ${res.statusText}`);
        const rawText = await res.text();
        if (/\<html/i.test(rawText)) {
            console.error(
                "[AUTH ERROR] Response contains HTML. Your authentication is incorrect or expired. Check your XSRF_TOKEN and COOKIE."
            );
            console.log("\nOpening Fathom login page in your browser...");
            await open("https://fathom.video/home");
            console.log(
                "After logging in, open DevTools > Network, reload the page, and look for the request called 'previous'. Copy the 'cookie' and 'x-xsrf-token' headers from that request and update your .env file. It might be easier to right click the request and use Copy > Copy as cURL"
            );
            process.exit(1);
        }
        console.log(`[DEBUG] Raw response (first 500 chars):`, rawText.slice(0, 500));
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            console.error(`[DEBUG] Failed to parse JSON on page ${page}:`, e);
            throw e;
        }
        const items = data.items || [];
        console.log(`[DEBUG] Page ${page} items:`, items.length);
        allMeetings = allMeetings.concat(items);
        if (data.next_cursor) {
            cursor = data.next_cursor;
            console.log(`[DEBUG] Next cursor:`, cursor);
            page++;
        } else {
            break;
        }
    }
    return allMeetings;
}

async function getTranscript(transcriptUrl: string, id: string): Promise<string | null> {
    const transcriptRes = await fetch(transcriptUrl, { headers: HEADERS });
    if (!transcriptRes.ok) {
        console.warn(`Failed to fetch transcript for meeting ${id}`);
        return null;
    }
    let transcriptJson;
    try {
        transcriptJson = await transcriptRes.json();
    } catch (e) {
        console.error(`[DEBUG] Failed to parse transcript JSON for meeting ${id}:`, e);
        return null;
    }
    const plainText = transcriptJson.plain_text;
    if (!plainText) {
        console.warn(`[DEBUG] No plain_text field in transcript for meeting ${id}`);
        return null;
    }
    return plainText;
}

// Get title and date from meeting object
function getFileName(meeting: any, id: any) {
    const titleRaw = meeting.title || meeting.name || "meeting";
    const title = titleRaw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    // Use started_at for the date
    if (!meeting.started_at) {
        console.warn(`[DEBUG] No started_at field in meeting for id ${id}`);
    }
    let dateStr = "unknown-date";
    if (meeting.started_at) {
        const dateObj = new Date(meeting.started_at);
        if (!isNaN(dateObj.getTime())) {
            const month = dateObj.toLocaleString("en-US", { month: "short" }).toLowerCase();
            const day = dateObj.getDate();
            const hour = dateObj.getHours().toString().padStart(2, "0");
            const min = dateObj.getMinutes().toString().padStart(2, "0");
            dateStr = `${month}-${day}-${hour}${min}`;
        } else {
            console.warn(`[DEBUG] Could not parse started_at for meeting id ${id}:`, meeting.started_at);
        }
    }
    const filename = path.join(OUTPUT_DIR, `transcript-${title}-${dateStr}.txt`);
    return filename;
}

function extractIdFromPermalink(permalink: string): string | null {
    const match = permalink?.match(/calls\/(\d+)/);
    return match ? match[1] : null;
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

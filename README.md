# WhatsApp Issue Bridge

A Chrome and Edge extension plus a local companion service that turns selected WhatsApp Web messages into GitHub issues. The service uses the `gh` CLI to create issues and the Gemini CLI to help with the content.

**Status:** Working demo. The extension, the local service, the job queue and history, and the media capture are all in the code and run on one Windows machine. It is not deployed, and WhatsApp Web's page structure is handled by heuristics that may break when the site changes.

## The problem

Problems reported in WhatsApp group chats often never become tracked issues. This tool lets the user select the relevant messages in WhatsApp Web and create a GitHub issue from them in one click, with any media attached as evidence.

## What it does

- Content script on WhatsApp Web that finds messages, lets the user select them and shows a floating button (`extension/content.js`, `content.css`).
- Popup that shows the captured batch, a manual capture fallback, and a repository picker (`extension/popup.html`, `popup.js`).
- Local service on `127.0.0.1:8765` that lists the user's repositories through `gh repo list` (`GET /api/repos`) and accepts a job with messages for a chosen repository (`POST /api/jobs`).
- Job status and history endpoints (`GET /api/jobs/:id`, `GET /api/history`), plus a health check at `GET /api/health`.
- Media from the selected messages is copied into `server/data/jobs/<jobId>/` for Gemini to inspect, and the original paths are kept in the history file.

## How it's built

- Browser extension using Manifest-based content, background and popup scripts, loaded unpacked from `extension/`.
- Node.js service in TypeScript with Express and CORS, in `server/src/index.ts`. It runs jobs in memory, with the history saved to `server/data/history.json`.
- Shell calls go through `execFile` to `gh` and the Gemini CLI, so the service depends on both being installed and signed in.
- Windows startup: `server/whatsapp-issue-bridge.xml` describes a scheduled task, and `server/install-startup.ps1` registers it at logon. If registration fails, the script copies `start-bridge.cmd` into the user's Startup folder.

## Running it locally

```powershell
cd server
npm install
npm start
```

Then load `extension/` as an unpacked extension in `edge://extensions` or `chrome://extensions`. Check the service with `Invoke-RestMethod http://127.0.0.1:8765/api/health`, which should return `ok: true`.

To start it at logon, run `install-startup.ps1` from `server/`.

## What's left

- The service sets CORS to allow any origin (`app.use(cors())`) and accepts job requests without a token. Any web page open in the same browser could post a job, and each job creates a GitHub issue. Restricting the origin to the extension and adding a shared secret would close this.
- Each job creates a new issue. There is no duplicate check, and parallel jobs are not limited.
- WhatsApp Web's DOM changes often. The content script depends on heuristics, and the manual capture is the fallback.
- Media is copied to local disk with an 8 MB per-file limit, so `server/data/` keeps growing as jobs are added.
- No automated tests.

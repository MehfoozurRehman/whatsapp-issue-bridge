# WhatsApp Issue Bridge

Chrome/Edge extension + localhost companion service that turns selected WhatsApp Web messages into GitHub issues with Gemini CLI assistance.

## Run

```powershell
cd server
npm install
npm start
```

Then open `edge://extensions` (or `chrome://extensions`), enable **Developer mode**, choose **Load unpacked**, and select the repository's `extension/` directory. Pin the extension if desired. After selecting messages in WhatsApp Web, click the green floating button; opening the extension popup will show the captured batch.

The service listens on `http://127.0.0.1:8765`. Install `server/whatsapp-issue-bridge.xml` with `install-startup.ps1` to start it at Windows logon.

Verify the service with `Invoke-RestMethod http://127.0.0.1:8765/api/health`. The response should contain `ok: true`.

Each click on **Create issue** submits the current WhatsApp selection as one job and therefore creates one GitHub issue. A second selection and click creates a separate issue; jobs can run in parallel.

## Notes

WhatsApp Web is a private, frequently changing application. The content script uses resilient DOM heuristics and includes a manual capture fallback in the extension popup. Media bytes are copied into `server/data/jobs/<jobId>/` for Gemini inspection; the original local paths are retained in history.

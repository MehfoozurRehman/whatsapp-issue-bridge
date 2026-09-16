# WhatsApp Issue Bridge

Chrome/Edge extension + localhost companion service that turns selected WhatsApp Web messages into GitHub issues with Gemini CLI assistance.

## Run

```powershell
cd server
npm install
npm start
```

Then open `chrome://extensions` or `edge://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension/`.

The service listens on `http://127.0.0.1:8765`. Install `server/whatsapp-issue-bridge.xml` with `install-startup.ps1` to start it at Windows logon.

## Notes

WhatsApp Web is a private, frequently changing application. The content script uses resilient DOM heuristics and includes a manual capture fallback in the extension popup. Media is copied into `server/data/jobs/<jobId>/` and embedded in the issue body where GitHub permits local attachments; the original local paths are retained in history.

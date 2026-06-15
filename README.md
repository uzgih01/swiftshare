# P2P WebRTC File Transfer

High-speed, secure, direct browser-to-browser file sharing using WebRTC without server storage.

## Run Locally

**Prerequisites:** Node.js (16+)

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and update values as needed.
3. Run the app:
   `npm run dev`

## Build and Deploy

1. Create a production build:
   `npm run build`
2. Start the production server:
   `npm start`

For container or platform-specific deployment, ensure the `APP_URL` and `PORT` environment variables are set.

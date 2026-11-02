# MY Mirror — iPhone → Tesla browser

Personal experimental static web app. Live URL: https://choross82.github.io/iphone-tesla-mirror/

## Use
1. Open the live URL directly in iPhone Safari. Tap **화면 공유 시작** and select the entire display in the system picker, if offered.
2. Open the same URL in the parked Tesla browser. Choose **테슬라에서 받기** and enter the phone's 8-character code.
3. Compare the six-digit challenge on both devices. Approve on the phone. Then switch to Naver Maps or YouTube on the phone and verify the image keeps updating.

No Mac or local media server runs during use. Nothing is installed on the Tesla. Start with the Tesla connected to the iPhone personal hotspot.

## Honest limits
This is a physical-device test build, not a verified replacement for a native screen-broadcast app. A detected `getDisplayMedia` API does not prove whole-display capture, background operation, protected video or audio support. If iOS pauses capture after switching apps, this web implementation cannot bypass that restriction. The browser's picker determines the capture scope. Protected video may be black. Use the Tesla's Bluetooth audio if the stream has no audio track. This app does not capture the microphone or remotely control the phone.

Uses GitHub Pages static hosting and PeerJS 1.5.5 with the public PeerJS Cloud signaling service. No paid API or subscription is configured. Free service availability is not guaranteed. There is **no TURN media relay**, so some NAT/mobile networks will fail to connect. Direct WebRTC media is encrypted in transit. The app does not record, upload or store video. Signaling and STUN services necessarily handle network/connection metadata. Pairing is protected by a fresh random code, a random nonce and explicit phone approval. Anyone can view the public source; codes are not saved in source, URLs or browser storage.

Codes expire after 2 minutes before approval. Requests expire after 45 seconds; receiver approval wait 60 seconds. Sessions close after 1 hour, page exit, user stop or capture end. Navigating the sender away from the page ends the session; switching native apps depends on iOS behavior.

## Files / testing
`index.html`, `style.css`, `app.mjs`, `core.mjs` are deployed as static files. PeerJS is loaded from pinned jsDelivr npm distribution. No package install or build step is required.

Run `node --test core.test.mjs` and `node --check app.mjs`. These verify pairing validation and capture cancellation, not iPhone/Tesla runtime behavior. A connection-service diagnostic is available in the help section, without capturing a screen.

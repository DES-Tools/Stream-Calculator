# CCTV Stream Calculator

A lightweight browser tool for estimating IP camera bitrate and storage requirements. Pick a resolution, frame rate, codec, motion level, and quality setting to get a recommended bitrate, expected storage usage, and a table of same-aspect-ratio resolutions.

No build step, no dependencies — plain HTML/CSS/JS that runs entirely client-side.

## Live demo

https://des-tools.github.io/Stream-Calculator/

## Running locally

Open [index.html](index.html) directly in a browser, or serve the folder with any static file server.

## Features

- Bitrate and storage estimates for common and custom resolutions/frame rates
- H.264 / H.265 codec comparison and scene-motion adjustment
- Dark theme by default, with a light theme toggle (preference remembered via `localStorage`)
- Responsive layout, no external dependencies

## Disclaimer

Bitrate figures are based on common industry rules-of-thumb, not a specific manufacturer's encoder behavior. Use them for ballpark network/storage planning and validate against actual camera specs before final design.

## License

MIT — see [LICENSE](LICENSE).

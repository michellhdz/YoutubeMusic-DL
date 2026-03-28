# YouTube Music DL

> [!CAUTION]
> ### ⚖️ Legal Disclaimer / Descargo de Responsabilidad
> This tool is for **educational and personal research purposes only**. It was developed as a personal solution to manage and archive the developer's own music library, specifically to provide a more streamlined way to access personal tracks previously uploaded to YouTube Music where official export methods were found to be inefficient. The developer does not encourage or condone the unauthorized acquisition of copyrighted material. Users are solely responsible for complying with the YouTube Music Terms of Service and local copyright laws.

---

### The ultimate toolkit to achieve true offline portability for your music library.

This extension bridges the gap between streaming and your local high-fidelity players. It captures audio streams directly in-browser and reconstructs them into perfectly tagged, standalone `.m4a` files—ensuring your collection is never "locked in" and remains compatible with any offline hardware or software.

**The toolkit is specifically engineered to export and tag three main sources:**
1.  **Personal Uploaded Library**: Finally, an easy way to retrieve the tracks you've personally uploaded to the platform.
2.  **Official YouTube Music Catalog**: High-quality metadata embedding for all tracks available in the streaming service.
3.  **Podcasts**: Full support for archiving and tagging your favorite podcast episodes for offline listening.

## ✨ Features

* **Universal Metadata Capture**: Connects to the MediaSession APIs to extract and embed **Title, Artist, Album, Year, and Track Number** directly into the file structure.
* **Native Stream Processing & Zero Leaks**: Handles audio data using Vanilla JavaScript without external tools like `ffmpeg`. Aggressive Garbage Collection logic actively nullifies multi-megabyte `Uint8Array` payloads and revokes BLOB URIs instantly—guaranteeing your RAM footprint resets even after exporting long sessions.
* **Smart Artwork Processing**: Automatically standardizes cover art by converting thumbnails to high-quality, universally-compliant JPEGs via HTML5 Canvas.
* **Advanced Compatibility Patches**:
    * **M4A Standardization**: Enforces the `m4a` (AAC) container for maximum mobile and Hi-Fi compatibility.
    * **Atom Boundary Repair**: Fixes UTF-8 byte-offset bugs in standard MP4 atoms (`hdlr` and `ilst`).
    * **ISOBMFF Brand Optimization**: Implements a byte-level patch for fragmented MP4 (DASH) files, allowing offline systems to natively parse metadata without re-muxing.

## 🌐 Localization & Languages

This extension is fully multi-language and currently natively supports **English** and **Spanish**! 

The UI language syncs with your browser settings. **You are encouraged to add more languages!** Simply clone the repo, duplicate `_locales/en/messages.json` into a new language folder (e.g., `_locales/fr`), translate the strings, and submit a PR.

## 🚀 Setup

1.  Download this repository to your local machine.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **Developer mode**.
4.  Click **Load unpacked** and select the project directory.

## 🎧 Usage

1.  Navigate to `music.youtube.com`.
2.  While playing a track, playlist, or podcast, click the **Extension** icon.
3.  Verify the extracted metadata and artwork in the preview popup.
4.  Click **Export** to generate the localized file.
5.  Your file is now ready for any standard music player with all tags perfectly embedded!

## 🛠️ Technical Architecture

This project implements a custom ISO Base Media File Format (ISOBMFF) parser. It constructs compliant `moov > udta > meta > ilst` atom trees using `Uint8Arrays` and `DataViews`. By updating `mvex`-enabled DASH tracks with standardized `M4A ` brands, the tool allows offline systems to natively parse and trust the metadata without requiring heavy re-muxing operations.

---
*For educational use only. Contributions and technical discussions are welcome.*

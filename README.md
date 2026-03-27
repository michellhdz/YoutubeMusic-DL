# YTM Metadata Toolkit & Archiver

> [!CAUTION]
> ### ⚖️ Legal Disclaimer / Descargo de Responsabilidad
> This tool is for **educational and personal research purposes only**. It was developed as a personal solution to manage and archive the developer's own music library, specifically to provide a more streamlined way to access personal tracks previously uploaded to YouTube Music where official export methods were found to be inefficient. The developer does not encourage or condone the unauthorized acquisition of copyrighted material. Users are solely responsible for complying with the YouTube Music Terms of Service and local copyright laws.
> 

---

The ultimate toolkit to achieve true offline portability for your music library.

This extension allows you to bridge the gap between streaming and your local high-fidelity players. It captures audio streams directly in-browser and reconstructs them into perfectly tagged, standalone .m4a files—ensuring your personal collection is never "locked in" and remains compatible with any offline hardware or software.

## ✨ Features

* **Extended Source Support**: Seamlessly manage metadata for the official track catalog, **podcasts**, and your own **personal uploaded library**.
* **Native Stream Processing & Zero Leaks**: Handles audio stream data directly in the browser using Vanilla JavaScript without external tools like `ffmpeg`. Aggressive Garbage Collection logic actively nullifies multi-megabyte `Uint8Array` payloads, destroys Canvas image-contexts, and revokes standard BLOB URIs instantly upon download—guaranteeing your RAM footprint instantly resets even after exporting hours-long podcasts.
* **Deep Metadata Integration**: Connects to the MediaSession APIs to extract and embed **Title, Artist, Album, Year, and Track Number** directly into the file structure.
* **Smart Artwork Processing**: Automatically standardizes cover art by converting thumbnails to high-quality, universally-compliant JPEGs using HTML5 Canvas.
* **Advanced Compatibility Patches**:
    * **M4A Standardization**: Enforces the `m4a` (AAC) container for maximum compatibility with mobile devices and Hi-Fi systems.
    * **Atom Boundary Repair**: Fixes UTF-8 byte-offset bugs in standard MP4 atoms (`hdlr` and `ilst`).
    * **ISOBMFF Brand Optimization**: Implements a byte-level patch for fragmented MP4 (DASH) files, updating brand identifiers to ensure local metadata blocks are globally recognized by offline hardware.

## 🌐 Localization & Languages

This extension is fully multi-language and currently natively supports **English** and **Spanish**! 

The UI language automatically syncs with your browser's default settings. **You are completely free and encouraged to add more languages!** To contribute, simply clone the repository, duplicate the `_locales/en/messages.json` file into your own language code folder (e.g., `_locales/fr`), perfectly translate the string values, and submit a Pull Request.

## 🚀 Setup

1.  Download this repository to your local machine.
2.  Open Chrome and go to `chrome://extensions/`.
3.  Enable **Developer mode**.
4.  Click **Load unpacked** and select the project folder.

## 🎧 Usage

1.  Navigate to `music.youtube.com`.
2.  While playing a track, playlist, or podcast, click the **Extension** icon in your toolbar.
3.  Verify the extracted metadata and artwork in the preview popup.
4.  Click **Export** to generate the localized file.
5.  Your file is now ready for any standard music player with all tags perfectly embedded.

## 🛠️ Technical Architecture

This project implements a custom ISO Base Media File Format (ISOBMFF) parser. It constructs compliant `moov > udta > meta > ilst` atom trees using `Uint8Arrays` and `DataViews`. By updating `mvex`-enabled DASH tracks with standardized `M4A ` brands, the tool allows offline systems to natively parse and trust the metadata without requiring heavy re-muxing operations.

---
*For educational use only. Contributions and technical discussions are welcome.*
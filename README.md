# YTM Metadata Toolkit & Archiver

> [!CAUTION]
> ### ⚖️ Legal Disclaimer / Descargo de Responsabilidad
> This tool is for **educational and personal research purposes only**. It is designed to help users manage and add metadata to their own personal music libraries. The developer does not encourage or condone the unauthorized acquisition of copyrighted material. Users are solely responsible for complying with the YouTube Music Terms of Service and local copyright laws.
> 

---

A precision-engineered Chrome Extension designed to enhance the **interoperability and metadata integrity** of audio files within the YouTube Music ecosystem, specifically for personal library management.

This extension solves the common issue of broken ID3 tags and incompatible MP4 atoms, ensuring that your personal audio collection remains flawlessly organized and readable by professional offline software players.

## ✨ Features

* **Extended Library Support**: Seamlessly manage metadata for both the official catalog and your own **personal uploaded library**.
* **Native Stream Processing**: Handles audio stream data directly in the browser using Vanilla JavaScript, ensuring a lightweight footprint without external dependencies like `ffmpeg`.
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
2.  While playing a track from your library, click the **Toolkit** icon.
3.  Verify the extracted metadata and artwork in the preview popup.
4.  Click **Export/Save** to generate the localized file.
5.  Your file is now ready for any standard music player with all tags perfectly embedded.

## 🛠️ Technical Architecture

This project implements a custom ISO Base Media File Format (ISOBMFF) parser. It constructs compliant `moov > udta > meta > ilst` atom trees using `Uint8Arrays` and `DataViews`. By updating `mvex`-enabled DASH tracks with standardized `M4A ` brands, the tool allows offline systems to natively parse and trust the metadata without requiring heavy re-muxing operations.

---
*For educational use only. Contributions and technical discussions are welcome.*

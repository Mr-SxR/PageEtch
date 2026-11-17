<div align="center">

  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0,2,4,6,8,10&height=230&section=header&text=PageEtch&fontSize=52&fontColor=ffffff&fontAlignY=38&desc=Persistent%20Web%20Content%20Editor%20%7C%20Live%20DOM%20Customizer&descSize=18&descAlignY=62&animation=fadeIn" width="100%" alt="PageEtch Header Banner" />

  <p align="center">
    <a href="https://github.com/Mr-SxR/PageEtch/releases/tag/v2.0.0">
      <img src="https://img.shields.io/badge/Release-v2.0.0-0284c7?style=for-the-badge&logo=github&logoColor=white" alt="Release v2.0.0" />
    </a>
    <img src="https://img.shields.io/badge/Manifest-V3-10b981?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Manifest V3" />
    <img src="https://img.shields.io/badge/Platform-Chrome%20%7C%20Edge%20%7C%20Brave-f59e0b?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Supported Platforms" />
    <img src="https://img.shields.io/badge/License-MIT-38bdf8?style=for-the-badge" alt="License MIT" />
    <img src="https://img.shields.io/badge/Author-Mr--SxR-6366f1?style=for-the-badge&logo=github" alt="Author Mr-SxR" />
  </p>

  <p align="center">
    <strong>A modern, ultra-lightweight, and persistent web content customizer & live HTML editor.</strong><br>
    Edit any text, element, or layout on any webpage with permanent persistence across page reloads, client-side SPA routing, and dynamic DOM updates.
  </p>

  <p align="center">
    <a href="#-why-pageetch">Why PageEtch?</a> •
    <a href="#-key-features">Features</a> •
    <a href="#-use-cases">Use Cases</a> •
    <a href="#-installation-guide">Installation</a> •
    <a href="#-how-it-works">How It Works</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-faq--troubleshooting">FAQ</a>
  </p>

</div>

---

## 💡 Why PageEtch?

Have you ever used browser DevTools **"Inspect Element"** to modify text or clean up a page layout, only to watch all your changes vanish the moment you press **Refresh (F5)**?

**PageEtch solves this permanently.** 

PageEtch functions like a persistent visual client-side patcher. You select any element on any website, edit its text or HTML, and PageEtch automatically memorizes your modifications. Even on dynamic JavaScript-heavy web applications (such as React, Vue, Next.js, and Angular), PageEtch monitors client-side DOM transitions and re-applies your custom rules instantaneously.

---

## 🎯 Primary Use Cases

- 🎬 **Content Creators & Video Editors:** Cleanly edit or redact offensive, sensitive, or distracting on-screen text, names, emails, account numbers, or ads before recording tutorials, demos, and screen captures.
- 🎨 **Web Designers & Product Teams:** Prototype and preview copy changes, UI tweaks, and layout modifications directly inside live production websites without touching backend code.
- 🧹 **Custom Web Decluttering:** Permanently fix annoying typography, remove cluttered banners, or replace confusing labels on dashboards you visit every day.
- 🎭 **Educational & Creative Mockups:** Design realistic client previews, fun mockups, and presentations on real live sites with zero risk of accidental reload wipes.

---

## ✨ Key Features

### ⚡ Permanent Persistence Engine
- Changes survive page refreshes, tab closures, and browser restarts.
- Full support for client-side Single Page Application (SPA) routing (`popstate`, `hashchange`, Next.js/React Router route changes).

### 🎯 Multi-Tier Resilient Element Selectors
Dynamic websites frequently scramble class names and IDs. PageEtch utilizes an advanced multi-tier selector engine:
1. **Stable Document IDs** (ignoring dynamic hashes and generated tokens).
2. **Semantic & Accessibility Attributes** (`data-testid`, `data-qa`, `aria-label`, `name`).
3. **Clean Class Hierarchy & Structural Paths** (`:nth-of-type` fallback climbing).
4. **Normalized XPath Queries** for deep DOM trees.
5. **Fuzzy Text-Anchor Healing** to recover targets even if adjacent elements shift.

### 🌐 Smart Scope Management
Choose exactly where your customizations apply:
- **`Path Scope (/path)` (Default):** Applies to the specific route (e.g., all video pages under `/watch`).
- **`Entire Domain (*.site)`:** Global coverage across every page on that domain (perfect for headers, logos, and global notices).
- **`Exact URL`:** Strict targeting including query parameters and search strings.

### 🛡️ Zero-Leak Shadow DOM Isolation
The PageEtch editor dialog and hover inspector run inside a sandboxed **closed Shadow DOM (`#pageetch-root`)**, ensuring:
- Webpage CSS styles never break or distort the PageEtch UI.
- Page scripts cannot detect, interfere with, or hijack editor events.

### 📊 Modern Dual-View Dashboard
- **This Page View:** Real-time badge counter, quick element picker, and active page rules.
- **All Websites Library:** Centralized management console organizing all saved edits grouped by domain into collapsible accordions with instant live search and one-click domain clearing.

### 💾 Backup, Export & Portability
- Export your entire customization database to clean JSON format.
- Restore or transfer rules across browsers or computers with one click.

---

## 🚀 Installation Guide

### Option 1: Quick Release Install (Recommended)

1. Download the latest pre-packaged **[`PageEtch-v2.0.0.zip`](https://github.com/Mr-SxR/PageEtch/releases/tag/v2.0.0)** from the releases page.
2. Extract the `.zip` archive on your computer.
3. Open Google Chrome (or any Chromium browser: Brave, Edge, Opera, Vivaldi).
4. Navigate to the extensions manager:
   ```text
   chrome://extensions
   ```
5. Enable **Developer mode** using the toggle in the top-right corner.
6. Click the **Load unpacked** button in the top-left corner.
7. Select the extracted `PageEtch` folder.
8. Pin the extension to your toolbar for fast access!

### Option 2: Clone & Build from Source

```bash
# Clone the repository
git clone https://github.com/Mr-SxR/PageEtch.git

# Enter the project directory
cd PageEtch
```
Then load the directory directly in `chrome://extensions` via **Load unpacked**.

---

## 🕹️ How to Use

### 1. Visual Element Picker (Keyboard Shortcut)
1. Navigate to any website.
2. Press **`Alt + Shift + E`** (or click **Pick Element to Etch** in the popup).
3. Move your mouse over any text or container; an interactive highlight box with tag dimensions will appear.
4. Click on the target element.
5. In the editor modal, choose between:
   - **HTML Source:** Edit raw HTML markup, tags, or styles with 2-space tab indentation.
   - **Visual Text:** Direct live rich text editor.
   - **Compare Diff:** Instant side-by-side verification of original vs edited content.
6. Select your desired scope (`Path`, `Domain`, or `Exact URL`).
7. Click **Save & Persist** (or press `Ctrl + Enter` / `Cmd + Enter`).

### 2. Context Menu
- Right-click any text or element on the page.
- Click **Etch Content (Edit Element)** to launch the editor instantly.

---

## 🛠️ Architecture & Technology Stack

| Layer | Technology / Implementation |
| :--- | :--- |
| **Extension Standard** | Google Chrome Manifest V3 (MV3) |
| **Lifecycle Manager** | Ephemeral Service Worker (`background.js`) |
| **DOM Engine** | MutationObserver + Debounced Batch Patcher (`engine.js`) |
| **Selector Engine** | Multi-tier fallback (ID → Semantic → Hierarchy → XPath → Anchor) (`selector.js`) |
| **UI Sandbox** | Web Components Closed Shadow DOM (`modal.js`, `inspector.js`) |
| **Storage Layer** | Reactive `chrome.storage.local` with in-memory snapshot cache (`storage.js`) |
| **Styles** | Custom Dark Neumorphic Design System (`popup.css`) |

### Directory Layout

```text
PageEtch/
├── manifest.json            # Manifest V3 configuration & permission boundaries
├── background.js            # Background service worker & dynamic badge updater
├── content.js               # Content script entry point & message dispatcher
├── popup.html               # Dual-view extension popup interface
├── popup.css                # Dark modern design system & domain accordions
├── popup.js                 # Popup UI controller & library search engine
├── LICENSE                  # MIT Open Source License
├── icons/                   # Vector SVG & multi-resolution PNG assets
└── src/
    ├── core/
    │   ├── engine.js        # DOM MutationObserver & client-side SPA routing sync
    │   ├── selector.js      # Resilient CSS/XPath element fingerprint generator
    │   └── storage.js       # Enterprise local storage manager & schema migrations
    ├── ui/
    │   ├── inspector.js     # 60fps rAF-batched visual element hover picker
    │   └── modal.js         # Isolated Shadow DOM editor modal & diff viewer
    └── utils/
        └── helpers.js       # Universal URL sanitization, debouncing & DOM helpers
```

---

## 🛡️ Privacy & Security

- **100% Offline & Client-Side:** PageEtch does not run any external servers. All custom rules and text modifications stay stored inside your browser's private local storage.
- **Zero Telemetry / Zero Tracking:** No analytics, no tracking cookies, and no network requests.
- **Strict Content Security:** Built with strict Manifest V3 compliance — zero `eval()`, zero dynamic string execution, and zero remote code injection.

---

## ❓ Frequently Asked Questions (FAQ)

<details>
<summary><b>Does PageEtch modify the server or only my browser?</b></summary>
PageEtch runs strictly on the client-side within your browser. It does not alter databases or servers; it acts as a permanent visual patch layer on your machine.
</details>

<details>
<summary><b>Will my edits disappear if I restart my computer?</b></summary>
No. Your edits are saved permanently in persistent local storage until you choose to modify, toggle, or delete them.
</details>

<details>
<summary><b>How does PageEtch handle Single Page Applications (SPAs)?</b></summary>
PageEtch continuously monitors client-side route changes (`popstate`, `hashchange`) and combines a MutationObserver with an in-memory snapshot cache to immediately re-etch elements whenever dynamic views re-render.
</details>

---

## 🤝 Contributing

Contributions, feature suggestions, and bug reports are welcome! 
Feel free to open an issue or submit a pull request on the [PageEtch Repository](https://github.com/Mr-SxR/PageEtch).

---

## 📄 License

This project is licensed under the **MIT License** — see the [`LICENSE`](LICENSE) file for details.

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/Mr-SxR">Masudur Rahman Sifat (Mr-SxR)</a></sub>
</div>

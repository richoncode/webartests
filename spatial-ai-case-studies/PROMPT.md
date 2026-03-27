# Spatial AI Case Study: Creation Protocol

Use this prompt to generate new high-fidelity, interactive architectural reports for the `spatial-ai-case-studies/` directory.

---

## 1. Deep Research Requirements
Before writing any code, perform exhaustive research on the target company/platform to extract:
- **Core Architecture:** Identify the central "bottleneck" or "engine" (e.g., NVIDIA's Nucleus, AMI's Latent Model, World Labs' GenAI Pipeline).
- **Data Flow & Pipelines:** Map how data moves from sensors/prompts -> internal representation -> output/action.
- **Data Types & Workloads:** Contrast at least 3 distinct data structures (e.g., 3D Gaussians vs. Meshes vs. Tensors) and their resource profiles (VRAM, Bandwidth, Compute).
- **Foundational Research:** Identify at least 3 key academic papers or technical whitepapers that underpin the technology.
- **Strategic Partnerships:** Research 3-4 specific industry verticals or partnership tiers (e.g., AEC, Robotics, Defense).

---

## 2. Technical Mandates
- **Single-File Architecture:** All CSS and JS must be inline. No `package.json` or external assets.
- **Libraries:** Use Tailwind CSS (CDN) and Chart.js (CDN).
- **No SVGs/Mermaid:** All diagrams must be built using HTML/CSS Grid/Flexbox with interactive JavaScript-driven states.
- **Sticky Navigation:** Every page MUST have a sticky top navigation bar (`position: sticky; top: 0; z-index: 50;`) containing:
    - A `← Back` link to the hub directory (`../`).
    - The company logo/name.
    - Anchor links to major sections (Architecture, Data, Partnerships).
- **Verified Evidence Linking:** Partnership opportunities must link directly to an active, relevant page **on the subject company's own official domain**. 
    - **NO IMAGINED PAGES:** You MUST NOT guess or assume a URL exists. Every link provided must be an actual, working page that has been verified through research.
    - **UNVERIFIED CLAIMS:** If a partnership area is deduced through research but a specific supporting page on the company's domain cannot be confirmed, you MUST label it: **"Deduced: needs validation"** (no link).
    - **NO THIRD-PARTY LINKS:** DO NOT link to "partner" companies. The evidence must come from the subject company's own site.
    - **Style:** Use an italicized link style (e.g., *Official Focus &rarr;*) for verified links, or the plain text "Deduced: needs validation" for others.
- **Favicon:** Generate a unique, branded SVG favicon via a data URI in the `<link rel="icon">` tag.

---

## 3. UI/UX & Design Tokens (World Labs Standard)
- **Visual Identity:** All pages MUST adhere to the established "World Labs" aesthetic:
    - **Background:** `#f8fafc` (Slate-50) with `#ffffff` (White) section cards.
    - **Primary Accent:** `#0d9488` (Teal-600) for active nodes, headers, and primary badges.
    - **Typography:** `Inter` system stack.
    - **Palette:** Slate text (`#1e293b`), Slate borders (`#e2e8f0`), Teal accents.
- **Layout:**
    - **Section Cards:** Use the `.section-card` class (padding: 2.5rem, white bg, subtle border/shadow) for all primary content blocks.
    - **Sticky Nav:** Standardized sticky header with company logo badge and anchor links.
    - **Partnership Grid:** 3-column grid (on desktop) using the specific World Labs card layout:
        - Large Emoji icon.
        - Bold Title.
        - Leading-relaxed description.
        - Footer with a `tag-badge` and either a verified italicized link or the "Deduced: needs validation" label.

---

## 4. Implementation Template Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Favicon, Tailwind, Chart.js, and Custom CSS -->
</head>
<body class="antialiased">
    <!-- Sticky Nav with Back Link -->
    <!-- Hero Section with Executive Summary -->
    <!-- Section 1: Interactive Architecture Pipeline -->
    <!-- Section 2: Data Workload Comparison (Chart.js) -->
    <!-- Section 3: Research Paper Deep-Dives -->
    <!-- Section 4: Filterable Partnership Opportunities -->
    <!-- Footer -->
    <!-- JavaScript State Management & Event Handlers -->
</body>
</html>
```

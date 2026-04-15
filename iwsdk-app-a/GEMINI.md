# IWSDK Application Project Context (iwsdk-app-a)

This project is a Spatial Computing (XR/AR) application built using the **Immersive Web Software Development Kit (IWSDK)**. It demonstrates core features like hand tracking, spatial UI, object interaction, and ECS-based game logic.

## Project Overview

- **Technologies:** Vite, TypeScript, Three.js (`super-three`), `@iwsdk/core`.
- **Framework:** Uses the IWSDK Entity Component System (ECS) for managing application state and behavior.
- **Rendering:** Three.js is used for 3D scene management, integrated with the IWSDK `World` and `AssetManager`.
- **UI System:** UI is defined in `.uikitml` files (HTML/CSS-like syntax) located in the `ui/` directory. These are compiled to JSON format in `public/ui/` by the `@iwsdk/vite-plugin-uikitml` plugin for use in the spatial environment.

## Key Architecture & Components

### 1. Entry Point (`src/index.ts`)
The `World.create()` function initializes the XR session.
- **XR Features:** Hand tracking, anchors, hit testing, plane/mesh detection, and layers are enabled.
- **Assets:** Managed via an `AssetManifest` (GLTF, Audio, Textures).
- **Entities:** Created using `world.createTransformEntity()`, with components like `Interactable`, `DistanceGrabbable`, `AudioSource`, and `PanelUI`.

### 2. Core Systems
- **`PanelSystem` (`src/panel.ts`):** Manages spatial UI interactions, specifically the "Enter XR" button logic.
- **`RobotSystem` (`src/robot.ts`):** Handles the "Robot" entity, making it look at the player and playing sounds on interaction.
- **`DropTTTSystem` (`src/drop-ttt.ts`):** A sophisticated game system for "Drop-TTT" (Tic-Tac-Toe / Connect-N variants). Includes:
    - Game state management (turn-based, win detection).
    - AI opponent using alpha-beta pruning.
    - Dynamic board construction and piece animation.
    - Integration with `game-status.json` UI.

### 3. UI Definitions (`ui/`)
- `welcome.uikitml`: The initial greeting panel.
- `game-status.uikitml`: The game HUD and menu for the Drop-TTT game.

## Building and Running

- **Development:** `npm run dev`
  - Starts a Vite development server (default port 8081).
  - Uses `mkcert` for local HTTPS (required for WebXR).
  - Includes an XR emulator for Meta Quest 3 via `@iwsdk/vite-plugin-dev`.
- **Build:** `npm run build`
  - Compiles TypeScript and UIKitML, and bundles the application into the `dist/` directory.
- **Preview:** `npm run preview`
  - Serves the production build locally.
- **Testing:** `npx playwright test`
  - Runs end-to-end tests located in `tests/`.

## Development Conventions

- **ECS Pattern:** Always define logic in **Systems** (`createSystem`) and state in **Components** (`createComponent`). Register systems with `world.registerSystem()`.
- **Spatial UI:** Use `PanelUI` component with a `.json` config path. Interact with UI elements via `PanelDocument` and `UIKitDocument` in your systems.
- **Interactions:** Use `Interactable` and `DistanceGrabbable` for physical object interactions.
- **Asset Loading:** All assets should be declared in the `AssetManifest` in `src/index.ts` to ensure proper preloading and management by `AssetManager`.
- **Visual Feedback:** Remind the user to perform a **Hard Refresh (Cmd+Shift+R)** after making UI/CSS changes in `.uikitml` files.

########################################
# !!! REMINDER: Hard Refresh (Cmd+Shift+R) !!! #
########################################

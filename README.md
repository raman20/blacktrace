# Black Trace: Player Journey Visualization

**Black Trace** is a game telemetry visualization tool designed exclusively for Level Designers. It renders massive sets of player trajectories, combat events, and traffic heatmaps directly in the browser at 60 FPS using the HTML5 Canvas API and a static read-optimized JSON pipeline.

## 🌟 Key Features

- **Macro View Heatmaps:** Instantly aggregate hundreds of matches to visualize high-traffic chokepoints and deadly combat zones.
- **Timeline Playback:** Scrub through individual matches via the interactive timeline to watch player rotations unfold in real-time.
- **AI vs Human Tracking:** Instantly distinguish between Bot paths (Glowing Neon Pink) and Human paths (Glowing Cyan).
- **Geometric Event Markers:** Easily spot Looting (Green Squares), Player Deaths (Red Circles), and Storm Deaths (Cyan Triangles).
- **Infinite Pan & Zoom:** Freely drag, pan, and zoom around the ultra-high-resolution map images to inspect micro-engagements.

## 🚀 How to Run Locally

This project requires zero backend databases or servers. All telemetry is pre-processed into a static format.

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Start the local development server:**
   ```bash
   npm run dev
   ```

3. **Open in Browser:**
   Navigate to `http://localhost:5173` (or the URL provided by Vite in your terminal).

## 🎮 How to Use the Tool

### UI Layout Wireframe
```text
+-----------------+------------------------------------------+-----------------+
|   Environment   |                                          |   Lobby Stats   |
|   Dropdown      |                                          |                 |
+-----------------+             Map Viewport                 |  Humans | Bots  |
|                 |          (HTML5 Canvas UI)               |   100   |  50   |
|                 |                                          +-----------------+
|  Matches by     |                                          |                 |
|  Date (Tree)    |       [Player Paths]                     |                 |
|   [ ] Date 1    |          [Deaths]                        |  Match Event    |
|    [ ] Match A  |                                          |  Log (Feed)     |
|    [ ] Match B  |                                          |                 |
|                 |                                          |  PlayerX killed |
|                 |                                          |  PlayerY        |
+-----------------+                                          |                 |
|  Map Markers    |                                          |  BotZ died to   |
|  [x] Paths      |                                          |  Storm          |
|  [x] Humans     |                                          |                 |
|  [x] Bots       +------------------------------------------+                 |
|  [x] Deaths     | Playback Slider: 0:00 [========] 25:00   |                 |
|  [x] Kills      | [Play] [Reset] | Heatmaps: [None/Traffic]|                 |
+-----------------+------------------------------------------+-----------------+
```

### The Tree View Sidebar (Left)
- **Map Selection:** Use the dropdown at the very top left to switch between `AmbroseValley`, `GrandRift`, and `Lockdown`.
- **Single Match Mode:** Click the text of any match in the tree view to instantly load its timeline. You can press the **Play** button to watch the match unfold!
- **Macro View Mode:** Click the **Checkboxes** next to dates or specific matches to select multiple matches at once. This disables the timeline and activates the Macro Heatmap capabilities.

### Map Markers & HUD (Right)
- **Heatmaps:** When in Macro View (multiple matches selected), use the Heatmap dropdown to overlay aggregated Traffic or Combat (Kills/Deaths) densities.
- **Marker Toggles:** Use the checkboxes to overlay static geometric markers (Loot, Deaths, Kills) directly onto the map or on top of heatmaps.
- **Hover Insights:** Hover your mouse over any active player or marker on the map to see their exact X/Z coordinates, elevation, and User ID.

## 📄 Documentation

For grading evaluation, please review the following required documents located in the root of the project:

- [`ARCHITECTURE.md`](./ARCHITECTURE.md): Contains the tech stack breakdown, the zero-dependency JSON data pipeline, and the mathematical formula used to map 3D world coordinates to the 2D canvas pixels.
- [`INSIGHTS.md`](./INSIGHTS.md): Contains three actionable, data-driven insights discovered using this tool's heatmap and timeline capabilities.

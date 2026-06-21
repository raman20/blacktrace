# Black Trace: Player Journey Visualization

🚀 **Live Deployment:** [https://raman20.github.io/blacktrace/](https://raman20.github.io/blacktrace/)
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
|   Maps          |                                          |   Lobby Stats   |
|   Dropdown      |                                          |                 |
+-----------------+             Map Viewport                 |  Humans | Bots  |
|                 |          (HTML5 Canvas UI)               |   100   |  50   |
|                 |                                          +-----------------+
|  Matches        |                                          |                 |
|   > Date 1      |       [Player Paths]                     |  Match Event    |
|    [ ] Match A  |          [Deaths]                        |  Log (Feed)     |
|       [> Play]  |                                          |                 |
|    [ ] Match B  |                                          |  PlayerX killed |
|                 |                                          |  PlayerY        |
+-----------------+                                          |                 |
|  Markers        |                                          |  BotZ died to   |
|  [x] Paths      |                                          |  Storm          |
|  [x] Humans     |                                          |                 |
|  [x] Bots       +------------------------------------------+                 |
|  [x] Deaths     | Playback Slider: 0:00 [========] 25:00   |                 |
|  [x] Kills      | [Play] [X Close] | Heatmaps: [Traffic]   |                 |
+-----------------+------------------------------------------+-----------------+
```

### The Collapsible Sidebar (Left)
- **Maps:** Use the dropdown at the very top left to switch between `AmbroseValley`, `GrandRift`, and `Lockdown`.
- **Single Match Timeline:** Click the glowing **Play** button on any match card to instantly preview its timeline. Press the **X** button to close it.
- **Macro View Aggregation:** Click the **Checkboxes** next to dates or specific matches to select multiple matches at once. This activates the Macro Heatmap capabilities.

### Map Markers & HUD (Right)
- **Shareable Links:** Click the **Share** button on the Canvas HUD to instantly capture your exact state (Map, Checkboxes, Heatmap mode, Timestep) and copy a shareable deep-link to your clipboard.
- **Independent Heatmap Scoping:** Heatmaps dynamically adhere to your selection scope. If you check multiple matches, the heatmap aggregates across *all* of them—even if you dive into a single match's playback timeline.
- **Marker Toggles:** Use the checkboxes to overlay static geometric markers (Loot, Deaths, Kills) directly onto the map or on top of heatmaps.
- **Hover Insights:** Hover your mouse over any active player or marker on the map to see their exact X/Z coordinates, elevation, and User ID.

## 📄 Documentation

For grading evaluation, please review the following required documents located in the root of the project:

- [`ARCHITECTURE.md`](./ARCHITECTURE.md): Contains the tech stack breakdown, the zero-dependency JSON data pipeline, and the mathematical formula used to map 3D world coordinates to the 2D canvas pixels.
- [`INSIGHTS.md`](./INSIGHTS.md): Contains three actionable, data-driven insights discovered using this tool's heatmap and timeline capabilities.

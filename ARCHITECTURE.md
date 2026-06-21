# Architecture & Engineering Decisions

## Tech Stack
**What I built with & why I picked it:**
- **Frontend Framework:** React + Vite. I chose React for its component-driven architecture and rich ecosystem, allowing me to build a highly interactive UI with complex state management easily. Vite ensures an ultra-fast build and development experience.
- **Data Engine:** Pre-processed Read-Optimized JSON over HTTP. Instead of bringing a heavy analytical engine (like DuckDB-Wasm) or a Node backend into the browser, I chose a zero-dependency static architecture. The raw Parquet files are compiled into read-optimized, pre-binned JSON dictionaries during the build step, ensuring 100% reliability and lightning-fast load times.
- **Rendering:** HTML5 Canvas API. The sheer volume of telemetry points (trajectories, heatmaps, events) would crush DOM-based rendering (like SVG or div markers). Canvas allows for highly performant, immediate-mode rendering of thousands of particles and lines at a smooth framerate.
- **Styling:** Vanilla CSS with a custom Glassmorphism UI. I avoided heavy component libraries to maintain absolute control over the highly customized sidebar hierarchy and HUD overlays, keeping the aesthetic extremely premium.

## Data Flow Pipeline
1. **Pre-Processing (Python script):** A Python build script parses the raw Parquet files and executes heavy aggregation ahead of time. It generates a static `manifest.json` and converts the massive telemetry sets into lightweight, read-optimized JSON files (pre-grouped by player trajectories and pre-binned for heatmaps).
2. **Initialization:** When the React app loads, it fetches the `manifest.json` to instantly populate the Tree View sidebar (grouped by Map -> Date -> Match) without needing to query heavy data files.
3. **Fetching:** When a user selects a match, `dataService.js` performs a simple static HTTP fetch for that specific match's `.json` payload.
4. **Data Extraction:** The pre-processed JSON guarantees instant access to distinct subsets of data: Time-series player trajectories, isolated event coordinates (kills, deaths, loot), and aggregated heatmap point densities without any client-side blocking calculation.
5. **Rendering Loop:** The React state is updated with this parsed data. The `useEffect` hooks pass the data to the HTML5 Canvas context, which applies the Pan/Zoom transformations and draws the pixels flawlessly over the background Minimap image.

## Coordinate Mapping Approach
Mapping the 3D world coordinates to the 2D Minimap image required deriving a linear affine transformation for each specific map. 

The formula applied is:
`Pixel = ((WorldCoord - Origin) / Scale) * CanvasSize`

**The Process:**
1. I analyzed the extreme min/max values of the `x` and `z` coordinates for the players in each map's parquet file during the pre-processing step.
2. I mapped these extremed limits against the visual bounds of the provided 1024x1024 minimap images.
3. **AmbroseValley Example:** I found an origin offset (`originX: -370, originZ: -473`) and a physical map scale length (`scale: 900`). 
4. Applying these constants transforms the raw world coordinates to a normalized `0.0` to `1.0` space.
5. Finally, multiplying by the Canvas Resolution (`1024`) outputs the exact physical pixel.
*Note: The Y-axis (Elevation) is ignored for 2D X/Z rendering but is surfaced natively in hover tooltips for analytical depth.*

## Assumptions & Ambiguities
- **Duplicate Match IDs:** I discovered that the telemetry data sporadically reused identical `match_id` strings across entirely different dates (e.g., "Match_5" appearing on Feb 10 and Feb 11). I assumed this was a backend ingestion artifact. To fix it, I enforced a strict composite key logic (`match_id` + `date`) across the entire frontend state to prevent cross-date visual checkbox bleeding.
- **Bot Detection:** The instructions requested visual distinction for bots. The parquet files include an `is_bot` boolean. I assumed this boolean was authoritative and color-coded all trajectories, markers, and tooltips based on this flag (Cyan for Humans, Amber for Bots).
- **Macro View Scaling:** When aggregating heatmaps across hundreds of matches simultaneously, the sheer density of points would oversaturate the canvas. I assumed that Level Designers only care about the *relative* density of combat/traffic. I applied a dynamic opacity algorithm `alpha = Math.min(weight * 0.08, 0.95)` to ensure the 256-step heatmap gradient (Blue -> Red) scales elegantly without blowing out to pure red everywhere.

## Major Trade-offs
| Decision | Alternative Considered | Why I chose this path |
| :--- | :--- | :--- |
| **Zero-Dependency JSON** | Browser-side DuckDB | By converting Parquet to JSON at build-time, I eliminated the massive initial WASM payload download and the CPU overhead of client-side SQL execution. The UX is instantaneous. |
| **HTML5 Canvas** | SVG / WebGL | SVG crashes with >50k nodes. WebGL is overkill for 2D. Canvas 2D is the perfect sweet spot for rapid development and high performance. |
| **Tree-View Sidebar** | Paginated List / Dropdowns | A traditional list was too cluttered for 5 days of matches. The hierarchical Date-Group tree allows mass-selection for Macro Views instantly. |
| **Client-Side Manifest** | Dynamic File System Scanning | Browsers can't read directories. Running a Python script to pre-generate a `manifest.json` allows the static frontend to "know" about all files natively. |
| **On-Demand URL Sharing** | Live React Router / History API | Constantly replacing the URL bar state on every scrub/toggle bloated the browser history stack. I avoided live URL syncing and implemented a dedicated `generateShareUrl()` capture button that securely builds the state representation on demand and dumps it to the clipboard. |

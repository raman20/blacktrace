# Player Journey Insights

*The following patterns were discovered by aggregating matches using the custom Black Trace Macro Heatmap tool and Timeline Playback.*

## 1. The "Honey Pot" Bloodbath (AmbroseValley)

**What caught my eye:** By selecting all matches for AmbroseValley in the sidebar and choosing "Traffic Heatmap" from the dropdown, a massive density spike appears as a bright red cluster near the coordinate zone X:0, Z:-100. If you keep the Traffic Heatmap on and toggle the "Show Deaths" checkbox in the HUD menu, this exact same visual quadrant is immediately buried under a massive concentration of red circle death markers, proving it's the deadliest zone in the map.
**Why a Level Designer should care:** Players are consistently rushing this specific hot-zone for high-tier loot, but it operates as a massacre trap. 
**Actionable Item:** Review the 3D geometry and cover in this zone. If the area is too open, the designer must either decentralize the loot spawns to relieve traffic pressure or inject more natural cover (rocks, dilapidated buildings, trenches) so players aren't completely exposed "sitting ducks" while interacting with loot chests. Affected metrics: *Time-To-First-Death*, *Average Match Survival Time*.

## 2. Severe Storm Pathing Traps (Lockdown)

**What caught my eye:** While using the Event Filter toggles to isolate "Storm Deaths" across the Macro view, I noticed that the tiny map 'Lockdown' had a surprising visual density of storm death markers relative to its size. By scrubbing through the Timeline Playback on specific Lockdown matches, I could visually watch players get caught behind geometry as the storm circle closed, matching the same raw number of storm deaths as the massive AmbroseValley map despite having a fraction of the total matches.
**Why a Level Designer should care:** Players are failing to extract or rotate into the safe zone at a highly disproportionate rate on this specific map, leading to frustrating PvE deaths rather than engaging PvP combat.
**Actionable Item:** The designer needs to investigate the map's outer-ring chokepoints. Are there massive walls, unscalable cliffs, or funnel-traps that block players from running out of the storm? The pathing routes to the center need to be widened or cleared. Affected metrics: *PvP Death Ratio*, *Player Frustration / Churn Rate*.

## 3. Hot-Drop vs Rotational Gameplay Flow

**What caught my eye:** By choosing "None" for the heatmap and simply toggling on "Show Deaths" (Red Circles) and "Show Looting" (Green Squares) for 'Lockdown', the visual UI shows a perfect overlap—the densest cluster of red deaths is exactly underneath the densest cluster of green loot squares. However, when I switched the tool's map dropdown to 'GrandRift' and applied the exact same toggles, the visual red death clusters and the green loot clusters are physically separated into entirely different quadrants of the map image.
**Why a Level Designer should care:** This proves a fundamental difference in map flow. GrandRift successfully encourages "Rotational Combat" (players land, loot relatively safely, and then rotate into a central battlefield). Lockdown suffers from "Hot-Drop Combat" (players land on the best loot and immediately die in the exact same spot).
**Actionable Item:** If Lockdown is intended to be a methodical extraction shooter map, the loot economy is currently failing that goal. The designer must aggressively decentralize the loot pools away from the center to force players to travel and survive longer. Affected metrics: *Map Traversal Distance*, *Mid-Game Engagement Rate*.
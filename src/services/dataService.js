// Simple, read-optimized JSON telemetry loading service
// This replaces DuckDB-Wasm completely, ensuring 100% reliability and zero WASM dependencies

// In-memory cache for the selected match data
let currentMatchData = null;

// Fetches and parses the read-optimized JSON match file
export async function loadMatchData(filePath) {
  // Build absolute URL for the static public folder
  const fileUrl = `${import.meta.env.BASE_URL}${filePath}`;
  console.log(`Fetching read-optimized match data: ${fileUrl}`);
  
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    currentMatchData = await response.json();
    console.log(`Match ${currentMatchData.match_id} successfully loaded in memory.`);
    return true;
  } catch (error) {
    console.error(`Failed to load JSON file: ${filePath}`, error);
    throw error;
  }
}

// Retrieves player and bot trajectories, flattened and sorted for App.jsx coordinate renderer
export async function getTrajectories() {
  if (!currentMatchData) return [];
  
  const flattened = [];
  
  // Reconstruct flat timeline items from the pre-grouped dictionary
  Object.keys(currentMatchData.trajectories).forEach(uid => {
    const isBot = !uid.includes('-') && uid.length <= 10;
    const eventName = isBot ? 'BotPosition' : 'Position';
    
    currentMatchData.trajectories[uid].forEach(pt => {
      flattened.push({
        user_id: uid,
        x: pt.x,
        y: pt.y,
        z: pt.z,
        ts: pt.ts,
        event: eventName
      });
    });
  });
  
  // Sort chronologically by relative timestamp ts
  return flattened.sort((a, b) => a.ts - b.ts);
}

// Retrieves combat and environmental event markers
export async function getEvents() {
  if (!currentMatchData) return [];
  // Return pre-sorted events directly
  return currentMatchData.events;
}

// Retrieves pre-binned position coordinates for the Traffic Heatmap
export async function getTrafficHeatmap() {
  if (!currentMatchData) return [];
  return currentMatchData.heatmaps.traffic;
}

// Retrieves pre-binned combat coordinates for Kills and Deaths Heatmaps
export async function getCombatHeatmap(type = 'kills') {
  if (!currentMatchData) return [];
  if (type === 'kills') {
    return currentMatchData.heatmaps.kills;
  } else {
    return currentMatchData.heatmaps.deaths;
  }
}

// Loads multiple matches and aggregates their heatmaps for a Macro View
export async function loadMacroMatchData(matches) {
  console.log(`Fetching macro data for ${matches.length} matches...`);
  
  const aggregatedData = {
    match_id: 'MACRO_VIEW',
    map_id: matches[0]?.map_id || 'Unknown',
    trajectories: {},
    events: [],
    heatmaps: {
      traffic: [],
      kills: [],
      deaths: []
    }
  };

  // Fetch all matches in parallel
  const fetchPromises = matches.map(match => {
    const fileUrl = `${import.meta.env.BASE_URL}${match.file_path}`;
    return fetch(fileUrl).then(res => res.ok ? res.json() : null).catch(() => null);
  });

  const results = await Promise.all(fetchPromises);
  
  // Aggregate heatmaps and events
  results.forEach(data => {
    if (!data) return;
    
    // We only aggregate heatmaps for macro view (trajectories would be too massive)
    if (data.heatmaps) {
      if (data.heatmaps.traffic) aggregatedData.heatmaps.traffic.push(...data.heatmaps.traffic);
      if (data.heatmaps.kills) aggregatedData.heatmaps.kills.push(...data.heatmaps.kills);
      if (data.heatmaps.deaths) aggregatedData.heatmaps.deaths.push(...data.heatmaps.deaths);
    }
    
    if (data.events) {
      aggregatedData.events.push(...data.events);
    }
  });

  currentMatchData = aggregatedData;
  console.log(`Macro view aggregated successfully.`);
  return true;
}

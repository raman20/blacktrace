import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, ZoomIn, ZoomOut, LocateFixed, 
  Map as MapIcon, Calendar, Users, Eye, EyeOff, ShieldAlert,
  Flame, Skull, Package, Compass, Crosshair, ChevronRight, ChevronDown, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen
} from 'lucide-react';
import { 
  loadMatchData, getTrajectories, getEvents, 
  getTrafficHeatmap, getCombatHeatmap, loadMacroMatchData 
} from './services/dataService';
import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import MapViewport from './components/MapViewport';
import './App.css';

// Map metadata configuration
const MAP_CONFIGS = {
  AmbroseValley: { scale: 900, originX: -370, originZ: -473, image: `${import.meta.env.BASE_URL}minimaps/AmbroseValley.png` },
  GrandRift: { scale: 581, originX: -290, originZ: -290, image: `${import.meta.env.BASE_URL}minimaps/GrandRift.png` },
  Lockdown: { scale: 1000, originX: -500, originZ: -500, image: `${import.meta.env.BASE_URL}minimaps/Lockdown.jpg` }
};

// Helper: Convert world coordinates (x, z) to pixel coordinates (0-1024)
function worldToPixel(x, z, mapConfig, canvasSize = 1024) {
  const u = (x - mapConfig.originX) / mapConfig.scale;
  const v = (z - mapConfig.originZ) / mapConfig.scale;
  const px = u * canvasSize;
  const py = (1 - v) * canvasSize; // Flip for screen coordinates (Y decreases upwards)
  return { x: px, y: py };
}

// Format duration from ms to mm:ss
function formatTime(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function App() {
  // Sidebar toggle states
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);

  // Master manifest and filters
  const [manifest, setManifest] = useState([]);
  const [maps, setMaps] = useState([]);
  const [dates, setDates] = useState([]);
  const [selectedMap, setSelectedMap] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [checkedMatches, setCheckedMatches] = useState([]);
  const [collapsedDates, setCollapsedDates] = useState([]);
  
  // App states
  const [duckdbLoading, setDuckdbLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Playback control state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // Telemetry data
  const [trajectories, setTrajectories] = useState([]);
  const [events, setEvents] = useState([]);
  
  // Heatmap binned points
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  
  // Minimap image element cache
  const [minimapImage, setMinimapImage] = useState(null);
  const [mapImageLoaded, setMapImageLoaded] = useState(false);
  
  // UI layer manager switches
  const [showPaths, setShowPaths] = useState(true);
  const [showHumans, setShowHumans] = useState(true);
  const [showBots, setShowBots] = useState(true);
  const [showKills, setShowKills] = useState(true);
  const [showDeaths, setShowDeaths] = useState(true);
  const [showLoot, setShowLoot] = useState(true);
  const [showStorm, setShowStorm] = useState(true);
  const [heatmapType, setHeatmapType] = useState('none'); // 'none' | 'traffic' | 'kills' | 'deaths'
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.7);
  const [heatmapRadius, setHeatmapRadius] = useState(20);
  
  // Panning & Zooming
  const [zoom, setZoom] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Tooltip interactive state
  const [hoveredEntity, setHoveredEntity] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  
  // DOM references
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const killFeedRef = useRef(null);
  
  const [initialUrlParsed, setInitialUrlParsed] = useState(false);
  const isFirstMapLoad = useRef(true);
  
  // Load manifest.json index on mount
  useEffect(() => {
    async function fetchManifest() {
      try {
        setLoadingStatus("Fetching manifest database...");
        const response = await fetch(`${import.meta.env.BASE_URL}data/manifest.json`);
        if (!response.ok) throw new Error("Failed to load manifest.json");
        const data = await response.json();
        setManifest(data);
        
        // Populate filter selectors
        const uniqueMaps = [...new Set(data.map(m => m.map_id))];
        const uniqueDates = [...new Set(data.map(m => m.date))];
        setMaps(uniqueMaps);
        setDates(uniqueDates);
        
        // URL Hydration Initial Load
        const urlParams = new URLSearchParams(window.location.search);
        const urlMap = urlParams.get('map');
        
        if (urlMap && uniqueMaps.includes(urlMap)) {
          setSelectedMap(urlMap);
        } else if (uniqueMaps.length > 0) {
          setSelectedMap(uniqueMaps[0]);
        }
        
        setLoadingStatus("");
      } catch (err) {
        console.error(err);
        setErrorMsg("Error loading metadata index. Please check your data folder.");
      }
    }
    fetchManifest();
  }, []);
  
  // URL Syncing & Hydration (Runs after manifest and map are loaded)
  useEffect(() => {
    if (manifest.length > 0 && selectedMap && !initialUrlParsed) {
      const urlParams = new URLSearchParams(window.location.search);
      
      const layers = urlParams.get('layers');
      if (layers) {
        setShowPaths(layers.includes('paths'));
        setShowHumans(layers.includes('humans'));
        setShowBots(layers.includes('bots'));
        setShowKills(layers.includes('kills'));
        setShowDeaths(layers.includes('deaths'));
        setShowLoot(layers.includes('loot'));
        setShowStorm(layers.includes('storm'));
      }
      
      const hm = urlParams.get('hm');
      if (hm) setHeatmapType(hm);
      
      const t = urlParams.get('t');
      const startTime = t ? Number(t) : 0;
      
      const matchesStr = urlParams.get('match');
      if (matchesStr) {
        const matchIds = matchesStr.split(',');
        if (matchIds.length === 1) {
          const matchObj = manifest.find(m => m.match_id === matchIds[0]);
          if (matchObj) {
            handleMatchChange(matchObj, startTime, hm || 'none');
          }
        } else {
          const matches = manifest.filter(m => matchIds.includes(m.match_id));
          if (matches.length > 0) {
            setCheckedMatches(matches);
            handleMacroView(matches, startTime, hm || 'none');
          }
        }
      } else if (startTime > 0) {
        setCurrentTime(startTime);
      }
      
      setInitialUrlParsed(true);
    }
  }, [manifest, selectedMap, initialUrlParsed]);

  // generateShareUrl function replaces active tracking
  function generateShareUrl() {
    const params = new URLSearchParams();
    if (selectedMap) params.set('map', selectedMap);
    
    if (selectedMatch) {
      if (selectedMatch.is_macro && checkedMatches.length > 0) {
        params.set('match', checkedMatches.map(m => m.match_id).join(','));
      } else if (!selectedMatch.is_macro) {
        params.set('match', selectedMatch.match_id);
      }
    }
    
    params.set('t', Math.floor(currentTime).toString());
    params.set('hm', heatmapType);
    
    const layers = [];
    if (showPaths) layers.push('paths');
    if (showHumans) layers.push('humans');
    if (showBots) layers.push('bots');
    if (showKills) layers.push('kills');
    if (showDeaths) layers.push('deaths');
    if (showLoot) layers.push('loot');
    if (showStorm) layers.push('storm');
    params.set('layers', layers.join(','));
    
    const newUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
    
    navigator.clipboard.writeText(newUrl).then(() => {
      alert("Shareable link updated and copied to clipboard!");
    }).catch(() => {
      alert("Shareable link updated in URL bar!");
    });
  }
  
  // Filter matches when map changes
  useEffect(() => {
    if (selectedMap && manifest.length > 0) {
      const filtered = manifest.filter(m => m.map_id === selectedMap);
      setFilteredMatches(filtered);
      
      const allDates = [...new Set(filtered.map(m => m.date))];
      setCollapsedDates(allDates);
      
      if (!isFirstMapLoad.current) {
        setCheckedMatches([]);
        setSelectedMatch(null);
        setTrajectories([]);
        setEvents([]);
      }
      isFirstMapLoad.current = false;
    }
  }, [selectedMap, manifest]);
  
  // Scroll kill feed to bottom as timeline progresses
  useEffect(() => {
    if (killFeedRef.current) {
      killFeedRef.current.scrollTop = killFeedRef.current.scrollHeight;
    }
  }, [currentTime]);

  // Auto-expand right sidebar only when timeline mode is active
  useEffect(() => {
    if (selectedMatch && !selectedMatch.is_macro) {
      setRightSidebarOpen(true);
    } else {
      setRightSidebarOpen(false);
    }
  }, [selectedMatch]);
  
  // Pre-load map image whenever selected map changes
  useEffect(() => {
    if (!selectedMap) return;
    setMapImageLoaded(false);
    
    const config = MAP_CONFIGS[selectedMap];
    if (!config) return;
    
    const img = new Image();
    img.src = config.image;
    img.onload = () => {
      setMinimapImage(img);
      setMapImageLoaded(true);
      resetZoomPan();
    };
    img.onerror = () => {
      console.error(`Failed to load image: ${config.image}`);
      setErrorMsg(`Failed to load minimap image for ${selectedMap}`);
    };
  }, [selectedMap]);
  
  // Handles changing the active match
  async function handleMatchChange(matchObj, startTime = 0, hmType = heatmapType) {
    if (!matchObj) return;
    setIsPlaying(false);
    setSelectedMatch(matchObj);
    setCurrentTime(startTime);
    setMaxTime(matchObj.duration_ms);
    setDuckdbLoading(true);
    setLoadingStatus(`Initializing DuckDB-Wasm & Loading Match Parquet File...`);
    setErrorMsg('');
    
    try {
      // Register the file virtual URL and load it in DuckDB Wasm
      await loadMatchData(matchObj.file_path);
      
      // Query positions and events
      setLoadingStatus("Retrieving player movement logs...");
      const traj = await getTrajectories();
      setTrajectories(traj);
      
      setLoadingStatus("Retrieving combat and event markers...");
      const evts = await getEvents();
      setEvents(evts);
      
      // Load current heatmap data
      await loadHeatmapData(hmType, matchObj);
      
      setDuckdbLoading(false);
      setLoadingStatus("");
    } catch (err) {
      console.error(err);
      setErrorMsg(`Failed to load parquet data for match ${matchObj.match_id}. See console.`);
      setDuckdbLoading(false);
    }
  }
  
  // Handles changing to Macro View
  async function handleMacroView(matches, startTime = 0, hmType = heatmapType) {
    if (!matches || matches.length === 0) return;
    setIsPlaying(false);
    
    // Create a mock match object for macro view
    const macroObj = {
      is_macro: true,
      match_id: 'MACRO_VIEW',
      map_id: selectedMap,
      duration_ms: Math.max(...matches.map(m => m.duration_ms)), // Arbitrary max duration
    };
    
    setSelectedMatch(macroObj);
    setCurrentTime(startTime);
    setMaxTime(macroObj.duration_ms);
    setDuckdbLoading(true);
    setLoadingStatus(`Fetching aggregated data for ${matches.length} matches...`);
    setErrorMsg('');
    
    try {
      await loadMacroMatchData(matches);
      
      setLoadingStatus("Retrieving aggregated events...");
      setTrajectories([]); 
      const evts = await getEvents();
      setEvents(evts);
      
      await loadHeatmapData(hmType, macroObj);
      
      setDuckdbLoading(false);
      setLoadingStatus("");
    } catch (err) {
      console.error(err);
      setErrorMsg(`Failed to load macro data for map ${selectedMap}.`);
      setDuckdbLoading(false);
    }
  }

  // Clears the timeline preview and restores macro state or empty state
  function clearTimelinePreview() {
    if (checkedMatches.length > 1) {
      handleMacroView(checkedMatches);
    } else {
      setSelectedMatch(null);
      setTrajectories([]);
      setEvents([]);
      setCurrentTime(0);
      setMaxTime(0);
    }
  }

  // Toggles selection for all matches under a specific date
  function toggleDateSelection(dateKey, dateMatches) {
    setCheckedMatches(prev => {
      const someChecked = dateMatches.some(m => prev.some(c => c.match_id === m.match_id && c.date === m.date));
      let newChecked = [...prev];
      if (someChecked) {
        // Remove all matches for this date
        newChecked = newChecked.filter(m => m.date !== dateKey);
      } else {
        // Add all matches for this date
        dateMatches.forEach(m => {
          if (!newChecked.some(c => c.match_id === m.match_id && c.date === m.date)) {
            newChecked.push(m);
          }
        });
      }
      
      // Trigger data loads
      if (newChecked.length === 1) {
        handleMatchChange(newChecked[0]);
      } else if (newChecked.length > 1) {
        handleMacroView(newChecked);
      } else {
        setSelectedMatch(null);
        setTrajectories([]);
        setEvents([]);
        setCurrentTime(0);
        setMaxTime(0);
      }
      return newChecked;
    });
  }

  // Toggles collapsing the date matches view
  function toggleDateCollapse(dateKey) {
    setCollapsedDates(prev => 
      prev.includes(dateKey) ? prev.filter(k => k !== dateKey) : [...prev, dateKey]
    );
  }

  // Previews a match for playback without formally selecting it
  function handleMatchCardClick(match) {
    if (checkedMatches.length > 1) return; // Prevent ruining a macro view
    setCheckedMatches([]); // Clear any single checked match
    handleMatchChange(match);
  }

  // Toggles match selection for macro mode or single mode
  function toggleMatchSelection(match) {
    setCheckedMatches(prev => {
      const isSelected = prev.some(m => m.match_id === match.match_id && m.date === match.date);
      let newChecked;
      if (isSelected) {
        newChecked = prev.filter(m => !(m.match_id === match.match_id && m.date === match.date));
      } else {
        newChecked = [...prev, match];
      }
      
      // Trigger data loads
      if (newChecked.length === 1) {
        handleMatchChange(newChecked[0]);
      } else if (newChecked.length > 1) {
        handleMacroView(newChecked);
      } else {
        setSelectedMatch(null);
        setTrajectories([]);
        setEvents([]);
        setCurrentTime(0);
        setMaxTime(0);
      }
      return newChecked;
    });
  }
  
  // Load Heatmap points from DuckDB based on toggle type
  async function loadHeatmapData(type, overrideMatch = null) {
    if (type === 'none') {
      setHeatmapPoints([]);
      return;
    }

    const match = overrideMatch || selectedMatch;
    if (!match) {
      setHeatmapPoints([]);
      return;
    }

    // If the CURRENT match is the macro view, use all checked matches!
    if (match.is_macro && checkedMatches.length > 1) {
      try {
        const fetchPromises = checkedMatches.map(m => {
          const fileUrl = `${import.meta.env.BASE_URL}${m.file_path}`;
          return fetch(fileUrl).then(res => res.ok ? res.json() : null).catch(() => null);
        });
        const results = await Promise.all(fetchPromises);
        const points = [];
        results.forEach(data => {
          if (!data || !data.heatmaps) return;
          if (type === 'traffic' && data.heatmaps.traffic) points.push(...data.heatmaps.traffic);
          if (type === 'kills' && data.heatmaps.kills) points.push(...data.heatmaps.kills);
          if (type === 'deaths' && data.heatmaps.deaths) points.push(...data.heatmaps.deaths);
        });
        setHeatmapPoints(points);
      } catch (error) {
        console.error("Error fetching macro heatmap:", error);
      }
      return;
    }
    
    try {
      let points = [];
      if (type === 'traffic') {
        points = await getTrafficHeatmap();
      } else if (type === 'kills') {
        points = await getCombatHeatmap('kills');
      } else if (type === 'deaths') {
        points = await getCombatHeatmap('deaths');
      }
      setHeatmapPoints(points);
    } catch (error) {
      console.error("Error fetching heatmap:", error);
    }
  }
  
  // Trigger heatmap query whenever selection switches
  useEffect(() => {
    loadHeatmapData(heatmapType);
  }, [heatmapType, selectedMatch]);
  
  // Playback timer ticker loop (requestAnimationFrame)
  useEffect(() => {
    if (!isPlaying) return;
    
    let lastTimestamp = performance.now();
    let animationFrameId;
    
    const tick = (now) => {
      const delta = now - lastTimestamp;
      lastTimestamp = now;
      
      setCurrentTime(prev => {
        const next = prev + delta * playbackSpeed;
        if (next >= maxTime) {
          setIsPlaying(false);
          return maxTime;
        }
        return next;
      });
      
      animationFrameId = requestAnimationFrame(tick);
    };
    
    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, playbackSpeed, maxTime]);
  
  // Zoom & Pan helper handlers
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 10));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.5));
  const resetZoomPan = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
  };
  
  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left click drags
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else {
      // Handle tooltips and coordinate hover checks
      handleCanvasHover(e);
    }
  };
  
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoveredEntity(null);
  };
  
  const handleWheel = (e) => {
    e.preventDefault();
    const factor = 1.1;
    if (e.deltaY < 0) {
      setZoom(z => Math.min(z * factor, 10));
    } else {
      setZoom(z => Math.max(z / factor, 0.5));
    }
  };
  
  // Canvas Hover Tooltip Calculation
  function handleCanvasHover(e) {
    if (!canvasRef.current || !selectedMatch || trajectories.length === 0) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert canvas screen mouse position to standard 0-1024 image coordinate space
    const rawCanvasX = (mouseX / rect.width) * 1024;
    const rawCanvasY = (mouseY / rect.height) * 1024;
    
    // Apply inverse transforms for panning and zooming
    const canvasX = (rawCanvasX - panOffset.x) / zoom;
    const canvasY = (rawCanvasY - panOffset.y) / zoom;
    
    const config = MAP_CONFIGS[selectedMatch.map_id];
    
    // Check if hovering near active players
    const activePlayers = getActivePlayersAtTime(currentTime);
    const hoverRadius = 15 / zoom; // scale hit threshold with zoom
    
    let found = null;
    for (const player of activePlayers) {
      const pix = worldToPixel(player.x, player.z, config, 1024);
      const dist = Math.hypot(pix.x - canvasX, pix.y - canvasY);
      if (dist < hoverRadius) {
        found = {
          type: 'player',
          id: player.id,
          isBot: player.isBot,
          x: player.x.toFixed(1),
          z: player.z.toFixed(1),
          elevation: player.y.toFixed(1)
        };
        break;
      }
    }
    
    // If no player hovered, check events
    if (!found && showKills) {
      const pastEvents = events.filter(evt => evt.ts <= currentTime);
      for (const evt of pastEvents) {
        const pix = worldToPixel(evt.x, evt.z, config, 1024);
        const dist = Math.hypot(pix.x - canvasX, pix.y - canvasY);
        if (dist < hoverRadius) {
          found = {
            type: 'event',
            name: evt.event,
            id: evt.user_id,
            x: evt.x.toFixed(1),
            z: evt.z.toFixed(1),
            time: formatTime(evt.ts)
          };
          break;
        }
      }
    }
    
    if (found) {
      setHoveredEntity(found);
      const viewportRect = containerRef.current.parentElement.getBoundingClientRect();
      setTooltipPos({ 
        x: e.clientX - viewportRect.left + 15, 
        y: e.clientY - viewportRect.top + 15 
      });
    } else {
      setHoveredEntity(null);
    }
  }
  
  // Calculate active locations & status for all players at the current timestamp
  function getActivePlayersAtTime(time) {
    if (trajectories.length === 0) return [];
    
    // 1. Find player death times to check who is dead
    const deathTimes = {};
    events.forEach(evt => {
      if (evt.event === 'Killed' || evt.event === 'BotKilled' || evt.event === 'KilledByStorm') {
        deathTimes[evt.user_id] = evt.ts;
      }
    });
    
    // 2. Group telemetry entries by user
    const byUser = {};
    trajectories.forEach(pt => {
      if (!byUser[pt.user_id]) byUser[pt.user_id] = [];
      byUser[pt.user_id].push(pt);
    });
    
    const active = [];
    Object.keys(byUser).forEach(uid => {
      // If dead at current timestamp, omit
      if (deathTimes[uid] && time >= deathTimes[uid]) return;
      
      const pts = byUser[uid];
      
      // Find closest position samples enclosing the current playback time
      let p1 = null;
      let p2 = null;
      
      for (let i = 0; i < pts.length; i++) {
        if (pts[i].ts <= time) {
          p1 = pts[i];
        }
        if (pts[i].ts > time && !p2) {
          p2 = pts[i];
          break;
        }
      }
      
      if (!p1) return; // Player has not spawned yet
      
      // Detect if user is bot (short integer strings) or human
      const isBot = !uid.includes('-') && uid.length <= 10;
      
      // Linear Interpolation for sub-sample smooth movement
      if (p2) {
        const fraction = (time - p1.ts) / (p2.ts - p1.ts);
        active.push({
          id: uid,
          isBot,
          x: p1.x + (p2.x - p1.x) * fraction,
          y: p1.y + (p2.y - p1.y) * fraction,
          z: p1.z + (p2.z - p1.z) * fraction
        });
      } else {
        // Match ended or no further logs, keep static at last sample
        active.push({
          id: uid,
          isBot,
          x: p1.x,
          y: p1.y,
          z: p1.z
        });
      }
    });
    
    return active;
  }
  
  // Custom professional Heatmap Renderer drawn directly onto ctx
  function renderHeatmap(ctx, points, mapConfig, opacity, radius) {
    if (points.length === 0) return;
    
    // Create an offscreen buffer canvas to compute densities
    const heatCanvas = document.createElement('canvas');
    heatCanvas.width = 1024;
    heatCanvas.height = 1024;
    const hctx = heatCanvas.getContext('2d');
    
    // 1. Draw radial gradient transparency footprints for each coordinate point
    points.forEach(pt => {
      const pix = worldToPixel(pt.x, pt.z, mapConfig, 1024);
      const grad = hctx.createRadialGradient(pix.x, pix.y, 0, pix.x, pix.y, radius);
      
      const weight = pt.weight || 1;
      const alpha = Math.min(weight * 0.08, 0.95);
      
      grad.addColorStop(0, `rgba(0,0,0,${alpha})`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      
      hctx.fillStyle = grad;
      hctx.beginPath();
      hctx.arc(pix.x, pix.y, radius, 0, Math.PI * 2);
      hctx.fill();
    });
    
    // 2. Perform colorization mapping on the alpha channel
    const imgData = hctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    
    // Setup a 256-step color gradient palette
    const paletteCanvas = document.createElement('canvas');
    paletteCanvas.width = 256;
    paletteCanvas.height = 1;
    const pctx = paletteCanvas.getContext('2d');
    const grad = pctx.createLinearGradient(0, 0, 256, 0);
    
    // Heat colors: Blue (cool) -> Green -> Yellow -> Red (hottest)
    grad.addColorStop(0.0, 'rgba(0, 50, 255, 0)');
    grad.addColorStop(0.2, 'rgba(0, 180, 255, 0.45)');
    grad.addColorStop(0.5, 'rgba(0, 255, 120, 0.7)');
    grad.addColorStop(0.8, 'rgba(255, 230, 0, 0.85)');
    grad.addColorStop(1.0, 'rgba(255, 0, 40, 0.95)');
    
    pctx.fillStyle = grad;
    pctx.fillRect(0, 0, 256, 1);
    const palette = pctx.getImageData(0, 0, 256, 1).data;
    
    // Remap pixel color indices matching density
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i+3];
      if (alpha > 0) {
        const offset = alpha * 4;
        data[i] = palette[offset];
        data[i+1] = palette[offset+1];
        data[i+2] = palette[offset+2];
        data[i+3] = Math.round(palette[offset+3] * opacity);
      }
    }
    
    hctx.putImageData(imgData, 0, 0);
    
    // 3. Draw final colorized buffer onto the viewport canvas
    ctx.drawImage(heatCanvas, 0, 0);
  }
  
  // Re-draw Canvas on any state update
  useEffect(() => {
    if (!canvasRef.current || !mapImageLoaded || !selectedMap) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const mapConfig = MAP_CONFIGS[selectedMap];
    
    // Reset layout transforms
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Apply panning & zooming translation
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);
    
    // 1. Draw background minimap image
    if (minimapImage) {
      ctx.drawImage(minimapImage, 0, 0, 1024, 1024);
    }
    
    // 2. Draw Heatmap overlay
    if (heatmapType !== 'none' && heatmapPoints.length > 0) {
      renderHeatmap(ctx, heatmapPoints, mapConfig, heatmapOpacity, heatmapRadius);
    }
    
    // 3. Draw player trajectories up to current time (tail lines)
    if (showPaths && trajectories.length > 0) {
      drawPlayerPaths(ctx, mapConfig);
    }
    
    // 4. Draw static event markers (Kills, Deaths, Loot)
    drawEventMarkers(ctx, mapConfig);
    
    // 5. Draw current active player icons (glowing dots)
    drawActivePlayers(ctx, mapConfig);
    
    ctx.restore();
  }, [
    mapImageLoaded, selectedMatch, trajectories, events, currentTime, 
    showPaths, showHumans, showBots, showKills, showDeaths, showLoot, showStorm,
    heatmapType, heatmapPoints, heatmapOpacity, heatmapRadius, zoom, panOffset
  ]);
  
  // Draw trajectory tails up to current time
  function drawPlayerPaths(ctx, mapConfig) {
    // Group points by user_id
    const userGroups = {};
    trajectories.forEach(pt => {
      if (pt.ts <= currentTime) {
        if (!userGroups[pt.user_id]) userGroups[pt.user_id] = [];
        userGroups[pt.user_id].push(pt);
      }
    });
    
    Object.keys(userGroups).forEach(uid => {
      const pts = userGroups[uid];
      if (pts.length < 2) return;
      
      const isBot = !uid.includes('-') && uid.length <= 10;
      if (isBot && !showBots) return;
      if (!isBot && !showHumans) return;
      
      ctx.beginPath();
      
      // Setup styling: Glow colors for humans vs bots
      if (isBot) {
        ctx.strokeStyle = '#f72585';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([]); // Solid line for bots per user request
        ctx.shadowColor = 'rgba(247, 37, 133, 0.4)';
        ctx.shadowBlur = 4;
      } else {
        ctx.strokeStyle = '#00f2fe';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]); // Solid glowing path for humans
        ctx.shadowColor = 'rgba(0, 242, 254, 0.4)';
        ctx.shadowBlur = 4;
      }
      
      const firstPix = worldToPixel(pts[0].x, pts[0].z, mapConfig, 1024);
      ctx.moveTo(firstPix.x, firstPix.y);
      
      for (let i = 1; i < pts.length; i++) {
        const pix = worldToPixel(pts[i].x, pts[i].z, mapConfig, 1024);
        ctx.lineTo(pix.x, pix.y);
      }
      
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0; // reset
    });
  }
  
  // Draw icon markers for kills, deaths, storm, and loot chest events
  function drawEventMarkers(ctx, mapConfig) {
    const isMacro = selectedMatch && selectedMatch.is_macro;
    const pastEvents = isMacro ? events : events.filter(evt => evt.ts <= currentTime);
    
    pastEvents.forEach(evt => {
      const pix = worldToPixel(evt.x, evt.z, mapConfig, 1024);
      
      if (evt.event === 'Kill' || evt.event === 'BotKill') {
        if (!showKills) return;
        // Draw Kill crossed swords / orange diamond
        ctx.fillStyle = '#ff9f1c';
        ctx.strokeStyle = '#080a12';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pix.x, pix.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (evt.event === 'Killed' || evt.event === 'BotKilled') {
        if (!showDeaths) return;
        // Draw Death marker (skull red circle)
        ctx.fillStyle = '#ff3366';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pix.x, pix.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (evt.event === 'KilledByStorm') {
        if (!showStorm) return;
        // Draw Storm death indicator
        ctx.fillStyle = '#00f2fe';
        ctx.strokeStyle = '#050608';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        // Star or triangle shape
        ctx.moveTo(pix.x, pix.y - 7);
        ctx.lineTo(pix.x + 6, pix.y + 5);
        ctx.lineTo(pix.x - 6, pix.y + 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (evt.event === 'Loot') {
        if (!showLoot) return;
        // Draw Loot chest marker
        ctx.fillStyle = '#00f5d4';
        ctx.strokeStyle = '#050608';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(pix.x - 4, pix.y - 4, 8, 8);
        ctx.fill();
        ctx.stroke();
      }
    });
  }
  
  // Draw glowing dynamic dots for players currently alive in match
  function drawActivePlayers(ctx, mapConfig) {
    const active = getActivePlayersAtTime(currentTime);
    
    active.forEach(player => {
      if (player.isBot && !showBots) return;
      if (!player.isBot && !showHumans) return;
      
      const pix = worldToPixel(player.x, player.z, mapConfig, 1024);
      
      // Pulsing outer shadow glow
      ctx.shadowBlur = 8;
      
      if (player.isBot) {
        ctx.fillStyle = '#f72585';
        ctx.shadowColor = 'rgba(247, 37, 133, 0.8)';
        ctx.beginPath();
        ctx.arc(pix.x, pix.y, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#00f2fe';
        ctx.shadowColor = 'rgba(0, 242, 254, 0.8)';
        ctx.beginPath();
        ctx.arc(pix.x, pix.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Reset shadows
      ctx.shadowBlur = 0;
      
      // Draw white center core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pix.x, pix.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  
  // Helper to retrieve lobby metrics dynamically at current point of timeline
  function getLobbyMetrics() {
    if (trajectories.length === 0) return { humansAlive: 0, botsAlive: 0, killsCount: 0 };
    
    const active = getActivePlayersAtTime(currentTime);
    const humansAlive = active.filter(p => !p.isBot).length;
    const botsAlive = active.filter(p => p.isBot).length;
    
    // Count kills up to current time
    const killsCount = events.filter(evt => evt.ts <= currentTime && (evt.event === 'Kill' || evt.event === 'BotKill')).length;
    
    return { humansAlive, botsAlive, killsCount };
  }
  
  const { humansAlive, botsAlive, killsCount } = getLobbyMetrics();
  
  // Get list of events to render in feed
  const activeFeedEvents = events.filter(evt => evt.ts <= currentTime);
  
  return (
    <div className="app-container">
      {/* 1. LEFT SIDEBAR: FILTERS AND MATCH SELECTOR */}
      {/* 1. LEFT SIDEBAR: FILTERS AND MATCH SELECTOR */}
      <Sidebar 
        leftSidebarOpen={leftSidebarOpen} setLeftSidebarOpen={setLeftSidebarOpen}
        selectedMap={selectedMap} setSelectedMap={setSelectedMap} maps={maps}
        filteredMatches={filteredMatches} checkedMatches={checkedMatches} collapsedDates={collapsedDates}
        toggleDateCollapse={toggleDateCollapse} toggleDateSelection={toggleDateSelection}
        handleMatchCardClick={handleMatchCardClick} toggleMatchSelection={toggleMatchSelection} handleMatchChange={handleMatchChange} clearTimelinePreview={clearTimelinePreview} selectedMatch={selectedMatch} formatTime={formatTime}
        showPaths={showPaths} setShowPaths={setShowPaths} showHumans={showHumans} setShowHumans={setShowHumans} showBots={showBots} setShowBots={setShowBots}
        showDeaths={showDeaths} setShowDeaths={setShowDeaths} showKills={showKills} setShowKills={setShowKills} showStorm={showStorm} setShowStorm={setShowStorm} showLoot={showLoot} setShowLoot={setShowLoot}
      />
      
      {/* 2. MIDDLE VIEWPORT: INTERACTIVE CANVAS CONTAINER */}
      <MapViewport 
        duckdbLoading={duckdbLoading} loadingStatus={loadingStatus} errorMsg={errorMsg}
        handleZoomIn={handleZoomIn} handleZoomOut={handleZoomOut} resetZoomPan={resetZoomPan}
        containerRef={containerRef} handleWheel={handleWheel} isDragging={isDragging}
        handleMouseDown={handleMouseDown} handleMouseMove={handleMouseMove} handleMouseUp={handleMouseUp} handleMouseLeave={handleMouseLeave} canvasRef={canvasRef}
        hoveredEntity={hoveredEntity} tooltipPos={tooltipPos}
        selectedMatch={selectedMatch} formatTime={formatTime} currentTime={currentTime} maxTime={maxTime} setCurrentTime={setCurrentTime}
        setIsPlaying={setIsPlaying} isPlaying={isPlaying} playbackSpeed={playbackSpeed} setPlaybackSpeed={setPlaybackSpeed}
        heatmapType={heatmapType} setHeatmapType={setHeatmapType} clearTimelinePreview={clearTimelinePreview} generateShareUrl={generateShareUrl}
      />
      
      {/* 3. RIGHT SIDEBAR: LIVE LOBBY COUNTS & DYNAMIC EVENT FEED */}
      {/* 3. RIGHT SIDEBAR: LIVE LOBBY COUNTS & DYNAMIC EVENT FEED */}
      <RightSidebar 
        rightSidebarOpen={rightSidebarOpen} setRightSidebarOpen={setRightSidebarOpen}
        humansAlive={humansAlive} botsAlive={botsAlive} killsCount={killsCount}
        activeFeedEvents={activeFeedEvents} formatTime={formatTime} killFeedRef={killFeedRef}
      />
    </div>
  );
}

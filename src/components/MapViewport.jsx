import React from 'react';
import { 
  ZoomIn, ZoomOut, LocateFixed, ShieldAlert, Pause, Play, RotateCcw, X, Share2
} from 'lucide-react';

export default function MapViewport({
  duckdbLoading, loadingStatus, errorMsg,
  handleZoomIn, handleZoomOut, resetZoomPan,
  containerRef, handleWheel, isDragging,
  handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave, canvasRef,
  hoveredEntity, tooltipPos,
  selectedMatch, formatTime, currentTime, maxTime, setCurrentTime,
  setIsPlaying, isPlaying, playbackSpeed, setPlaybackSpeed,
  heatmapType, setHeatmapType, clearTimelinePreview, generateShareUrl
}) {
  return (
    <main className="viewport">
      
      {/* Loading overlay for analytical queries */}
      {duckdbLoading && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(5, 6, 8, 0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(6px)' }}>
          <div className="spinner" style={{ marginBottom: '16px' }}></div>
          <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>{loadingStatus}</div>
        </div>
      )}
      
      {/* Error boundary display */}
      {errorMsg && (
        <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', padding: '14px 20px', backgroundColor: 'rgba(255, 51, 102, 0.15)', border: '1px solid var(--accent-red)', borderRadius: '8px', color: '#ff4d6d', zIndex: 100, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert size={20}/>
          <span style={{ fontSize: '13px', fontWeight: '500' }}>{errorMsg}</span>
        </div>
      )}
      
      {/* Canvas controller HUD tools */}
      <div className="hud-controls">
        <button className="hud-btn" title="Zoom In" onClick={handleZoomIn}><ZoomIn size={18}/></button>
        <button className="hud-btn" title="Zoom Out" onClick={handleZoomOut}><ZoomOut size={18}/></button>
        <button className="hud-btn" title="Reset View" onClick={resetZoomPan}><LocateFixed size={16}/></button>
        <button className="hud-btn" title="Share View" onClick={generateShareUrl} style={{ marginTop: '10px', color: 'var(--accent-cyan)' }}><Share2 size={16}/></button>
      </div>
      
      <div className="canvas-wrapper" ref={containerRef} onWheel={handleWheel}>
        <div 
          className={`canvas-container ${isDragging ? 'grabbing-active' : 'grab-active'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `scale(1)` // Matrix scale done within Canvas context transforms directly
          }}
        >
          <canvas 
            ref={canvasRef} 
            className="minimap-canvas" 
            width={1024} 
            height={1024}
          />
        </div>
      </div>
      
      {/* Tooltip Overlay */}
      {hoveredEntity && (
        <div className="canvas-tooltip" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
          {hoveredEntity.type === 'player' ? (
            <>
              <div style={{ fontWeight: '700', color: hoveredEntity.isBot ? 'var(--accent-pink)' : 'var(--accent-cyan)', marginBottom: '4px' }}>
                {hoveredEntity.isBot ? `🤖 Bot (${hoveredEntity.id})` : `👤 Human Player`}
              </div>
              {!hoveredEntity.isBot && <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '6px' }}>{hoveredEntity.id}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <div>X: <b>{hoveredEntity.x}</b></div>
                <div>Z: <b>{hoveredEntity.z}</b></div>
                <div style={{ gridColumn: 'span 2' }}>Elevation (Y): <b style={{ color: 'var(--accent-green)' }}>{hoveredEntity.elevation}m</b></div>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: '700', color: 'var(--accent-red)', marginBottom: '4px' }}>
                💥 Event: {hoveredEntity.name}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '6px' }}>Logged by: {hoveredEntity.id.substring(0, 8)}...</div>
              <div>Time: <b>{hoveredEntity.time}</b></div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <span>X: {hoveredEntity.x}</span>
                <span>Z: {hoveredEntity.z}</span>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* 3. TIMELINE AND TIMESTEP PLAYBACK CONTROLLER */}
      <footer className="playback-bar" style={(!selectedMatch || selectedMatch.is_macro) ? { paddingTop: '16px', paddingBottom: '16px' } : {}}>
        {selectedMatch && !selectedMatch.is_macro && (
          <div className="timeline-row">
          <span className="time-display">{formatTime(currentTime)}</span>
          <div className="timeline-slider-wrapper">
            <input 
              type="range" 
              className="timeline-slider"
              min={0}
              max={maxTime || 100}
              value={currentTime}
              onChange={e => {
                setCurrentTime(Number(e.target.value));
                setIsPlaying(false); // Pause on scrub
              }}
            />
          </div>
          <span className="time-display">{formatTime(maxTime)}</span>
          </div>
        )}
        
        <div className="controls-row" style={(!selectedMatch || selectedMatch.is_macro) ? { justifyContent: 'center' } : {}}>
          {selectedMatch && !selectedMatch.is_macro && (
            <div className="playback-buttons">
            <button 
              className="play-btn"
              onClick={() => {
                if (currentTime >= maxTime) {
                  setCurrentTime(0); // auto replay
                }
                setIsPlaying(!isPlaying);
              }}
              disabled={duckdbLoading || !selectedMatch}
            >
              {isPlaying ? <Pause size={20} fill="var(--bg-primary)"/> : <Play size={20} style={{ marginLeft: '2px' }} fill="var(--bg-primary)"/>}
            </button>
            
            <button 
              className="icon-btn"
              onClick={() => {
                setIsPlaying(false);
                setCurrentTime(0);
              }}
              disabled={duckdbLoading || !selectedMatch}
            >
              <RotateCcw size={14}/> Restart
            </button>
            
            <button 
              className="icon-btn"
              onClick={clearTimelinePreview}
              title="Close Timeline"
              style={{ color: '#ff4d6d' }}
            >
              <X size={14} /> Close
            </button>
            
            {/* Playback speed multiplier selection */}
            <select 
              className="speed-select"
              value={playbackSpeed}
              onChange={e => setPlaybackSpeed(Number(e.target.value))}
            >
              <option value={1}>1x Speed</option>
              <option value={2}>2x Speed</option>
              <option value={5}>5x Speed</option>
              <option value={10}>10x Speed</option>
            </select>
          </div>
          )}
          
          {/* Heatmap overlay selection tabs */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Analytic Heatmap:</span>
            <div className="glass-panel" style={{ display: 'flex', padding: '3px', gap: '2px' }}>
              <button 
                className={`icon-btn ${heatmapType === 'none' ? 'active' : ''}`}
                style={{ border: 'none', padding: '6px 10px', margin: 0 }}
                onClick={() => setHeatmapType('none')}
              >Off</button>
              <button 
                className={`icon-btn ${heatmapType === 'traffic' ? 'active' : ''}`}
                style={{ border: 'none', padding: '6px 10px', margin: 0 }}
                onClick={() => setHeatmapType('traffic')}
              >Traffic</button>
              <button 
                className={`icon-btn ${heatmapType === 'kills' ? 'active' : ''}`}
                style={{ border: 'none', padding: '6px 10px', margin: 0 }}
                onClick={() => setHeatmapType('kills')}
              >Kills</button>
              <button 
                className={`icon-btn ${heatmapType === 'deaths' ? 'active' : ''}`}
                style={{ border: 'none', padding: '6px 10px', margin: 0 }}
                onClick={() => setHeatmapType('deaths')}
              >Deaths</button>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

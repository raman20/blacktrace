import React from 'react';
import { Compass, PanelRightClose, PanelRightOpen } from 'lucide-react';

export default function RightSidebar({
  rightSidebarOpen, setRightSidebarOpen,
  humansAlive, botsAlive, killsCount,
  activeFeedEvents, formatTime, killFeedRef
}) {
  return (
    <aside className={`right-sidebar ${rightSidebarOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-expanded-content">
        <div className="sidebar-header" style={{ padding: '20px', borderBottom: '1px solid var(--border-default)' }}>
          <div className="sidebar-title-row">
            <button 
              className="sidebar-toggle-btn" 
              onClick={() => setRightSidebarOpen(false)}
              title="Collapse Right Sidebar"
            >
              <PanelRightClose size={18} />
            </button>
            <h2 style={{ fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', margin: 0 }}>Lobby Stats</h2>
          </div>
          <div style={{ height: '10px' }}></div>
          <div className="stats-grid">
            <div className="stat-card glass-panel">
              <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{humansAlive}</span>
              <span className="stat-label">Humans Alive</span>
            </div>
            <div className="stat-card glass-panel">
              <span className="stat-value" style={{ color: 'var(--accent-pink)' }}>{botsAlive}</span>
              <span className="stat-label">Bots Alive</span>
            </div>
            <div className="stat-card glass-panel" style={{ gridColumn: 'span 2' }}>
              <span className="stat-value" style={{ color: 'var(--accent-red)' }}>{killsCount}</span>
              <span className="stat-label">Total Match Kills</span>
            </div>
          </div>
        </div>
        
        {/* Dynamic Kill Feed listing events as timeline scrub updates */}
        <div className="kill-feed">
          <div className="kill-feed-title"><Compass size={12}/> Match Event Log ({activeFeedEvents.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1, paddingRight: '4px' }} ref={killFeedRef}>
            {activeFeedEvents.map((evt, idx) => (
              <div 
                key={idx} 
                className={`kill-feed-item ${
                  (evt.event.includes('Kill') || evt.event.includes('Killed')) 
                    ? 'kill' : (evt.event === 'Loot' ? 'loot' : 'storm')
                }`}
              >
                <div>
                  <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: '600' }}>
                    {evt.user_id.substring(0, 8)}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', margin: '0 6px' }}>
                    {evt.event === 'Kill' && 'killed enemy'}
                    {evt.event === 'BotKill' && 'eliminated bot'}
                    {evt.event === 'Killed' && 'was eliminated'}
                    {evt.event === 'BotKilled' && 'died to bot'}
                    {evt.event === 'KilledByStorm' && 'lost in storm'}
                    {evt.event === 'Loot' && 'looted item'}
                  </span>
                </div>
                <span className="feed-time">{formatTime(evt.ts)}</span>
              </div>
            ))}
            {activeFeedEvents.length === 0 && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '30px' }}>
                Start playback or scrub timeline to populate event feed.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sidebar-collapsed-content">
        <button 
          className="sidebar-toggle-btn collapsed" 
          onClick={() => setRightSidebarOpen(true)}
          title="Expand Right Sidebar"
        >
          <PanelRightOpen size={18} />
        </button>
        <div className="collapsed-strip-vertical-text">Stats & Event Log</div>
      </div>
    </aside>
  );
}

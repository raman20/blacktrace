import React from 'react';
import { 
  Map as MapIcon, Users, ChevronRight, ChevronDown, PanelLeftClose, PanelLeftOpen, Eye
} from 'lucide-react';

export default function Sidebar({
  leftSidebarOpen, setLeftSidebarOpen,
  selectedMap, setSelectedMap, maps,
  filteredMatches, checkedMatches, collapsedDates,
  toggleDateCollapse, toggleDateSelection,
  handleMatchCardClick, toggleMatchSelection, selectedMatch, formatTime,
  showPaths, setShowPaths, showHumans, setShowHumans, showBots, setShowBots,
  showDeaths, setShowDeaths, showKills, setShowKills, showStorm, setShowStorm, showLoot, setShowLoot
}) {
  return (
    <aside className={`sidebar ${leftSidebarOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-expanded-content">
        <div className="sidebar-header">
          <div className="sidebar-title-row">
            <h1>Black <span>Trace</span></h1>
            <button 
              className="sidebar-toggle-btn" 
              onClick={() => setLeftSidebarOpen(false)}
              title="Collapse Left Sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
          </div>
        </div>
        
        <div className="sidebar-content">
          {/* Filters card */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label><MapIcon size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Map Selection</label>
              <select className="form-select" value={selectedMap} onChange={e => setSelectedMap(e.target.value)}>
                {maps.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          
          {/* Matches selection list */}
          <div className="form-group">
            <label><Users size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Matches by Date ({filteredMatches.length} total)</label>
              <div className="match-list-container" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {(() => {
                  // Group matches by date
                  const matchesByDate = filteredMatches.reduce((acc, match) => {
                    if (!acc[match.date]) acc[match.date] = [];
                    acc[match.date].push(match);
                    return acc;
                  }, {});
                  const groupedDates = Object.keys(matchesByDate).sort();
                  
                  return groupedDates.map(dateKey => {
                    const dateMatches = matchesByDate[dateKey];
                    const allChecked = dateMatches.every(m => checkedMatches.some(c => c.match_id === m.match_id && c.date === m.date));
                    const someChecked = dateMatches.some(m => checkedMatches.some(c => c.match_id === m.match_id && c.date === m.date));
                    const isCollapsed = collapsedDates.includes(dateKey);
                    
                    return (
                      <div key={dateKey} className="date-group" style={{ marginBottom: '16px' }}>
                        <div 
                          className="date-group-header" 
                          onClick={() => toggleDateCollapse(dateKey)}
                          style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', padding: '10px 12px', background: 'var(--gradient-cyan)', borderRadius: '8px', cursor: 'pointer', marginBottom: isCollapsed ? '0' : '8px', color: '#000', boxShadow: '0 4px 12px rgba(0, 242, 254, 0.15)' }}
                        >
                          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={allChecked} 
                              ref={input => input && (input.indeterminate = !allChecked && someChecked)} 
                              onChange={() => toggleDateSelection(dateKey, dateMatches)} 
                              style={{ marginRight: '10px', cursor: 'pointer', accentColor: '#000' }} 
                            />
                          </div>
                          <strong style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{dateKey.replace('_', ' ')}</strong>
                          <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: '600', opacity: 0.8, marginRight: '8px' }}>{dateMatches.length} matches</span>
                          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </div>
                        
                        {!isCollapsed && (
                          <div className="date-group-matches" style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '14px', borderLeft: '2px solid rgba(255,255,255,0.05)', marginLeft: '10px' }}>
                            {dateMatches.map(match => {
                              const isChecked = checkedMatches.some(m => m.match_id === match.match_id && m.date === match.date);
                              const isPreviewing = selectedMatch?.match_id === match.match_id && selectedMatch?.date === match.date;
                              return (
                              <div 
                                key={match.match_id} 
                                className={`match-card glass-panel ${isChecked || isPreviewing ? 'active' : ''}`}
                                onClick={() => handleMatchCardClick(match)}
                                style={{ padding: '12px', gap: '8px', borderRadius: '8px', minHeight: 'unset' }}
                              >
                                <div className="match-card-meta" style={{ display: 'flex', alignItems: 'center' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked}
                                    onChange={() => toggleMatchSelection(match)}
                                    onClick={e => e.stopPropagation()}
                                    style={{ marginRight: '8px', cursor: 'pointer' }}
                                  />
                                  <span className="match-card-id" style={{ fontSize: '13px', maxWidth: '100px' }}>{match.match_id}</span>
                                  <span className="match-card-date" style={{ marginLeft: 'auto', fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}>
                                    {formatTime(match.duration_ms)}
                                  </span>
                                </div>
                                <div className="match-card-stats" style={{ fontSize: '12px', gap: '12px' }}>
                                  <span>👥 {match.human_count}H / {match.bot_count}B</span>
                                  <span>⚔️ {match.total_kills} Kills</span>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
                {filteredMatches.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No matches found.</div>}
              </div>
            </div>
          
          {/* Visual Layer Toggles */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '10px', letterSpacing: '0.8px' }}>Map Markers</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div className="toggle-item">
                <span className="toggle-label"><Eye size={14} style={{ color: 'var(--accent-cyan)' }}/> Show Paths</span>
                <label className="toggle-switch">
                  <input type="checkbox" disabled={selectedMatch?.is_macro} checked={showPaths && !selectedMatch?.is_macro} onChange={e => setShowPaths(e.target.checked)}/>
                  <span className="slider"></span>
                </label>
              </div>
              
              <div className="toggle-item" style={{ paddingLeft: '16px', opacity: (showPaths && !selectedMatch?.is_macro) ? 1 : 0.4 }}>
                <span className="toggle-label" style={{ fontSize: '12px' }}><div className="legend-color" style={{ backgroundColor: 'var(--accent-cyan)' }}/> Humans</span>
                <label className="toggle-switch">
                  <input type="checkbox" disabled={!showPaths || selectedMatch?.is_macro} checked={showHumans} onChange={e => setShowHumans(e.target.checked)}/>
                  <span className="slider"></span>
                </label>
              </div>
              
              <div className="toggle-item" style={{ paddingLeft: '16px', opacity: (showPaths && !selectedMatch?.is_macro) ? 1 : 0.4 }}>
                <span className="toggle-label" style={{ fontSize: '12px' }}><div className="legend-color" style={{ backgroundColor: 'var(--accent-pink)' }}/> Bots</span>
                <label className="toggle-switch">
                  <input type="checkbox" disabled={!showPaths || selectedMatch?.is_macro} checked={showBots} onChange={e => setShowBots(e.target.checked)}/>
                  <span className="slider"></span>
                </label>
              </div>
              
              <div className="toggle-item">
                <span className="toggle-label"><div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff3366', border: '1.5px solid #fff' }}/> Show Deaths</span>
                <label className="toggle-switch">
                  <input type="checkbox" checked={showDeaths} onChange={e => setShowDeaths(e.target.checked)}/>
                  <span className="slider"></span>
                </label>
              </div>
              
              <div className="toggle-item">
                <span className="toggle-label"><div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ff9f1c', border: '1.5px solid #080a12' }}/> Show Kills</span>
                <label className="toggle-switch">
                  <input type="checkbox" checked={showKills} onChange={e => setShowKills(e.target.checked)}/>
                  <span className="slider"></span>
                </label>
              </div>

              <div className="toggle-item">
                <span className="toggle-label"><svg width="14" height="14" viewBox="0 0 14 14"><polygon points="7,1 13,13 1,13" fill="#00f2fe" stroke="#050608" strokeWidth="1.5"/></svg> Show Storm Deaths</span>
                <label className="toggle-switch">
                  <input type="checkbox" checked={showStorm} onChange={e => setShowStorm(e.target.checked)}/>
                  <span className="slider"></span>
                </label>
              </div>
              
              <div className="toggle-item">
                <span className="toggle-label"><div style={{ width: '10px', height: '10px', backgroundColor: '#00f5d4', border: '1px solid #050608' }}/> Show Looting</span>
                <label className="toggle-switch">
                  <input type="checkbox" checked={showLoot} onChange={e => setShowLoot(e.target.checked)}/>
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sidebar-collapsed-content">
        <button 
          className="sidebar-toggle-btn collapsed" 
          onClick={() => setLeftSidebarOpen(true)}
          title="Expand Left Sidebar"
        >
          <PanelLeftOpen size={18} />
        </button>
        <div className="collapsed-strip-vertical-text">Filters & Matches</div>
      </div>
    </aside>
  );
}

import React from 'react';

export default function SimulatedMap({ 
  clientCoords, 
  mechanicCoords, 
  partsDepotCoords, 
  selectedPart, 
  routeLeg, 
  status 
}) {
  const cx = clientCoords ? clientCoords.x : 75;
  const cy = clientCoords ? clientCoords.y : 70;
  const mx = mechanicCoords ? mechanicCoords.x : 15;
  const my = mechanicCoords ? mechanicCoords.y : 75;
  
  // Metro Depot coordinates
  const dx = partsDepotCoords ? partsDepotCoords.x : 45;
  const dy = partsDepotCoords ? partsDepotCoords.y : 15;

  const showRoute = status === 'ACCEPTED' || status === 'EN_ROUTE' || status === 'ARRIVED' || status === 'COMPLETED';
  const showMechanic = status !== 'PENDING';
  const hasPart = !!selectedPart;

  return (
    <div className="map-canvas-container" style={{ position: 'relative', width: '100%', height: '100%', minHeight: '340px' }}>
      <div className="map-grid-overlay"></div>
      
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {/* Simulated Streets (Grid Roadways in Light Mode) */}
        <line x1="15" y1="0" x2="15" y2="100" stroke="rgba(0,0,0,0.06)" strokeWidth="1" strokeDasharray="2,2" />
        <line x1="45" y1="0" x2="45" y2="100" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
        <line x1="75" y1="0" x2="75" y2="100" stroke="rgba(0,0,0,0.06)" strokeWidth="1" strokeDasharray="3,3" />

        <line x1="0" y1="15" x2="100" y2="15" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
        <line x1="0" y1="45" x2="100" y2="45" stroke="rgba(0,0,0,0.06)" strokeWidth="1" strokeDasharray="2,2" />
        <line x1="0" y1="70" x2="100" y2="70" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />

        {/* Path Route drawing */}
        {showRoute && (
          <>
            {/* If has premium part, route goes Mechanic ➔ Depot ➔ Client */}
            {hasPart ? (
              <>
                {/* Leg 1: Mechanic ➔ Parts Depot (Blue tracking route) */}
                <line 
                  x1="15" y1="75" 
                  x2={dx} y2={dy} 
                  stroke={routeLeg === 1 && status === 'EN_ROUTE' ? 'var(--secondary)' : 'rgba(28, 105, 212, 0.2)'} 
                  strokeWidth="1.2" 
                  strokeDasharray="2,2"
                  style={{
                    strokeDashoffset: (routeLeg === 1 && status === 'EN_ROUTE') ? 100 : 0,
                    animation: (routeLeg === 1 && status === 'EN_ROUTE') ? 'dash 12s linear infinite' : 'none'
                  }}
                />
                
                {/* Leg 2: Parts Depot ➔ Client (Orange/Blue tracking route) */}
                <line 
                  x1={dx} y1={dy} 
                  x2={cx} y2={cy} 
                  stroke={routeLeg === 2 && status === 'EN_ROUTE' ? 'var(--secondary)' : 'rgba(28, 105, 212, 0.2)'} 
                  strokeWidth="1.2" 
                  strokeDasharray="2,2"
                  style={{
                    strokeDashoffset: (routeLeg === 2 && status === 'EN_ROUTE') ? 100 : 0,
                    animation: (routeLeg === 2 && status === 'EN_ROUTE') ? 'dash 12s linear infinite' : 'none'
                  }}
                />
              </>
            ) : (
              /* Standard Route: Mechanic ➔ Client directly */
              <line 
                x1="15" y1="75" 
                x2={cx} y2={cy} 
                stroke="var(--secondary)" 
                strokeWidth="1.2" 
                strokeDasharray="2,2" 
                style={{
                  strokeDashoffset: status === 'EN_ROUTE' ? 100 : 0,
                  animation: status === 'EN_ROUTE' ? 'dash 12s linear infinite' : 'none'
                }}
              />
            )}
          </>
        )}

        {/* CITY PARTS HUB */}
        {hasPart && (
          <g transform={`translate(${dx}, ${dy})`}>
            {status === 'EN_ROUTE' && routeLeg === 1 && (
              <circle r="6" fill="rgba(16, 185, 129, 0.2)" stroke="rgba(16, 185, 129, 0.4)" strokeWidth="0.5">
                <animate attributeName="r" values="3;9;3" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle r="3.5" fill="var(--success)" stroke="#fff" strokeWidth="0.5" />
            <rect x="-1" y="-1" width="2" height="2" fill="#fff" />
          </g>
        )}

        {/* Client Pin (Breakdown Point) */}
        <g transform={`translate(${cx}, ${cy})`}>
          {/* Pulsing Outer Rings */}
          <circle r="5" fill="rgba(239, 68, 68, 0.15)" stroke="rgba(239, 68, 68, 0.35)" strokeWidth="0.4">
            <animate attributeName="r" values="3;8;3" dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <circle r="2.8" fill="#ef4444" stroke="#fff" strokeWidth="0.5" />
          {/* Mini Pin Pointer */}
          <path d="M 0 0 L -1.2 -3.2 A 1.4 1.4 0 1 1 1.2 -3.2 Z" fill="#ef4444" transform="scale(0.8) translate(0, 1.5)" />
        </g>

        {/* Mechanic Dispatch Truck */}
        {showMechanic && (
          <g transform={`translate(${mx}, ${my})`}>
            {/* Glowing Wrench Aura */}
            <circle r="4.5" fill="rgba(28, 105, 212, 0.15)" stroke="rgba(28, 105, 212, 0.35)" strokeWidth="0.5">
              {status === 'EN_ROUTE' && (
                <animate attributeName="r" values="3;7;3" dur="1.2s" repeatCount="indefinite" />
              )}
            </circle>
            <circle r="2.8" fill="var(--primary)" stroke="#fff" strokeWidth="0.5" />
            <path d="M -0.8 -0.8 L 0.8 0.8 M 0.8 -0.8 L -0.8 0.8" stroke="#fff" strokeWidth="0.4" />
          </g>
        )}
      </svg>

      {/* Styled text HUD labels on the Map */}
      <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(255, 255, 255, 0.95)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.65rem', display: 'flex', gap: '8px', color: '#111', pointerEvents: 'none', zIndex: 5, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '6px', height: '6px', background: '#ef4444', borderRadius: '50%' }}></span> Client Breakdown
        </div>
        
        {hasPart && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', background: 'var(--success)', borderRadius: '50%' }}></span> City Parts Hub
          </div>
        )}

        {showMechanic && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%' }}></span> Dispatch Unit
          </div>
        )}
      </div>

      {hasPart && (
        <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--secondary)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.65rem', color: '#fff', pointerEvents: 'none', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)', zIndex: 5, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          📦 Collecting from Parts Hub
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes dash {
          to {
            stroke-dashoffset: -100;
          }
        }
      `}} />
    </div>
  );
}

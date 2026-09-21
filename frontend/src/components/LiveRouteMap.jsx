import React, { useState } from 'react';

function isValidGeoCoord(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  const nLat = Number(lat);
  const nLon = Number(lng);
  if (isNaN(nLat) || isNaN(nLon)) return false;
  // Reject (0,0) - Null Island
  if (nLat === 0 && nLon === 0) return false;
  return nLat >= -90 && nLat <= 90 && nLon >= -180 && nLon <= 180;
}

/**
 * LiveRouteMap Component
 * Interactive SVG geographic route projection & OpenStreetMap integration.
 * Plots stops at real geographic positions, route path, and live bus position.
 */
export function LiveRouteMap({ stops = [], location = null, busNumber = 'Bus' }) {
  const [useOsmEmbed, setUseOsmEmbed] = useState(false);

  // Filter stops with valid geographic coordinates
  const validStops = (stops || []).filter((s) => isValidGeoCoord(s.latitude, s.longitude));
  const hasValidBusGps = isValidGeoCoord(location?.latitude, location?.longitude);

  if (validStops.length === 0 && !hasValidBusGps) {
    return (
      <div className="panel empty-state" style={{ padding: 20 }}>
        <p>No valid route stops available to render route map.</p>
      </div>
    );
  }

  // Determine bounding box centered on the actual route stop coordinates
  const stopLats = validStops.map((s) => Number(s.latitude));
  const stopLngs = validStops.map((s) => Number(s.longitude));

  let rawMinLat = stopLats.length > 0 ? Math.min(...stopLats) : Number(location.latitude);
  let rawMaxLat = stopLats.length > 0 ? Math.max(...stopLats) : Number(location.latitude);
  let rawMinLng = stopLngs.length > 0 ? Math.min(...stopLngs) : Number(location.longitude);
  let rawMaxLng = stopLngs.length > 0 ? Math.max(...stopLngs) : Number(location.longitude);

  // If valid bus GPS exists, expand bounds to include the bus position
  if (hasValidBusGps) {
    const busLat = Number(location.latitude);
    const busLng = Number(location.longitude);
    rawMinLat = Math.min(rawMinLat, busLat);
    rawMaxLat = Math.max(rawMaxLat, busLat);
    rawMinLng = Math.min(rawMinLng, busLng);
    rawMaxLng = Math.max(rawMaxLng, busLng);
  }

  // Margin padding (18% margin to comfortably fit stop nodes and labels)
  const latSpan = rawMaxLat - rawMinLat;
  const lngSpan = rawMaxLng - rawMinLng;
  const latDelta = Math.max(0.006, latSpan * 0.18);
  const lngDelta = Math.max(0.006, lngSpan * 0.18);

  const minLat = rawMinLat - latDelta;
  const maxLat = rawMaxLat + latDelta;
  const minLng = rawMinLng - lngDelta;
  const maxLng = rawMaxLng + lngDelta;

  const width = 640;
  const height = 340;

  function project(lat, lng) {
    const nLat = Number(lat);
    const nLng = Number(lng);
    const x = ((nLng - minLng) / (maxLng - minLng)) * (width - 100) + 50;
    // Y inverted because SVG (0,0) is top-left, higher lat is north (up)
    const y = height - 50 - ((nLat - minLat) / (maxLat - minLat)) * (height - 100);
    return { x: Math.round(x), y: Math.round(y) };
  }

  // Build route path from actual stop positions
  const projectedStops = validStops.map((s) => ({
    ...s,
    ...project(s.latitude, s.longitude),
  }));

  const pathPoints = projectedStops.map((s) => `${s.x},${s.y}`).join(' ');

  // Live Bus position - ONLY when valid GPS coordinates exist
  const busPoint = hasValidBusGps ? project(location.latitude, location.longitude) : null;

  // OpenStreetMap embed & external URLs
  const centerLat = busPoint ? Number(location.latitude) : (rawMinLat + rawMaxLat) / 2;
  const centerLng = busPoint ? Number(location.longitude) : (rawMinLng + rawMaxLng) / 2;
  const osmBbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${osmBbox}&layer=mapnik${hasValidBusGps ? `&marker=${Number(location.latitude)}%2C${Number(location.longitude)}` : ''}`;
  const osmExternalUrl = hasValidBusGps
    ? `https://www.openstreetmap.org/?mlat=${Number(location.latitude)}&mlon=${Number(location.longitude)}#map=16/${Number(location.latitude)}/${Number(location.longitude)}`
    : `https://www.openstreetmap.org/#map=14/${centerLat}/${centerLng}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Map Controls Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          {hasValidBusGps ? (
            <span style={{ color: '#15803d', fontWeight: 700 }}>
              🟢 Live Bus: ({Number(location.latitude).toFixed(5)}, {Number(location.longitude).toFixed(5)})
              {location.accuracy ? ` • ±${Math.round(location.accuracy)}m` : ''}
            </span>
          ) : (
            <span style={{ color: '#475569', fontWeight: 600 }}>
              📍 Route Stops ({validStops.length}) • <span style={{ color: '#b45309' }}>Waiting for live GPS signal</span>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="table-action-button"
            style={{ fontSize: 12, padding: '3px 8px' }}
            onClick={() => setUseOsmEmbed(!useOsmEmbed)}
          >
            {useOsmEmbed ? '🗺️ Switch to Vector Map' : '🛰️ Switch to OpenStreetMap Tiles'}
          </button>

          <a
            href={osmExternalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="table-action-button"
            style={{ fontSize: 12, padding: '3px 8px', textDecoration: 'none', color: '#0284c7' }}
          >
            ↗ Open in OpenStreetMap
          </a>
        </div>
      </div>

      {useOsmEmbed ? (
        /* OpenStreetMap iframe embed */
        <div
          style={{
            width: '100%',
            height: 340,
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #cbd5e1',
          }}
        >
          <iframe
            title="OpenStreetMap Live"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            marginHeight="0"
            marginWidth="0"
            src={osmEmbedUrl}
          />
        </div>
      ) : (
        /* High-performance Vector Route Map */
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            overflow: 'hidden',
          }}
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          >
            {/* Background Grid Lines */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
              </pattern>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="glow" />
                <feComposite in="SourceGraphic" in2="glow" operator="over" />
              </filter>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Route Connecting Path */}
            {pathPoints && (
              <>
                <polyline
                  points={pathPoints}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.4"
                />
                <polyline
                  points={pathPoints}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="4"
                  strokeDasharray="6,4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Stop Markers */}
            {projectedStops.map((stop, idx) => {
              const isReached = stop.isReached;
              const isCurrent = stop.status === 'CURRENT';

              const fillColor = isReached ? '#22c55e' : isCurrent ? '#3b82f6' : '#94a3b8';
              const strokeColor = isReached ? '#15803d' : isCurrent ? '#1d4ed8' : '#64748b';

              // Alternate text placement (left / right) based on position to avoid edge clipping
              const textOnLeft = stop.x > width - 160;
              const labelX = textOnLeft ? -14 : 14;
              const textAnchor = textOnLeft ? 'end' : 'start';

              return (
                <g key={stop.id} transform={`translate(${stop.x}, ${stop.y})`}>
                  <title>{`${stop.stop_order || idx + 1}. ${stop.name} (${Number(stop.latitude).toFixed(4)}, ${Number(stop.longitude).toFixed(4)})`}</title>
                  {/* Arrival radius indication */}
                  <circle
                    r="18"
                    fill={fillColor}
                    opacity={isReached ? 0.15 : isCurrent ? 0.25 : 0.08}
                  />

                  {/* Stop Node */}
                  <circle
                    r="11"
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth="2.5"
                  />

                  {/* Order Number */}
                  <text
                    textAnchor="middle"
                    dy="4"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="800"
                  >
                    {stop.stop_order || idx + 1}
                  </text>

                  {/* Stop Label */}
                  <text
                    x={labelX}
                    y="4"
                    textAnchor={textAnchor}
                    fontSize="11"
                    fontWeight={isCurrent ? '800' : '600'}
                    fill={isCurrent ? '#1e3a8a' : '#1e293b'}
                    style={{ textShadow: '0 1px 2px #ffffff, 0 0 4px #ffffff' }}
                  >
                    {stop.name}
                  </text>
                </g>
              );
            })}

            {/* Live Bus Position Marker */}
            {busPoint && (
              <g transform={`translate(${busPoint.x}, ${busPoint.y})`} filter="url(#glow)">
                {/* Pulsing Radar Ring */}
                <circle r="26" fill="#3b82f6" opacity="0.25">
                  <animate
                    attributeName="r"
                    values="16;30;16"
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.35;0.05;0.35"
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                </circle>

                {/* Bus Pin Circle */}
                <circle r="14" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2.5" />

                {/* Bus Emoji Icon */}
                <text textAnchor="middle" dy="5" fontSize="13">
                  🚌
                </text>

                {/* Bus Label */}
                <g transform="translate(0, -20)">
                  <rect
                    x="-32"
                    y="-14"
                    width="64"
                    height="18"
                    rx="4"
                    fill="#1e293b"
                    opacity="0.9"
                  />
                  <text
                    textAnchor="middle"
                    y="-2"
                    fontSize="10"
                    fontWeight="700"
                    fill="#ffffff"
                  >
                    {busNumber}
                  </text>
                </g>
              </g>
            )}
          </svg>
        </div>
      )}
    </div>
  );
}

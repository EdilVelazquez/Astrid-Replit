import { useMemo } from 'react';
import { Coordinates } from '../utils/haversine';

interface MapViewProps {
  servicePoint: Coordinates;
  userLocation?: Coordinates | null;
  distance?: number | null;
}

export function MapView({ servicePoint, userLocation, distance }: MapViewProps) {
  const bounds = useMemo(() => {
    const points = [servicePoint];
    if (userLocation) {
      points.push(userLocation);
    }

    const lats = points.map(p => p.latitude);
    const lons = points.map(p => p.longitude);
    
    const padding = 0.003;
    
    return {
      minLat: Math.min(...lats) - padding,
      maxLat: Math.max(...lats) + padding,
      minLon: Math.min(...lons) - padding,
      maxLon: Math.max(...lons) + padding,
    };
  }, [servicePoint, userLocation]);

  const center = useMemo(() => {
    if (userLocation) {
      return {
        lat: (servicePoint.latitude + userLocation.latitude) / 2,
        lon: (servicePoint.longitude + userLocation.longitude) / 2,
      };
    }
    return {
      lat: servicePoint.latitude,
      lon: servicePoint.longitude,
    };
  }, [servicePoint, userLocation]);


  const latToY = (lat: number) => {
    const range = bounds.maxLat - bounds.minLat;
    if (range === 0) return 50;
    return ((bounds.maxLat - lat) / range) * 100;
  };

  const lonToX = (lon: number) => {
    const range = bounds.maxLon - bounds.minLon;
    if (range === 0) return 50;
    return ((lon - bounds.minLon) / range) * 100;
  };

  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bounds.minLon},${bounds.minLat},${bounds.maxLon},${bounds.maxLat}&layer=mapnik&marker=${center.lat},${center.lon}`;

  return (
    <div className="relative w-full h-64 rounded-lg overflow-hidden border border-gray-200">
      <iframe
        src={osmUrl}
        className="w-full h-full border-0"
        style={{ pointerEvents: 'none' }}
        title="Mapa de ubicación"
      />
      
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {userLocation && (
          <line
            x1={lonToX(servicePoint.longitude)}
            y1={latToY(servicePoint.latitude)}
            x2={lonToX(userLocation.longitude)}
            y2={latToY(userLocation.latitude)}
            stroke="#3B82F6"
            strokeWidth="0.8"
            strokeDasharray="2,1"
          />
        )}
        
        <circle
          cx={lonToX(servicePoint.longitude)}
          cy={latToY(servicePoint.latitude)}
          r="3"
          fill="#DC2626"
          stroke="#fff"
          strokeWidth="1"
        />
        
        {userLocation && (
          <circle
            cx={lonToX(userLocation.longitude)}
            cy={latToY(userLocation.latitude)}
            r="3"
            fill="#3B82F6"
            stroke="#fff"
            strokeWidth="1"
          />
        )}
      </svg>

      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs shadow">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span className="text-gray-700">Punto de servicio</span>
          </div>
          {userLocation && (
            <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs shadow">
              <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
              <span className="text-gray-700">Tu ubicación</span>
            </div>
          )}
        </div>
        
        {distance !== null && distance !== undefined && (
          <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded shadow">
            <span className="text-sm font-semibold text-gray-800">
              {distance.toFixed(0)} m
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

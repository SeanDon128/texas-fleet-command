import { useEffect, useState } from 'react';
import { divIcon, type LatLngBoundsExpression } from 'leaflet';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { RegionRecord, VehicleRecord, VehicleStatus } from '@rayfin-app/shared';
import { STATUS } from '@/lib/fleet';

const TEXAS: LatLngBoundsExpression = [[25.6, -106.8], [36.8, -93.4]];
const SHAPES: Record<VehicleStatus, string> = {
  en_route: '<path d="M12 5 19 19 12 16 5 19Z" fill="currentColor"/>',
  at_stop: '<rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor"/>',
  idle: '<circle cx="12" cy="12" r="5" fill="currentColor"/>',
  maintenance: '<path d="m12 4 8 8-8 8-8-8Z" fill="currentColor"/>',
  offline: '<path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="3"/>',
};

function truckIcon(status: VehicleStatus, selected: boolean) {
  return divIcon({
    className: `fleet-marker ${status}${selected ? ' selected' : ''}`,
    html: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="var(--color-card)" stroke="currentColor" stroke-width="2"/>${SHAPES[status]}</svg>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const cityIcon = divIcon({ className: 'fleet-city', html: '', iconSize: [0, 0] });

function Viewport({ region, selected, reset }: {
  region?: RegionRecord; selected?: VehicleRecord; reset: number;
}) {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  useEffect(() => {
    if (region) map.setView([region.centerLat, region.centerLng], 8, { animate: false });
    else map.fitBounds(TEXAS, { padding: [12, 12], animate: false });
  }, [map, region, reset]);
  useEffect(() => {
    if (selected) map.setView([selected.lat, selected.lng], Math.max(map.getZoom(), 10), { animate: false });
  }, [map, selected]);
  return null;
}

export default function FleetMap({ vehicles, regions, region, selected, reset, onSelect }: {
  vehicles: VehicleRecord[];
  regions: RegionRecord[];
  region?: RegionRecord;
  selected?: VehicleRecord;
  reset: number;
  onSelect: (id: string) => void;
}) {
  const [tileError, setTileError] = useState(false);
  return <div className="relative h-fleet-map bg-map" aria-label="Texas fleet map">
    <MapContainer bounds={TEXAS} boundsOptions={{ padding: [12, 12] }}
      className="h-full w-full" scrollWheelZoom={false} minZoom={5} maxZoom={15} zoomSnap={0.25}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        eventHandlers={{ tileerror: () => setTileError(true) }}
      />
      <Viewport region={region} selected={selected} reset={reset} />
      {regions.map((city) => <Marker key={city.id} position={[city.centerLat, city.centerLng]}
        icon={cityIcon} interactive={false} keyboard={false}>
        <Tooltip permanent direction="top" offset={[0, -14]} opacity={1}>{city.code}</Tooltip>
      </Marker>)}
      {vehicles.map((vehicle) => <Marker key={vehicle.id} position={[vehicle.lat, vehicle.lng]}
        icon={truckIcon(vehicle.status, vehicle.id === selected?.id)}
        title={`${vehicle.vehicleCode}: ${STATUS[vehicle.status].label}`}
        keyboard eventHandlers={{
          click: () => onSelect(vehicle.id),
          keydown: (event) => {
            if (event.originalEvent.key === 'Enter' || event.originalEvent.key === ' ') {
              event.originalEvent.preventDefault();
              onSelect(vehicle.id);
            }
          },
        }}
        zIndexOffset={vehicle.id === selected?.id ? 1000 : 0}>
        <Tooltip>{vehicle.vehicleCode} / {vehicle.callSign}<br />{STATUS[vehicle.status].label}</Tooltip>
      </Marker>)}
    </MapContainer>
    <div className="pointer-events-none absolute bottom-800 left-300 z-[1000] rounded-md border border-border bg-card/95 px-300 py-200 text-200 shadow-sm">
      <strong className="font-heading text-400">TEXAS</strong> / Synthetic positions
    </div>
    {tileError && <p role="status" className="absolute left-300 right-300 top-300 z-[1000] rounded-md border border-warning-border bg-warning-surface p-300 text-200 text-warning">
      Some public basemap tiles could not load. Fabric vehicle markers and the accessible roster remain available.
    </p>}
  </div>;
}

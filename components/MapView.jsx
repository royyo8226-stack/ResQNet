"use client";

import { useEffect } from "react";
import {
  LayersControl,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Phone, MessageCircle, MapPin, ShieldCheck } from "lucide-react";
import ReactDOMServer from "react-dom/server";

// Fix for default Leaflet icons in Next.js
const createIcon = (color) => L.divIcon({
  html: ReactDOMServer.renderToString(
    <div style={{ color: color, filter: `drop-shadow(0 0 8px ${color})` }}>
      <MapPin size={32} fill="currentColor" fillOpacity={0.2} strokeWidth={2.5} />
    </div>
  ),
  className: "custom-marker",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const donorIcon = createIcon("#ef4444");
const userIcon = createIcon("#2563eb");

function MapController({ center, zoom, points }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 80);

    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [map]);

  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
      map.fitBounds(bounds, { padding: [44, 44], animate: true, maxZoom: 14 });
      return;
    }

    if (center) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map, points]);

  return null;
}

export default function MapView({ donors = [], userLocation, topMatchId }) {
  const mappableDonors = donors.filter(
    (donor) => Number.isFinite(donor.location?.lat) && Number.isFinite(donor.location?.lng)
  );

  const topDonor = mappableDonors.find((donor) => donor.id === topMatchId) || mappableDonors[0] || null;

  const defaultCenter = [20.5937, 78.9629]; // India center
  const hasUserLocation = Number.isFinite(userLocation?.lat) && Number.isFinite(userLocation?.lng);

  const mapCenter = hasUserLocation
    ? [userLocation.lat, userLocation.lng]
    : topDonor
      ? [topDonor.location.lat, topDonor.location.lng]
      : defaultCenter;

  const zoomLevel = hasUserLocation ? 13 : topDonor ? 10 : 5;

  const points = [
    ...(hasUserLocation ? [{ lat: userLocation.lat, lng: userLocation.lng }] : []),
    ...mappableDonors.map((donor) => ({ lat: donor.location.lat, lng: donor.location.lng })),
  ];

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoomLevel}
      style={{ height: "100%", width: "100%", background: "var(--void-800)" }}
      zoomControl={false}
    >
      <ZoomControl position="topright" />

      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Street">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      
      <MapController center={mapCenter} zoom={zoomLevel} points={points} />

      {hasUserLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
          <Popup>
            <div style={{ textAlign: 'center', fontWeight: 700 }}>Your Location</div>
          </Popup>
        </Marker>
      )}

      {mappableDonors.map((donor) => (
        <Marker
          key={donor.id}
          position={[donor.location.lat, donor.location.lng]}
          icon={donorIcon}
        >
          <Popup className="donor-popup">
            <div style={{ minWidth: 160 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <strong style={{ fontSize: '1rem' }}>{donor.fullName}</strong>
                {donor.status === "verified" && <ShieldCheck size={14} color="var(--life-green)" />}
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                {donor.resourceType === "Blood" ? donor.bloodGroup || "Blood" : donor.resourceType} · {donor.donorType}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <a 
                  href={`tel:${donor.phoneNumber}`} 
                  style={{ 
                    background: 'var(--blood-red)', color: '#fff', padding: '8px', 
                    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}
                >
                  <Phone size={14} />
                </a>
                <a 
                  href={`https://wa.me/${donor.whatsappNumber?.replace(/[^0-9]/g, '')}`} 
                  target="_blank" rel="noreferrer"
                  style={{ 
                    background: 'var(--life-green)', color: '#fff', padding: '8px', 
                    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}
                >
                  <MessageCircle size={14} />
                </a>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

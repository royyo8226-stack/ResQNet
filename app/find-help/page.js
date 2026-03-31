"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BLOOD_GROUPS, SEARCH_RESOURCE_TYPES } from "@/lib/constants";
import { LocateFixed, Phone, MessageCircle, MapPinned, ListFilter, LoaderCircle, Zap, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import styles from "./page.module.css";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <LoaderCircle className={styles.spin} size={20} /> Loading map...
    </div>
  ),
});

function cleanPhone(number) {
  return String(number || "").replace(/[^0-9]/g, "");
}

export default function FindHelpPage() {
  const [resourceType, setResourceType] = useState("All");
  const [bloodGroup, setBloodGroup] = useState("");
  const [scope, setScope] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [maxDistanceKm, setMaxDistanceKm] = useState(25);
  const [urgency, setUrgency] = useState("normal");

  const [location, setLocation] = useState(null);
  const [locationMessage, setLocationMessage] = useState("Detecting your location...");
  const [locating, setLocating] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [donors, setDonors] = useState([]);
  const [topMatchId, setTopMatchId] = useState(null);

  const bloodGroupDisabled = resourceType !== "Blood";

  const applyLocation = useCallback((pos, notify = true) => {
    const lat = Number(pos?.coords?.latitude);
    const lng = Number(pos?.coords?.longitude);
    const accuracy = Number(pos?.coords?.accuracy);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setLocation(null);
      setLocationMessage("Unable to read GPS coordinates. Showing broad results.");
      if (notify) {
        toast.error("Unable to read GPS coordinates.");
      }
      return;
    }

    setLocation({ lat, lng });

    if (Number.isFinite(accuracy)) {
      const rounded = Math.max(1, Math.round(accuracy));
      if (rounded <= 100) {
        setLocationMessage(`Live location detected (±${rounded}m).`);
        if (notify) {
          toast.success("Accurate location detected.");
        }
      } else {
        setLocationMessage(`Approx location detected (±${rounded}m).`);
        if (notify) {
          toast.success("Approximate location detected.");
        }
      }
    } else {
      setLocationMessage("Live location detected.");
      if (notify) {
        toast.success("Location detected.");
      }
    }
  }, []);

  const requestUserLocation = useCallback((notify = true) => {
    if (!navigator.geolocation) {
      setLocationMessage("Location access unavailable. Showing broad results.");
      setLocation(null);
      if (notify) {
        toast.error("Location is unavailable on this device.");
      }
      return;
    }

    setLocating(true);
    setLocationMessage("Getting your live location...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyLocation(pos, notify);
        setLocating(false);
      },
      () => {
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => {
            applyLocation(fallbackPos, notify);
            setLocating(false);
          },
          () => {
            setLocation(null);
            setLocationMessage("Location blocked. You can still search without location.");
            if (notify) {
              toast.error("Location access blocked. Search will still work without GPS.");
            }
            setLocating(false);
          },
          { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [applyLocation]);

  useEffect(() => {
    requestUserLocation(false);
  }, [requestUserLocation]);

  const fetchDonors = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams();
      query.set("resourceType", resourceType);
      query.set("nearMe", String(scope === "near"));
      query.set("verifiedOnly", String(verifiedOnly));
      query.set("availableOnly", String(availableOnly));
      query.set("maxDistanceKm", String(scope === "near" ? maxDistanceKm : 0));
      query.set("urgent", String(urgency === "urgent"));

      if (!bloodGroupDisabled && bloodGroup) {
        query.set("bloodGroup", bloodGroup);
      }

      if (Number.isFinite(location?.lat) && Number.isFinite(location?.lng)) {
        query.set("lat", String(location.lat));
        query.set("lng", String(location.lng));
      }

      const response = await fetch(`/api/donors?${query.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to fetch donor list");
      }

      setDonors(data.donors || []);
      setTopMatchId(data.topMatchId || null);
    } catch (err) {
      setError(err.message);
      toast.error(err.message || "Could not load emergency resources");
      setDonors([]);
      setTopMatchId(null);
    } finally {
      setLoading(false);
    }
  }, [availableOnly, bloodGroup, bloodGroupDisabled, location?.lat, location?.lng, maxDistanceKm, resourceType, scope, urgency, verifiedOnly]);

  useEffect(() => {
    fetchDonors();
  }, [fetchDonors]);

  const topMatch = useMemo(() => donors.find((donor) => donor.id === topMatchId), [donors, topMatchId]);

  return (
    <section className={`container ${styles.page}`}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <p className={styles.kicker}>Emergency Finder</p>
          <h1>Find emergency support near you</h1>
          <p className={styles.subtext}>Blood, oxygen, ICU beds, and critical supplies in one place.</p>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <aside className={`card ${styles.filtersPanel}`}>
          <div className={styles.filterTitle}>
            <ListFilter size={18} /> <span>Search Filters</span>
          </div>
          
          <div className={styles.filtersStack}>
            <div className={styles.filterItem}>
              <label>Resource Type</label>
              <select className="select" value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
                {SEARCH_RESOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className={styles.filterItem}>
              <label>Blood Group</label>
              {bloodGroupDisabled ? (
                <p className={styles.helperText}>Not required for selected resource type.</p>
              ) : (
                <select className="select" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                  <option value="">Any blood group</option>
                  {BLOOD_GROUPS.map((group) => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
              )}
            </div>

            <div className={styles.filterItem}>
              <label>Search Scope</label>
              <select className="select" value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="near">Near Me (Live Loc/Pincode)</option>
                <option value="all">Global Network</option>
              </select>
            </div>

            <div className={styles.filterItem}>
              <label>Max Distance</label>
              <select className="select" value={maxDistanceKm} onChange={(e) => setMaxDistanceKm(Number(e.target.value))}>
                <option value={5}>Within 5 km</option>
                <option value={10}>Within 10 km</option>
                <option value={25}>Within 25 km</option>
                <option value={50}>Within 50 km</option>
              </select>
            </div>

            <div className={styles.toggleItem}>
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} id="verifiedToggle" />
              <label htmlFor="verifiedToggle">Verified Donors Only</label>
            </div>

            <div className={styles.toggleItem}>
              <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} id="availableToggle" />
              <label htmlFor="availableToggle">Available Now Only</label>
            </div>

            <button className="btn btnPrimary" style={{ width: '100%' }} onClick={fetchDonors}>
              <LocateFixed size={18} /> Update Results
            </button>

            <button className="btn btnGhost" style={{ width: '100%' }} onClick={requestUserLocation} disabled={locating}>
              <MapPinned size={18} /> {locating ? "Locating..." : "Use My Location"}
            </button>

            <p className={styles.locationMessage}><MapPinned size={14} /> {locationMessage}</p>
            {error ? <p className={styles.errorText}>{error}</p> : null}
          </div>
        </aside>

        <div className={styles.viewContent}>
          <div className={`card ${styles.mapContainer}`}>
            <MapView donors={donors} userLocation={location} topMatchId={topMatchId} />
          </div>

          {donors.length === 0 && !loading ? (
            <div className={styles.warningBox}>
              <Zap size={20} color="var(--blood-red)" />
              <p>No donors in this range. Try wider distance or disable strict filters.</p>
            </div>
          ) : null}

          <div className={styles.resultsArea}>
            {topMatch && (
              <div className={`card ${styles.premiumCard}`}>
                <div className={styles.cardGlow} />
                  <span className={styles.topBadge}>Top Match</span>
                <h2>{topMatch.fullName}</h2>
                <div className={styles.donorMeta}>
                  <span><strong>{topMatch.resourceType === "Blood" ? topMatch.bloodGroup || "Blood" : topMatch.resourceType}</strong></span>
                  <span>{topMatch.donorType}</span>
                  <span>{topMatch.distanceKm ? `${topMatch.distanceKm.toFixed(1)} km` : "Distance unavailable"}</span>
                </div>
                <div className={styles.cardActions}>
                  <a href={`tel:${topMatch.phoneNumber}`} className="btn btnPrimary"><Phone size={18} /> Call</a>
                  <a href={`https://wa.me/${cleanPhone(topMatch.whatsappNumber)}`} target="_blank" rel="noreferrer" className="btn btnGhost"><MessageCircle size={18} /> WhatsApp</a>
                </div>
              </div>
            )}

            <div className={styles.cardsGrid}>
              {donors.filter(d => d.id !== topMatchId).map((donor) => (
                <article key={donor.id} className={`card ${styles.donorCard}`}>
                  <div className={styles.cardHeader}>
                    <h3>{donor.fullName}</h3>
                    {donor.status === "verified" && <ShieldCheck size={16} color="var(--life-green)" />}
                  </div>
                  <p className={styles.donorDetails}>{donor.resourceType === "Blood" ? donor.bloodGroup || "Blood" : donor.resourceType} · {donor.donorType}</p>
                  <p className={styles.donorDist}>{donor.distanceKm ? `${donor.distanceKm.toFixed(1)} km` : "Distance unavailable"}</p>
                  <div className={styles.cardFooter}>
                    <div className={styles.smallActions}>
                      <a href={`tel:${donor.phoneNumber}`} title="Call"><Phone size={16} /></a>
                      <a href={`https://wa.me/${cleanPhone(donor.whatsappNumber)}`} target="_blank" rel="noreferrer" title="WhatsApp"><MessageCircle size={16} /></a>
                    </div>
                    {donor.availableNow ? <span className="pill pillActive">Active</span> : <span className="pill pillInactive">Offline</span>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

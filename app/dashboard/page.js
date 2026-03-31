"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ShieldAlert, MapPin, Phone, MessageCircle, User as UserIcon, Bell, Activity, Settings, LogOut } from "lucide-react";
import styles from "./dashboard.module.css";

export default function UserDashboard() {
  const router = useRouter();
  const [isAvailable, setIsAvailable] = useState(true);
  const [donorData, setDonorData] = useState({
    fullName: "ResQNet User",
    bloodGroup: "-",
    status: "pending",
    phone: "-",
    whatsapp: "-",
    address: "Add details by applying as donor",
    pincode: "-",
    donorType: "Individual",
    joinedAt: "Recently"
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
          router.push("/signin");
          return;
        }

        const data = await response.json();
        if (data.user) {
          setDonorData((prev) => ({
            ...prev,
            fullName: data.user.fullName,
            phone: data.user.phoneNumber || prev.phone,
            whatsapp: data.user.phoneNumber || prev.whatsapp,
          }));
        }
      } catch {
        router.push("/signin");
      }
    }

    loadUser();
  }, [router]);

  const toggleAvailability = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsAvailable(!isAvailable);
      setLoading(false);
    }, 800);
  };

  async function signout() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/signin");
    router.refresh();
  }

  return (
    <section className={`container ${styles.dashboard}`}>
      <div className={styles.header}>
        <div className={styles.userCore}>
          <div className={styles.avatar}>
            <UserIcon size={32} />
          </div>
          <div>
            <p className={styles.kicker}>Donor Dashboard</p>
            <h1>Welcome back, {donorData.fullName}</h1>
          </div>
        </div>
        <div className={styles.statusGroup}>
          <div className={`${styles.statusBadge} ${donorData.status === 'verified' ? styles.statusVerified : styles.statusPending}`}>
            {donorData.status === 'verified' ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
            <span>{donorData.status === 'verified' ? 'Verified Account' : 'Verification Pending'}</span>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.mainCol}>
          <div className={`card ${styles.card} ${styles.availabilityCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.titleInfo}>
                <Activity size={20} color={isAvailable ? "var(--life-green)" : "var(--text-muted)"} />
                <h3>Live Status</h3>
              </div>
              <p className={isAvailable ? styles.textActive : styles.textInactive}>
                {isAvailable ? "You are currently visible to Needers" : "You are currently hidden from search"}
              </p>
            </div>
            
            <button 
              className={`${styles.toggleBtn} ${isAvailable ? styles.btnActive : styles.btnInactive}`}
              onClick={toggleAvailability}
              disabled={loading}
            >
              <div className={styles.switchTrack}>
                <div className={styles.switchThumb} />
              </div>
              <span>{isAvailable ? "Switch to Unavailable" : "Switch to Active Now"}</span>
            </button>
          </div>

          <div className={`card ${styles.card} ${styles.profileCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.titleInfo}>
                <Settings size={20} />
                <h3>Profile Information</h3>
              </div>
            </div>
            
            <div className={styles.profileGrid}>
              <div className={styles.infoField}>
                <label>Blood Group</label>
                <p>{donorData.bloodGroup}</p>
              </div>
              <div className={styles.infoField}>
                <label>Donor Type</label>
                <p>{donorData.donorType}</p>
              </div>
              <div className={styles.infoField}>
                <label>Phone Number</label>
                <div className={styles.contactRow}><Phone size={14} /> {donorData.phone}</div>
              </div>
              <div className={styles.infoField}>
                <label>WhatsApp</label>
                <div className={styles.contactRow}><MessageCircle size={14} /> {donorData.whatsapp}</div>
              </div>
              <div className={styles.infoField} style={{ gridColumn: 'span 2' }}>
                <label>Address & Pincode</label>
                <div className={styles.contactRow}><MapPin size={14} /> {donorData.address} ({donorData.pincode})</div>
              </div>
            </div>

            <Link href="/become-donor" className="btn btnGhost" style={{ width: '100%', marginTop: '24px' }}>
              Apply to Become Donor
            </Link>
          </div>
        </div>

        <aside className={styles.sideCol}>
          <div className={`card ${styles.card} ${styles.notificationCard}`}>
            <div className={styles.cardHeader}>
              <div className={styles.titleInfo}>
                <Bell size={20} />
                <h3>Recent Activity</h3>
              </div>
            </div>
            <div className={styles.activityList}>
              <div className={styles.activityItem}>
                <div className={styles.activityMarker} />
                <p><strong>Profile Verified</strong><br /><span>Your account was approved by Admin.</span></p>
              </div>
              <div className={styles.activityItem}>
                <div className={styles.activityMarker} />
                <p><strong>Joined Network</strong><br /><span>Registration completed successfully.</span></p>
              </div>
            </div>
          </div>

          <button className={`${styles.logoutBtn}`} onClick={signout}>
             <LogOut size={18} /> Sign Out
          </button>
        </aside>
      </div>
    </section>
  );
}

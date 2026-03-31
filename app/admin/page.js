"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCheck, CircleX, LoaderCircle, ShieldCheck, User, MapPin, Phone, MessageCircle, RefreshCw } from "lucide-react";
import { formatLastActive } from "@/lib/utils";
import { toast } from "sonner";
import styles from "./page.module.css";

export default function AdminPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  const loadDonors = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/donors?status=${statusFilter}`);
      const data = await response.json();
      if (response.status === 401 || response.status === 403) {
        setUnauthorized(true);
        setDonors([]);
        toast.error(data.message || "Admin access required");
        return;
      }
      if (!response.ok) throw new Error(data.message || "Failed to load donor list");
      setUnauthorized(false);
      setDonors(data.donors || []);
    } catch (error) {
      toast.error(error.message || "Could not load donor list");
      setDonors([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadDonors();
  }, [loadDonors]);

  async function updateDonor(id, action) {
    try {
      const response = await fetch(`/api/admin/donors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update donor");
      toast.success(data.message || "Donor status updated");
      loadDonors();
    } catch (error) {
      toast.error(error.message || "Could not update donor");
    }
  }

  return (
    <section className={`container ${styles.page}`}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <p className={styles.kicker}>Verification Center</p>
          <h1>Review provider registrations</h1>
          <p className={styles.subtext}>Approve blood donors and emergency resource providers.</p>
        </div>

        <div className={styles.controls}>
          <div className={styles.filterWrap}>
             <label>Status Filter</label>
             <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
               <option value="all">All Records</option>
               <option value="pending">Pending Review</option>
               <option value="verified">Verified Providers</option>
               <option value="rejected">Rejected Entries</option>
             </select>
          </div>
          <button className="btn btnGhost" onClick={loadDonors} title="Refresh Records">
            <RefreshCw size={18} className={loading ? styles.spin : ''} />
          </button>
        </div>
      </div>

      {unauthorized ? (
        <div className={`card ${styles.emptyState}`}>
          <ShieldCheck size={42} className={styles.emptyIcon} />
          <h3>Admin access required</h3>
          <p>Sign in with an admin account to review donor requests.</p>
          <p className={styles.message}>Use <Link href="/signin">Sign In</Link> and open Admin again.</p>
        </div>
      ) : null}

      {loading && donors.length === 0 && (
        <div className={styles.loadingState}>
          <LoaderCircle className={styles.spin} size={24} />
          <p>Syncing with donor database...</p>
        </div>
      )}

      {!loading && !unauthorized && donors.length === 0 ? (
        <div className={`card ${styles.emptyState}`}>
          <User size={48} className={styles.emptyIcon} />
          <h3>No records found</h3>
          <p>No provider records in the <strong>{statusFilter}</strong> queue right now.</p>
        </div>
      ) : null}

      <div className={styles.donorGrid}>
        {donors.map((donor) => (
          <article key={donor.id} className={`card ${styles.donorItem} ${donor.status === 'verified' ? styles.itemVerified : ''}`}>
            <div className={styles.itemHeader}>
              <div className={styles.donorInfo}>
                <div className={styles.donorIdentity}>
                  <h2>{donor.fullName}</h2>
                  {donor.status === "verified" && (
                    <div className={styles.verifiedBadge} title="Verified Donor">
                      <ShieldCheck size={20} fill="var(--life-green)" color="#fff" />
                    </div>
                  )}
                </div>
                <div className={styles.donorTypePill}>
                  {donor.resourceType === "Blood" ? donor.bloodGroup || "Blood" : donor.resourceType} · {donor.donorType}
                </div>
              </div>
              <div className={styles.statusPill}>
                {donor.status === "verified" ? <span className={styles.pillGreen}>VERIFIED</span> : null}
                {donor.status === "pending" ? <span className={styles.pillYellow}>PENDING</span> : null}
                {donor.status === "rejected" ? <span className={styles.pillRed}>REJECTED</span> : null}
              </div>
            </div>

            <div className={styles.detailsGrid}>
              <div className={styles.detailBox}>
                <label>Gender</label>
                <p>{donor.gender}</p>
              </div>
              <div className={styles.detailBox}>
                <label>Phone Number</label>
                <p className={styles.contactLink}><Phone size={14} /> {donor.phoneNumber}</p>
              </div>
              <div className={styles.detailBox}>
                <label>WhatsApp</label>
                <p className={styles.contactLink}><MessageCircle size={14} /> {donor.whatsappNumber}</p>
              </div>
              <div className={styles.detailBox}>
                <label>Pincode</label>
                <p>{donor.pincode}</p>
              </div>
              <div className={styles.detailBox} style={{ gridColumn: 'span 2' }}>
                <label>Full Address</label>
                <p><MapPin size={14} /> {donor.address}</p>
              </div>
              {donor.resourceNotes ? (
                <div className={styles.detailBox} style={{ gridColumn: 'span 2' }}>
                  <label>Resource Notes</label>
                  <p>{donor.resourceNotes}</p>
                </div>
              ) : null}
            </div>

            <div className={styles.itemFooter}>
              <div className={styles.timestamps}>
                <span>Registered: {formatLastActive(donor.createdAt || donor.lastActiveAt)}</span>
              </div>
              <div className={styles.actionGroup}>
                {donor.status !== "verified" && (
                  <button className="btn btnPrimary" onClick={() => updateDonor(donor.id, "approve")}>
                    <CheckCheck size={16} /> Verify Donor
                  </button>
                )}
                {donor.status !== "rejected" && (
                  <button className="btn btnGhost" onClick={() => updateDonor(donor.id, "reject")}>
                    <CircleX size={16} /> Reject
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {unauthorized ? (
        <p className={styles.message}>
          Please sign in as admin from <Link href="/signin">Sign In</Link> to continue.
        </p>
      ) : null}
    </section>
  );
}

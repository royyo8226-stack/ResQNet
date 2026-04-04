"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Activity, HeartPulse, LocateFixed, Mail, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";
import {
  BLOOD_DONOR_TYPES,
  BLOOD_GROUPS,
  GENDERS,
  RESOURCE_PROVIDER_TYPES,
  RESOURCE_TYPES,
} from "@/lib/constants";
import styles from "./page.module.css";

function defaultExpiryLocalValue() {
  const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const localDate = new Date(expiryDate.getTime() - expiryDate.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

const initialForm = {
  fullName: "",
  email: "",
  phoneNumber: "",
  whatsappNumber: "",
  gender: GENDERS[0],
  resourceType: "Blood",
  bloodGroup: BLOOD_GROUPS[0],
  donorType: BLOOD_DONOR_TYPES[0],
  resourceNotes: "",
  address: "",
  pincode: "",
  latitude: "",
  longitude: "",
  availableNow: true,
  preferredContact: "Call",
  expiresAt: defaultExpiryLocalValue(),
  otpVerificationToken: "",
};

const stepTitles = [
  "Personal Profile",
  "Resource Details",
  "Location Setup",
  "Availability & Expiry",
  "Final Review",
];

function getDonorTypeOptions(resourceType) {
  return resourceType === "Blood" ? BLOOD_DONOR_TYPES : RESOURCE_PROVIDER_TYPES;
}

export default function BecomeDonorPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [donorId, setDonorId] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const isBloodResource = form.resourceType === "Blood";

  const minimumExpiry = useMemo(() => {
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localNow.toISOString().slice(0, 16);
  }, []);

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email), [form.email]);

  const donorTypeOptions = useMemo(() => getDonorTypeOptions(form.resourceType), [form.resourceType]);

  const canContinue = useMemo(() => {
    if (step === 0) {
      return form.fullName && form.phoneNumber && form.whatsappNumber && form.gender && emailValid && otpVerified;
    }
    if (step === 1) {
      if (isBloodResource) return form.resourceType && form.bloodGroup && form.donorType;
      return form.resourceType && form.donorType && form.resourceNotes.trim().length >= 5;
    }
    if (step === 2) return form.address && form.pincode && form.latitude && form.longitude;
    if (step === 3) return form.preferredContact && form.expiresAt;
    return true;
  }, [emailValid, form, isBloodResource, otpVerified, step]);

  function updateForm(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "email" ? { otpVerificationToken: "" } : {}),
    }));

    if (key === "email") {
      setOtpSent(false);
      setOtpVerified(false);
      setOtpCode("");
    }
  }

  function updateResourceType(resourceType) {
    const options = getDonorTypeOptions(resourceType);

    setForm((prev) => ({
      ...prev,
      resourceType,
      donorType: options.includes(prev.donorType) ? prev.donorType : options[0],
      bloodGroup: resourceType === "Blood" ? prev.bloodGroup || BLOOD_GROUPS[0] : "",
    }));
  }

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (response.ok && data.user) {
          setSignedIn(true);
          setForm((prev) => ({
            ...prev,
            fullName: prev.fullName || data.user.fullName || "",
            email: prev.email || data.user.email || "",
            phoneNumber: prev.phoneNumber || data.user.phoneNumber || "",
            whatsappNumber: prev.whatsappNumber || data.user.phoneNumber || "",
          }));
        } else {
          setSignedIn(false);
        }
      } catch {
        setSignedIn(false);
      } finally {
        setAuthChecked(true);
      }
    }

    loadCurrentUser();
  }, []);

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is unavailable on this device.");
      return;
    }

    toast.info("Detecting your location...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateForm("latitude", String(pos.coords.latitude));
        updateForm("longitude", String(pos.coords.longitude));
        toast.success("Location captured successfully.");
      },
      () => toast.error("Location access denied. Please allow location and try again."),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function sendOtp() {
    if (!emailValid) {
      toast.error("Please enter a valid email first.");
      return;
    }

    setSendingOtp(true);
    setOtpVerified(false);
    setOtpCode("");

    try {
      const response = await fetch("/api/donors/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to send OTP");

      setOtpSent(true);
      setForm((prev) => ({ ...prev, otpVerificationToken: "" }));
      toast.success(`OTP sent to ${form.email}. Expires in ${data.expiresInMinutes || 10} minutes.`);
    } catch (error) {
      toast.error(error.message || "Failed to send OTP");
      setOtpSent(false);
    } finally {
      setSendingOtp(false);
    }
  }

  async function verifyOtp() {
    if (!/^\d{6}$/.test(otpCode)) {
      toast.error("Enter the 6-digit OTP sent to your email.");
      return;
    }

    setVerifyingOtp(true);

    try {
      const response = await fetch("/api/donors/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otpCode }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "OTP verification failed");

      setOtpVerified(true);
      setForm((prev) => ({ ...prev, otpVerificationToken: data.otpVerificationToken }));
      toast.success("Email verified successfully.");
    } catch (error) {
      setOtpVerified(false);
      setForm((prev) => ({ ...prev, otpVerificationToken: "" }));
      toast.error(error.message || "OTP verification failed");
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function submitRegistration() {
    if (!signedIn) {
      toast.error("Please sign in before registering.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/donors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          email: String(form.email || "").trim().toLowerCase(),
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          expiresAt: new Date(form.expiresAt).toISOString(),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Registration failed");

      setDonorId(data.donorId);
      setStep(4);
      toast.success(data.message || "Registration submitted for review.");
    } catch (error) {
      toast.error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={`container ${styles.page}`}>
      <div className={`card ${styles.formCard}`}>
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <p className={styles.kicker}>Provider Enrollment</p>
            <h1>Register emergency support</h1>
            <p className={styles.subtext}>Blood donors, oxygen, and critical resource providers.</p>
          </div>
          <div className={styles.statusPill}>
            Step {step + 1} of 5
          </div>
        </div>

        <div className={styles.progressContainer}>
          <div className={styles.progressBar} style={{ width: `${((step + 1) / 5) * 100}%` }} />
        </div>

        <div className={styles.stepTitle}>
           <span>0{step + 1}</span>
           <h2>{stepTitles[step]}</h2>
        </div>

        {authChecked && !signedIn ? (
          <div className={styles.alert}>
            Please <Link href="/signin" className={styles.alertLink}>sign in or create an account</Link> to continue.
          </div>
        ) : null}

        <div className={styles.formBody}>
          {step === 0 && (
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label>Full Name</label>
                <div className={styles.inputWrap}><User size={18} /><input className="input" placeholder="e.g. Rahul Sharma" value={form.fullName} onChange={(e) => updateForm("fullName", e.target.value)} /></div>
              </div>
              <div className={styles.field}>
                <label>Gender</label>
                <select className="select" value={form.gender} onChange={(e) => updateForm("gender", e.target.value)}>
                   {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Phone Number</label>
                <input className="input" placeholder="+91 00000 00000" value={form.phoneNumber} onChange={(e) => updateForm("phoneNumber", e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>WhatsApp Number</label>
                <input className="input" placeholder="+91 00000 00000" value={form.whatsappNumber} onChange={(e) => updateForm("whatsappNumber", e.target.value)} />
              </div>
              <div className={styles.field} style={{ gridColumn: "span 2" }}>
                <label>Email (OTP verification required)</label>
                <div className={styles.inputWrap}><Mail size={18} /><input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => updateForm("email", e.target.value)} /></div>
              </div>
              <div className={styles.otpArea} style={{ gridColumn: "span 2" }}>
                <button type="button" className="btn btnGhost" onClick={sendOtp} disabled={!emailValid || sendingOtp}>
                  {sendingOtp ? "Sending OTP..." : otpSent ? "Resend OTP" : "Send OTP"}
                </button>

                {otpSent ? (
                  <div className={styles.otpVerifyRow}>
                    <input
                      className="input"
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    />
                    <button type="button" className="btn btnPrimary" onClick={verifyOtp} disabled={verifyingOtp || otpVerified}>
                      {otpVerified ? "Verified" : verifyingOtp ? "Verifying..." : "Verify OTP"}
                    </button>
                  </div>
                ) : null}

                {otpVerified ? <p className={styles.otpVerified}>Email verified successfully.</p> : null}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label>Resource Category</label>
                <select className="select" value={form.resourceType} onChange={(e) => updateResourceType(e.target.value)}>
                  {RESOURCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>

              <div className={styles.field}>
                <label>Provider Type</label>
                <select className="select" value={form.donorType} onChange={(e) => updateForm("donorType", e.target.value)}>
                  {donorTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>

              {isBloodResource ? (
                <div className={styles.field} style={{ gridColumn: "span 2" }}>
                  <label>Blood Group</label>
                  <div className={styles.inputWrap}><HeartPulse size={18} />
                    <select className="select" value={form.bloodGroup} onChange={(e) => updateForm("bloodGroup", e.target.value)}>
                      {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className={styles.field} style={{ gridColumn: "span 2" }}>
                  <label>Resource / Service Details</label>
                  <textarea
                    className="textarea"
                    placeholder="Example: 12 oxygen cylinders available, refill support 24x7"
                    rows={3}
                    value={form.resourceNotes}
                    onChange={(e) => updateForm("resourceNotes", e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className={styles.fieldGrid}>
              <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                <label>{isBloodResource ? "Residential / Blood Bank Address" : "Facility / Service Address"}</label>
                <textarea className="textarea" placeholder="Full street address with landmark..." rows={3} value={form.address} onChange={(e) => updateForm("address", e.target.value)} />
              </div>
              <div className={styles.field}>
                <label>Pincode</label>
                <input className="input" placeholder="400001" value={form.pincode} onChange={(e) => updateForm("pincode", e.target.value)} />
              </div>
              <div className={styles.field}>
                 <label>Coordinates</label>
                 <button type="button" className="btn btnGhost" style={{ width: '100%', gap: 8 }} onClick={useCurrentLocation}>
                    <LocateFixed size={18} /> {form.latitude ? 'Location Captured' : 'Sync Live Location'}
                 </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.fieldGrid}>
               <div className={styles.field}>
                  <label>Live Availability</label>
                  <button type="button" className={`btn ${form.availableNow ? "btnSuccess" : "btnGhost"}`} style={{ width: '100%' }} onClick={() => updateForm("availableNow", !form.availableNow)}>
                     <Activity size={18} /> {form.availableNow ? "Visible to Needers" : "Hidden from search"}
                  </button>
               </div>
               <div className={styles.field}>
                  <label>Preferred Contact</label>
                  <select className="select" value={form.preferredContact} onChange={(e) => updateForm("preferredContact", e.target.value)}>
                    <option value="Call">Direct Phone Call</option>
                    <option value="WhatsApp">WhatsApp Message</option>
                  </select>
               </div>
               <div className={styles.field} style={{ gridColumn: "span 2" }}>
                  <label>Registration Expiry Date</label>
                  <input
                    className="input"
                    type="datetime-local"
                    min={minimumExpiry}
                    value={form.expiresAt}
                    onChange={(e) => updateForm("expiresAt", e.target.value)}
                  />
                  <p className={styles.helperText}>Your listing is automatically deleted after this date.</p>
               </div>
            </div>
          )}

          {step === 4 && (
            <div className={styles.confirmation}>
              <div className={styles.confIcon}><ShieldCheck size={48} color="var(--life-green)" /></div>
              <h3>{isBloodResource ? "Donor Registration Complete" : "Provider Registration Complete"}</h3>
              <p>Your profile is submitted for admin verification.</p>
              <p className={styles.helperText}>Listing expiry: {new Date(form.expiresAt).toLocaleString()}</p>
              {donorId && <div className={styles.refId}>Reference ID: {donorId}</div>}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button type="button" className="btn btnGhost" disabled={step === 0 || loading || step === 4} onClick={() => setStep(s => s - 1)}>Back</button>
          {step < 3 ? (
            <button type="button" className="btn btnPrimary" disabled={!canContinue || !signedIn} onClick={() => setStep(s => s + 1)}>Continue</button>
          ) : step === 3 ? (
            <button type="button" className="btn btnPrimary" disabled={!canContinue || loading || !signedIn} onClick={submitRegistration}>
              {loading ? "Processing..." : isBloodResource ? "Register as Donor" : "Register Provider"}
            </button>
          ) : (
            <button className="btn btnPrimary" onClick={() => window.location.href = "/dashboard"}>Go to Dashboard</button>
          )}
        </div>
      </div>
    </section>
  );
}

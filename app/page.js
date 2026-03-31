import Link from "next/link";
import {
  ArrowRight,
  HeartPulse,
  MapPinned,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.heroWrap}>
        <div className={styles.heroGrid} aria-hidden />
        <div className={styles.heroAuraA} aria-hidden />
        <div className={styles.heroAuraB} aria-hidden />

        <div className={`container ${styles.heroContent}`}>
          <p className={styles.kicker}>Emergency response network</p>

          <h1>
            One emergency network.
            <span>Faster lifesaving response.</span>
          </h1>

          <p className={styles.description}>
            Find blood donors, oxygen, ICU support, and critical emergency resources nearby, then connect in one tap.
          </p>

          <div className={styles.actions}>
            <Link href="/find-help" className={`btn ${styles.heroPrimary}`}>
              Find Help <ArrowRight size={16} />
            </Link>
            <Link href="/become-donor" className={`btn ${styles.heroSecondary}`}>
              Become a Donor
            </Link>
          </div>

          <div className={styles.heroMeta}>
            <p>
              <MapPinned size={14} /> Nearby-first matching
            </p>
            <p>
              <ShieldCheck size={14} /> Verified contacts
            </p>
            <p>
              <PhoneCall size={14} /> Instant call / WhatsApp
            </p>
          </div>
        </div>
      </section>

      <section className={`container ${styles.valueGrid}`}>
        <article className={styles.valueCard}>
          <Timer size={18} />
          <h3>Fast under pressure</h3>
          <p>Large controls and one-step actions.</p>
        </article>
        <article className={styles.valueCard}>
          <ShieldCheck size={18} />
          <h3>Trust-first network</h3>
          <p>Verified providers stay highlighted.</p>
        </article>
        <article className={styles.valueCard}>
          <Sparkles size={18} />
          <h3>Clean emergency UX</h3>
          <p>No clutter, clear next step always.</p>
        </article>
      </section>

      <section className={`container ${styles.stepsWrap}`}>
        <div className={styles.stepsHead}>
          <h2>How ResQNet works</h2>
          <p>Simple flow. Quick result.</p>
        </div>

        <div className={styles.stepsGrid}>
          <article>
            <span>1</span>
            <h3>Choose resource type</h3>
            <p>Select blood, oxygen, or medical support.</p>
          </article>
          <article>
            <span>2</span>
            <h3>See closest matches</h3>
            <p>Nearby donors appear first.</p>
          </article>
          <article>
            <span>3</span>
            <h3>Connect immediately</h3>
            <p>Call or message in one tap.</p>
          </article>
        </div>
      </section>

      <section className={`container ${styles.ctaBand}`}>
        <div className={styles.ctaContent}>
          <h2>Ready to support emergencies?</h2>
          <p>Join the responder network and stay available for urgent requests.</p>
        </div>
        <Link href="/become-donor" className={`btn ${styles.ctaBandBtn}`}>
          Become a Provider <HeartPulse size={16} />
        </Link>
      </section>
    </div>
  );
}

import Link from "next/link";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="siteFooter">
      <div className="container footerTop">
        <div className="footerBrandCol">
          <p className="footerBrand">ResQNet</p>
          <p className="footerLead">Emergency resource platform designed for speed, clarity, and trust.</p>
          <div className="footerChips">
            <span>24/7 Emergency Flow</span>
            <span>Location First</span>
            <span>Verified Providers</span>
          </div>
        </div>

        <div className="footerCols">
          <div className="footerCol">
            <h3>Platform</h3>
            <Link href="/">Home</Link>
            <Link href="/find-help">Find Help</Link>
            <Link href="/become-donor">Become a Donor</Link>
          </div>

          <div className="footerCol">
            <h3>Account</h3>
            <Link href="/signin">Sign In</Link>
            <Link href="/signup">Create Account</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
        </div>
      </div>

      <div className="container footerBottom">
        <p>© {year} ResQNet</p>
        <p>Emergency focused. Fast actions. Reliable results.</p>
      </div>
    </footer>
  );
}

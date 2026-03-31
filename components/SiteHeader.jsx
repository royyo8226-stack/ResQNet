"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SiteHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: "/find-help", label: "Find Help" },
    { href: "/become-donor", label: "Become a Donor" },
    ...(user ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!mounted) return;

        if (!response.ok) {
          setUser(null);
          return;
        }

        const data = await response.json();
        setUser(data.user || null);
      } catch {
        setUser(null);
      }
    }

    loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    closeMobileMenu();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="siteHeader">
      <div className="container navShell">
        <div className="navWrap">
          <Link href="/" className="brand" onClick={closeMobileMenu}>
            <span className="brandDot" />
            ResQNet
          </Link>

          <nav className="mainNav" aria-label="Main navigation">
            {navLinks.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="navRight">
            {user ? (
              <>
                <span className="userChip">{user.fullName}</span>
                <button type="button" className="navSignout" onClick={signOut}>Sign Out</button>
              </>
            ) : (
              <Link href="/signin" className="btn btnGhost">Sign In</Link>
            )}
            <ThemeToggle />
          </div>

          <div className="mobileActions">
            <ThemeToggle />
            <button
              type="button"
              className="menuButton"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <div
          id="mobile-navigation"
          className={`mobileNavPanel ${mobileOpen ? "mobileNavPanelOpen" : ""}`}
          aria-hidden={!mobileOpen}
        >
          {user ? <p className="mobileUser">Signed in as {user.fullName}</p> : null}

          <nav className="mobileNavLinks" aria-label="Mobile navigation">
            {navLinks.map((item) => (
              <Link key={`mobile-${item.href}`} href={item.href} onClick={closeMobileMenu}>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mobileNavFooter">
            {user ? (
              <button type="button" className="navSignout mobileSignout" onClick={signOut}>
                Sign Out
              </button>
            ) : (
              <Link href="/signin" className="btn btnGhost mobileSignin" onClick={closeMobileMenu}>
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {mobileOpen ? <button type="button" className="mobileBackdrop" onClick={closeMobileMenu} aria-label="Close menu" /> : null}
    </header>
  );
}

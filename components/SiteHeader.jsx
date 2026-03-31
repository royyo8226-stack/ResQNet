"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function SiteHeader() {
  const router = useRouter();
  const [user, setUser] = useState(null);

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

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="siteHeader">
      <div className="container navWrap">
        <Link href="/" className="brand">
          <span className="brandDot" />
          ResQNet
        </Link>

        <nav className="mainNav" aria-label="Main navigation">
          <Link href="/find-help">Find Help</Link>
          <Link href="/become-donor">Become a Donor</Link>
          {user ? <Link href="/dashboard">Dashboard</Link> : null}
          {user?.role === "admin" ? <Link href="/admin">Admin</Link> : null}
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
      </div>
    </header>
  );
}

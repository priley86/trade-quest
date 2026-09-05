import Link from "next/link";
import Image from "next/image";
import { logout } from "./auth/actions";
import type { Profile } from "../lib/auth";
export function AppShell({ children, active, profile, demo = false }: { children: React.ReactNode; active?: string; profile?: Profile; demo?: boolean }) {
  const base = demo ? "/demo" : "";
  return <div className="app-shell"><header className="site-header"><Link href={base || "/"} aria-label="TradeQuest home"><Image src="/nav-logo.svg" width={214} height={52} alt="TradeQuest Investor" priority /></Link>
    <nav aria-label="Main navigation"><Link className={active === "home" ? "active" : ""} href={base || "/"}><span>🏠</span><span className="nav-label">Home</span></Link><Link className={active === "trade" ? "active" : ""} href={`${base}/trade`}><span>🔄</span><span className="nav-label">Trade</span></Link><Link className={active === "leaders" ? "active" : ""} href={`${base}/leaderboard`}><span>🏆</span><span className="nav-label">Leaders</span></Link></nav>
    {profile ? <details className="profile-menu"><summary><span className="avatar">{profile.first_name[0]}</span><span className="profile-name">{profile.first_name}</span></summary><div className="profile-dropdown"><Link href="/profile">My profile</Link>{profile.role === "admin" && <Link href="/admin">Crew control center</Link>}<form action={logout}><button className="text-button">Log out</button></form></div></details> : <Link className="login-link" href="/login">Log in</Link>}
    </header><main>{demo && <div className="demo-banner"><b>Demo quest</b> · Sample players and pretend balances. <Link href="/invite/demo-quest">Preview signup</Link></div>}{children}</main></div>;
}
export function CategoryIcon({ type, large = false, sport }: { type: "stock" | "pokemon" | "sports"; large?: boolean; sport?: string }) {
  const data = { stock: ["📈", "Stocks"], pokemon: ["◉", "Pokémon cards"], sports: ["⚾", "Sports cards"] }[type];
  const icon = sport === "Basketball" ? "🏀" : sport === "Football" ? "🏈" : sport === "Hockey" ? "🏒" : data[0]; return <span className={`category-icon ${type} ${large ? "large" : ""}`} aria-label={data[1]}>{type === "pokemon" ? <Image className="pokeball-icon" src="/pokeball.svg" width={large ? 66 : 30} height={large ? 66 : 30} alt="" aria-hidden="true" /> : icon}</span>;
}
export function StatCard({ label, value, note, tone, icon }: { label: string; value: string; note: string; tone: string; icon: string }) {
  return <article className={`stat-card ${tone}`}><div><span className="eyebrow">{label}</span><strong>{value}</strong><small>{note}</small></div><span className="stat-icon">{icon}</span></article>;
}
export function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <section className="page-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{text}</p></section>;
}

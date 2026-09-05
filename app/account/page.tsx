import { redirect } from "next/navigation";
import { getViewer } from "../../lib/auth";
import { logout } from "../auth/actions";
export default async function AccountPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.profile) redirect("/");
  return <main className="auth-page"><section className="auth-wrap invite-card"><h1>You need a crew invitation</h1><p>Your login exists, but it hasn’t been enrolled in TradeQuest. Ask your crew leader for help. New players should register through their crew’s invitation link.</p><form action={logout}><button className="primary-button">Log out</button></form></section></main>;
}

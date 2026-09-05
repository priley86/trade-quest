"use client";
import { useActionState } from "react";
import { openPortfolio } from "./actions";
export function PortfolioSetup() {
  const [state, action, pending] = useActionState(openPortfolio, {});
  return <form action={action}><button className="primary-button" disabled={pending}>{pending ? "Getting your backpack ready…" : "Open my portfolio"}</button>{state.message && <p className="form-status" role="status">{state.message}</p>}</form>;
}

"use client";
import { useState } from "react";
import { sellHolding } from "./sell-action";
export function SellButton({ id }: { id: string }) { const [message, setMessage] = useState(""); return <><button className="text-button sell-button" onClick={async (event) => { event.preventDefault(); event.stopPropagation(); setMessage("Selling…"); setMessage(await sellHolding(id)); }}>Sell</button>{message && <small role="status">{message}</small>}</>; }

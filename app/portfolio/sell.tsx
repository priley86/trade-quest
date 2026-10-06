"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sellHolding } from "./sell-action";
export function SellButton({ id }: { id: string }) {
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <>
      <button
        className="text-button sell-button"
        onClick={async (event) => {
          event.preventDefault();
          event.stopPropagation();
          setMessage("Selling…");
          setMessage(await sellHolding(id));
          router.refresh();
        }}
      >
        Sell
      </button>
      {message && <small role="status">{message}</small>}
    </>
  );
}

"use client";
export function BackButton({label}:{label:string}){return <button className="text-link" onClick={()=>history.back()}>{label}</button>}

"use client";
export function BackButton({label}:{label:string}){return <button className="text-link back-button" onClick={()=>history.back()}>{label}</button>}

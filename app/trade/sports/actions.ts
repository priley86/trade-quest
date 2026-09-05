"use server";
import { requirePlayer } from "../../../lib/auth"; import { buySports } from "../../../lib/dolt";
export async function buySportsCard(_state:unknown,p:{id:string;name:string;url:string;imageUrl:string;marketPriceCents:number;segmentName?:string}){try{const {profile}=await requirePlayer();await buySports(profile.public_player_id,p);return{message:"Card added to your collection!"}}catch(e){return{message:e instanceof Error?e.message:"The purchase could not be completed."}}}

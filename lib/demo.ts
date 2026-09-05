import type { Portfolio } from "./dolt";
export const demoPlayers: Portfolio[] = [
  { player_id: "maya", display_name: "Maya", crew_public_id: "PINE-742", cash_cents: 89180,
    holdings: [{ id: "nintendo", asset_type: "stock", display_name: "Nintendo", quantity: 3, cost_basis_cents: 16600, current_value_cents: 19620 }, { id: "charizard", asset_type: "pokemon_card", display_name: "Charizard ex", quantity: 1, cost_basis_cents: 5000, current_value_cents: 5480 }], snapshots: [] },
  { player_id: "jamie", display_name: "Jamie", crew_public_id: "PINE-742", cash_cents: 55400,
    holdings: [{ id: "apple", asset_type: "stock", display_name: "Apple", quantity: 2, cost_basis_cents: 42000, current_value_cents: 48236 }, { id: "pikachu", asset_type: "pokemon_card", display_name: "Pikachu V", quantity: 1, cost_basis_cents: 3000, current_value_cents: 3120 }, { id: "judge", asset_type: "sports_card", display_name: "Aaron Judge", quantity: 1, cost_basis_cents: 1915, current_value_cents: 1875 }],
    snapshots: [100000,101200,102000,101800,104000,105300,108631].map((value, i) => ({ snapshot_date: `2026-09-0${i + 1}`, total_value_cents: value })) },
  { player_id: "leo", display_name: "Leo", crew_public_id: "PINE-742", cash_cents: 71000,
    holdings: [{ id: "lego", asset_type: "sports_card", display_name: "Shohei Ohtani", quantity: 1, cost_basis_cents: 28000, current_value_cents: 39542 }], snapshots: [] },
];

export interface PlayerForm {
  player_name: string;
  handicap: number;
  game_1: number | null;
  game_2: number | null;
  game_3: number | null;
  game_4: number | null;
  game_5: number | null;
  game_6: number | null;
  game_7: number | null;
  game_8: number | null;
  game_9: number | null;
  game_10: number | null;
  game_11: number | null;
  game_12: number | null;
  game_13: number | null;
  game_14: number | null;
  game_15: number | null;
  game_16: number | null;
  game_17: number | null;
  game_18: number | null;
  game_19: number | null;
  game_20: number | null;
}

export const INITIAL_PLAYER_FORM: PlayerForm = {
  player_name: "",
  handicap: 0,
  game_1: null,
  game_2: null,
  game_3: null,
  game_4: null,
  game_5: null,
  game_6: null,
  game_7: null,
  game_8: null,
  game_9: null,
  game_10: null,
  game_11: null,
  game_12: null,
  game_13: null,
  game_14: null,
  game_15: null,
  game_16: null,
  game_17: null,
  game_18: null,
  game_19: null,
  game_20: null,
};

export const GAME_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-yellow-500",
  "bg-pink-400",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-lime-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-blue-600",
  "bg-green-600",
  "bg-purple-600",
];
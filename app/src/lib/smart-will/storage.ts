const KEY = "smartwill:wills";

export interface SavedWill {
  address: string;
  label: string;
  createdAt: number;
}

export function listWills(): SavedWill[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as SavedWill[];
  } catch {
    return [];
  }
}

export function saveWill(w: SavedWill) {
  const all = listWills().filter((x) => x.address.toLowerCase() !== w.address.toLowerCase());
  all.unshift(w);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 10)));
}

export function removeWill(address: string) {
  const all = listWills().filter((x) => x.address.toLowerCase() !== address.toLowerCase());
  localStorage.setItem(KEY, JSON.stringify(all));
}

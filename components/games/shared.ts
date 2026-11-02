export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** The visitor's own date, as YYYY-MM-DD: the day whose puzzle they get. */
export const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const read = <T,>(key: string, fallback: T): T => {
  try {
    const text = localStorage.getItem(key);
    return text ? (JSON.parse(text) as T) : fallback;
  } catch {
    return fallback; // storage blocked: the game still works, it just does not remember
  }
};

export const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // not remembered
  }
};

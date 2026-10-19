import { getApp, getApps, initializeApp } from "@firebase/app";
import { get, getDatabase, onValue, ref, set } from "@firebase/database";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured = Object.values(config).every(Boolean);
const firebaseApp = isConfigured
  ? (getApps().length ? getApp() : initializeApp(config))
  : null;
const database = firebaseApp ? getDatabase(firebaseApp) : null;
const localKey = "robotron-tournament-v1";

export const storageMode = isConfigured ? "firebase" : "local";
export const databaseConfigured = Boolean(database);

export async function verifyAdminCode(code) {
  if (!database) {
    throw new Error("Connect the Firebase Realtime Database before signing in.");
  }
  const snapshot = await get(ref(database, "Security"));
  const savedCode = snapshot.val();
  if (typeof savedCode !== "string" || !savedCode) {
    throw new Error('Admin code is not set. Add a string value named "Security" at the database root.');
  }
  return code === savedCode;
}

export function subscribeToTournament(onData, onError) {
  if (database) {
    return onValue(
      ref(database, "tournament"),
      (snapshot) => onData(snapshot.val()),
      onError,
    );
  }

  const readLocal = () => {
    try {
      const saved = window.localStorage.getItem(localKey);
      onData(saved ? JSON.parse(saved) : null);
    } catch (error) {
      onError(error);
    }
  };

  readLocal();
  window.addEventListener("storage", readLocal);
  return () => window.removeEventListener("storage", readLocal);
}

export async function saveTournament(tournament) {
  if (database) {
    // Strip out any undefined or temporary fields that Firebase rejects
    const sanitizedTournament = JSON.parse(JSON.stringify(tournament));
    await set(ref(database, "tournament"), sanitizedTournament);
    return;
  }

  window.localStorage.setItem(localKey, JSON.stringify(tournament));
  window.dispatchEvent(new StorageEvent("storage", { key: localKey }));
}

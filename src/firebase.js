import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, get } from "firebase/database";

// Firebase config — thay bằng config của Nguyên từ Firebase Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY || "AIzaSyC30eblb4qe1yOUSsn1giLf0XOXxvGupuQ",
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN || "wowart-portal.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FB_DB_URL || "https://wowart-portal-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FB_PROJECT_ID || "wowart-portal",
  storageBucket: import.meta.env.VITE_FB_STORAGE || "wowart-portal.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FB_SENDER_ID || "734495607872",
  appId: import.meta.env.VITE_FB_APP_ID || "1:734495607872:web:2de4f3b840440a6692e3a5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dataRef = ref(db, "wowart/data");

// Read data once
export const loadData = async () => {
  const snapshot = await get(dataRef);
  return snapshot.exists() ? snapshot.val() : null;
};

// Write data
export const saveData = async (data) => {
  await set(dataRef, data);
};

// Real-time listener
export const onDataChange = (callback) => {
  return onValue(dataRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    }
  });
};

export { db, dataRef };

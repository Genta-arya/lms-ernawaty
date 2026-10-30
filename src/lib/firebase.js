import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getDatabase } from "firebase/database"

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "lsm-ernawaty"
const rtdbUrl =
  import.meta.env.VITE_FIREBASE_DATABASE_URL ||
  `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: rtdbUrl,
}

// Inisialisasi Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

export const auth = getAuth(app)
// Pastikan sesi login disimpan permanen di Local Storage browser
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Gagal set persistence local:", err)
})

export const db = getFirestore(app)

let rtdbInstance = null
try {
  rtdbInstance = getDatabase(app)
} catch (err) {
  console.warn("Realtime Database belum aktif di Firebase Console:", err.message)
}

export const rtdb = rtdbInstance
export const googleProvider = new GoogleAuthProvider()

googleProvider.setCustomParameters({
  prompt: "select_account",
})


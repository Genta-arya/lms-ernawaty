import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function getProgresMurid(uid) {
  const q = query(collection(db, "progres"), where("uid", "==", uid))
  const snap = await getDocs(q)
  const map = {}
  snap.forEach((d) => {
    const data = d.data()
    map[data.materiId] = data.selesai
  })
  return map
}

export async function markMateriSelesai(uid, nisn, materiId, status = true) {
  const docId = `${uid}_${materiId}`
  const ref = doc(db, "progres", docId)
  return await setDoc(
    ref,
    {
      uid,
      nisn,
      materiId,
      selesai: status,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function getAllProgres() {
  const snap = await getDocs(collection(db, "progres"))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}


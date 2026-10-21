import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { normalizeUsageHistory } from './bookmark-data'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.projectId && firebaseConfig.apiKey && firebaseConfig.authDomain
)

export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
export const googleProvider = app ? new GoogleAuthProvider() : null

if (googleProvider) {
  googleProvider.setCustomParameters({ prompt: 'select_account' })
}

type FirebaseBookmark = Record<string, any>

export function onAuthChange(callback: (user: any) => void) {
  if (!auth) {
    callback(null)
    return () => {}
  }

  return onAuthStateChanged(auth, callback)
}

export async function signInWithGoogle() {
  if (!auth || !googleProvider) {
    throw new Error('Firebase is not configured. Add VITE_FIREBASE_* values to your environment.')
  }

  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

export async function signOutUser() {
  if (!auth) return
  await signOut(auth)
}

function normalizeBookmarkForClient(bookmark: FirebaseBookmark = {}) {
  return {
    ...bookmark,
    type: bookmark.type || 'bookmark',
    id: bookmark.id || bookmark.url || '',
    tags: Array.isArray(bookmark.tags) ? bookmark.tags : [],
    usageHistory: normalizeUsageHistory(bookmark.usageHistory),
    createdAtMs: typeof bookmark.createdAtMs === 'number'
      ? bookmark.createdAtMs
      : typeof bookmark.createdAt?.toMillis === 'function'
        ? bookmark.createdAt.toMillis()
        : 0,
    background: bookmark.background || '#ecfeff',
    borderColor: bookmark.borderColor || '#06b6d4',
    foregroundColor: bookmark.foregroundColor || '#111827',
    source: 'firebase',
    html: typeof bookmark.html === 'string' ? bookmark.html : ''
  }
}

export async function fetchBookmarksForUser(uid: string) {
  if (!uid || !db) return []

  const userBookmarksRef = collection(db, 'users', uid, 'bookmarks')
  const snapshot = await getDocs(query(userBookmarksRef))
  return snapshot.docs.map((docSnapshot) => normalizeBookmarkForClient({
    ...docSnapshot.data(),
    id: docSnapshot.id,
    
  }))
}

export async function saveBookmarkForUser(uid: string, bookmark: FirebaseBookmark) {
  if (!uid || !db) return null

  const safeBookmark = {
    ...bookmark,
    type: bookmark.type || 'bookmark',
    usageHistory: normalizeUsageHistory(bookmark.usageHistory),
    createdAtMs: typeof bookmark.createdAtMs === 'number' ? bookmark.createdAtMs : Date.now(),
    tags: Array.isArray(bookmark.tags) ? bookmark.tags : [],
    background: bookmark.background || '#ecfeff',
    borderColor: bookmark.borderColor || '#06b6d4',
    foregroundColor: bookmark.foregroundColor || '#111827',
    createdAt: serverTimestamp(),
    html: typeof bookmark.html === 'string' ? bookmark.html : ''
  }

  const userBookmarksRef = collection(db, 'users', uid, 'bookmarks')
  const docRef = await addDoc(userBookmarksRef, safeBookmark)
  return { id: docRef.id, ...safeBookmark }
}

export async function updateBookmarkForUser(uid: string, bookmarkId: string, bookmark: FirebaseBookmark) {
  if (!uid || !bookmarkId || !db) return null

  const { needsFirebaseSync, ...bookmarkData } = bookmark
  const safeBookmark = {
    ...bookmarkData,
    type: bookmarkData.type || 'bookmark',
    usageHistory: normalizeUsageHistory(bookmarkData.usageHistory),
    createdAtMs: typeof bookmarkData.createdAtMs === 'number' ? bookmarkData.createdAtMs : Date.now(),
    tags: Array.isArray(bookmarkData.tags) ? bookmarkData.tags : [],
    background: bookmarkData.background || '#ecfeff',
    borderColor: bookmarkData.borderColor || '#06b6d4',
    foregroundColor: bookmarkData.foregroundColor || '#111827',
    updatedAt: serverTimestamp(),
    html: typeof bookmarkData.html === 'string' ? bookmarkData.html : ''
  }

  const bookmarkRef = doc(db, 'users', uid, 'bookmarks', bookmarkId)
  await updateDoc(bookmarkRef, safeBookmark)
  return { id: bookmarkId, ...safeBookmark }
}

export async function deleteBookmarkForUser(uid: string, bookmarkId: string) {
  if (!uid || !bookmarkId || !db) return
  await deleteDoc(doc(db, 'users', uid, 'bookmarks', bookmarkId))
}

export const mockFirebase = () => {
  const mockCollection = () => ({})
  const mockDoc = (..._args: any[]) => ({})
  const mockUser = { uid: 'demo-user', email: 'demo@example.com', displayName: 'Demo User' }

  return {
    app: { name: 'demo-app' },
    auth: {
      currentUser: mockUser,
      onAuthStateChanged: () => () => {},
      signOut: async () => {}
    },
    db: {
      collection: mockCollection,
      doc: mockDoc,
      getDocs: async () => ({ docs: [] }),
      addDoc: async () => ({ id: 'doc-1' }),
      updateDoc: async () => {},
      deleteDoc: async () => {},
      serverTimestamp: () => new Date()
    },
    googleProvider: {},
    user: mockUser
  }
}

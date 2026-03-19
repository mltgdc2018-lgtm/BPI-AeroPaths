"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { AuthService, AuthError } from "@/lib/firebase/services";
import { User } from "@/types/user";

// ------------------------------------------------------------------
// 🔧 Types
// ------------------------------------------------------------------

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: AuthError | null;
  // Auth Actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: AuthError }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: AuthError }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: AuthError }>;
  signInWithGoogleRedirect: () => Promise<{ success: boolean; error?: AuthError }>;
  signOut: () => Promise<void>;
  updateProfileImage: (file: File) => Promise<{ success: boolean; photoURL?: string; error?: AuthError }>;
  updateUserProfileData: (data: { displayName?: string; department?: string }) => Promise<{ success: boolean; error?: AuthError }>;
  updateUser: (uid: string, data: Partial<User>) => Promise<{ success: boolean; error?: AuthError }>;
  deleteUser: (uid: string) => Promise<{ success: boolean; error?: AuthError }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: AuthError }>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ------------------------------------------------------------------
// 🔥 Auth Provider
// ------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  const toFallbackPendingUser = (fbUser: FirebaseUser): User => ({
    uid: fbUser.uid,
    email: fbUser.email || "",
    displayName: fbUser.displayName || "",
    role: "staff",
    department: "Unassigned",
    photoURL: fbUser.photoURL || undefined,
    createdAt: new Date(),
    lastLogin: new Date(),
    status: "pending",
  });

  // Listen for auth state changes
  useEffect(() => {
    let unsubscribeDoc: Unsubscribe | undefined;

    // 1. Handle Redirect Result (If returning from Google Redirect)
    const handleRedirect = async () => {
      try {
        const { result, error: redirectError } = await AuthService.getRedirectResult();
        if (redirectError) {
          setError(redirectError);
        } else if (result?.user) {
          // Document will be handled by the listener below
          console.log("Redirect Sign-in Success:", result.user.email);
        }
      } catch (err) {
        console.error("Redirect handling top-level error:", err);
      }
    };
    handleRedirect();

    // 2. Main Auth Listener
    const unsubscribeAuth = AuthService.onAuthStateChange((fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        setLoading(true);

        void (async () => {
          // Ensure Firestore document exists (especially for first login / Google login).
          try {
            await AuthService.checkAndCreateUserDoc(fbUser);
          } catch (err) {
            console.error("Failed to ensure user doc exists:", err);
            setError({
              code: "firestore/user-doc-init-failed",
              message: "Signed in, but user profile could not be created in Firestore.",
            });
          }

          if (unsubscribeDoc) {
            unsubscribeDoc();
            unsubscribeDoc = undefined;
          }

          // Get additional user data from Firestore with real-time updates.
          const userDocRef = doc(db, "users", fbUser.uid);
          unsubscribeDoc = onSnapshot(
            userDocRef,
            (docSnap) => {
              if (docSnap.exists()) {
                const userData = docSnap.data();
                setUser({
                  uid: fbUser.uid,
                  email: fbUser.email || "",
                  displayName: userData.displayName || fbUser.displayName || "",
                  role: userData.role || "staff",
                  department: userData.department || "",
                  photoURL: userData.photoURL || fbUser.photoURL || undefined,
                  createdAt: userData.createdAt?.toDate() || new Date(),
                  lastLogin: userData.lastLogin?.toDate() || new Date(),
                  status: userData.status || "pending",
                });
              } else {
                setUser(toFallbackPendingUser(fbUser));
              }
              setLoading(false);
            },
            (snapshotError) => {
              console.error("Failed to subscribe user profile:", snapshotError);
              setError({
                code: "firestore/user-doc-read-failed",
                message: "Signed in, but user profile could not be read from Firestore.",
              });
              setUser(toFallbackPendingUser(fbUser));
              setLoading(false);
            }
          );
        })();
      } else {
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = undefined;
        }
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
      }
      unsubscribeAuth();
    };
  }, []);

  // ✅ Sign In (Email/Password)
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    const result = await AuthService.signIn(email, password);
    
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return { success: false, error: result.error };
    }
    
    return { success: true };
  };

  // ✅ Sign Up (Email/Password)
  const signUp = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    setError(null);
    
    const result = await AuthService.signUp(email, password, displayName);
    
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return { success: false, error: result.error };
    }
    
    return { success: true };
  };

  // ✅ Sign In with Google
  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    
    // Popup approach
    const result = await AuthService.signInWithGoogle();
    
    if (result.error) {
      if (result.error.code === 'auth/popup-closed-by-user' || result.error.code === 'auth/popup-blocked') {
        // Try redirect fallback
        console.warn("Popup blocked or closed, falling back to redirect...");
        return await signInWithGoogleRedirect();
      }
      setError(result.error);
      setLoading(false);
      return { success: false, error: result.error };
    }
    
    return { success: true };
  };

  // ✅ Sign In with Google (Redirect Fallback)
  const signInWithGoogleRedirect = async () => {
    setLoading(true);
    setError(null);
    const result = await AuthService.signInWithGoogleRedirect();
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return { success: false, error: result.error };
    }
    return { success: true };
  };

  // ✅ Sign Out
  const signOut = async () => {
    setError(null);
    const result = await AuthService.signOut();
    
    if (result.error) {
      setError(result.error);
    }
  };

  // ✅ Reset Password
  const resetPassword = async (email: string) => {
    setError(null);
    
    const result = await AuthService.resetPassword(email);
    
    if (result.error) {
      setError(result.error);
      return { success: false, error: result.error };
    }
    
    return { success: true };
  };

  // ✅ Update Profile Image
  const updateProfileImage = async (file: File) => {
    setError(null);
    const result = await AuthService.updateProfileImage(file);
    if (!result.success) {
      setError(result.error || { code: 'unknown', message: 'Failed to update image' });
    }
    return result;
  };

  // ✅ Update User Profile Data
  const updateUserProfileData = async (data: { displayName?: string; department?: string }) => {
    setError(null);
    const result = await AuthService.updateUserProfileData(data);
    if (!result.success) {
      setError(result.error || { code: 'unknown', message: 'Failed to update profile' });
    }
    return result;
  };

  // ✅ Update Other User (Admin Action)
  const updateUser = async (uid: string, data: Partial<User>) => {
    setError(null);
    const result = await AuthService.updateUser(uid, data);
    if (!result.success) {
      setError(result.error || { code: 'unknown', message: 'Failed to update user' });
    }
    return result;
  };

  // ✅ Delete User (Admin Action)
  const deleteUser = async (uid: string) => {
    setError(null);
    const result = await AuthService.deleteUser(uid);
    if (!result.success) {
      setError(result.error || { code: 'unknown', message: 'Failed to delete user' });
    }
    return result;
  };

  // ✅ Clear Error
  const clearError = () => setError(null);

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        firebaseUser,
        loading, 
        error,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithGoogleRedirect,
        signOut,
        resetPassword,
        updateProfileImage,
        updateUserProfileData,
        updateUser,
        deleteUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ------------------------------------------------------------------
// 🪝 useAuth Hook
// ------------------------------------------------------------------

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  updateProfile, 
  onAuthStateChanged, 
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase/config';

// Custom Error Type
export interface AuthError {
  code: string;
  message: string;
}

export const AuthService = {
  
  // ✅ 1. Sign In (Email/Password)
  signIn: async (email: string, pass: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, pass);
      // Ensure Firestore user doc exists for old/imported users.
      await AuthService.checkAndCreateUserDoc(result.user);
      return { user: result.user, error: null };
    } catch (error) {
      return { user: null, error: mapAuthError(error) };
    }
  },

  // ✅ 2. Sign Up (Email/Password) -> Auto create Firestore Doc
  signUp: async (email: string, pass: string, name: string) => {
    try {
      // 1. Create Auth User
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      
      // 2. Update Display Name
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name });
      }

      // 3. Create User Document in Firestore
      await createUserDocument(result.user, name);

      return { user: result.user, error: null };
    } catch (error) {
      return { user: null, error: mapAuthError(error) };
    }
  },

  // ✅ 3. Sign In with Google (New Feature)
  signInWithGoogle: async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection prompt (optional)
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      
      // 4. Check & Create Firestore Doc if not exists
      // สำคัญ: ต้องเช็คทุกครั้งเพราะ Google Login ข้ามขั้นตอน Register ปกติ
      await AuthService.checkAndCreateUserDoc(result.user);

      return { user: result.user, error: null };
    } catch (error) {
      return { user: null, error: mapAuthError(error) };
    }
  },

  // ✅ 3.1 Sign In with Google Redirect (Fallback for popup issues)
  signInWithGoogleRedirect: async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // Note: This won't return a result immediately. 
      // The result must be handled via getRedirectResult in AuthContext.
      await signInWithRedirect(auth, provider);
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: mapAuthError(error) };
    }
  },

  // ✅ 4. Sign Out
  signOut: async () => {
    try {
      await firebaseSignOut(auth);
      return { error: null };
    } catch (error) {
      return { error: mapAuthError(error) };
    }
  },

  // ✅ 5. Reset Password
  resetPassword: async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: mapAuthError(error) };
    }
  },

  // ✅ 6. Get Current User (Synchronous check from memory)
  getCurrentUser: () => {
    return auth.currentUser;
  },

  // ✅ 7. Auth State Listener (For React Context/Hooks)
  onAuthStateChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  // ✅ 8. Google Redirect Result Handler
  getRedirectResult: async () => {
    try {
      const result = await getRedirectResult(auth);
      return { result, error: null };
    } catch (error) {
      return { result: null, error: mapAuthError(error) };
    }
  },

  // ✅ 9. ตรวจสอบและสร้าง User Doc ถ้ายังไม่มี (สำหรับ Google Login)
  checkAndCreateUserDoc: async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      // ถ้าเป็น user ใหม่ที่เพิ่ง login ผ่าน Google ครั้งแรก
      await createUserDocument(user);
    } else {
      // ถ้ามีอยู่แล้ว ให้อัพเดทเวลา login และรูปโปรไฟล์ล่าสุดจาก Google
      await setDoc(userRef, { 
        lastLogin: serverTimestamp(),
        photoURL: user.photoURL || docSnap.data().photoURL || null,
        displayName: docSnap.data().displayName || user.displayName || 'No Name'
      }, { merge: true });
    }
  },

  // ✅ 10. เปลี่ยนรูปโปรไฟล์
  updateProfileImage: async (file: File) => {
    try {
      if (!auth.currentUser) throw new Error("No user authenticated");
      const uid = auth.currentUser.uid;
      
      // 1. Upload to Storage
      const storageRef = ref(storage, `profile_images/${uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // 2. Update Firebase Auth Profile
      await updateProfile(auth.currentUser, { photoURL: downloadURL });
      
      // 3. Update Firestore
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { photoURL: downloadURL });
      
      return { success: true, photoURL: downloadURL };
    } catch (error) {
      console.error("Update profile image error:", error);
      return { success: false, error: mapAuthError(error) };
    }
  },

  // ✅ 11. อัพเดทข้อมูลผู้ใช้ (ชื่อ, แผนก)
  updateUserProfileData: async (data: { displayName?: string; department?: string }) => {
    try {
      if (!auth.currentUser) throw new Error("No user authenticated");
      const uid = auth.currentUser.uid;
      const userRef = doc(db, 'users', uid);
      
      // 1. Update Firestore
      await updateDoc(userRef, {
        ...data,
        lastUpdated: serverTimestamp()
      });
      
      // 2. Update Firebase Auth Display Name if provided
      if (data.displayName) {
        await updateProfile(auth.currentUser, { displayName: data.displayName });
      }
      
      return { success: true };
    } catch (error) {
      console.error("Update user data error:", error);
      return { success: false, error: mapAuthError(error) };
    }
  },

  // ✅ 12. อัพเดทข้อมูลผู้ใช้อื่น (สำหรับ Admin)
  updateUser: async (uid: string, data: Partial<User>) => {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        ...data,
        lastUpdated: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error("Update user error:", error);
      return { success: false, error: mapAuthError(error) };
    }
  },

  // ✅ 13. ลบผู้ใช้ (สำหรับ Admin)
  deleteUser: async (uid: string) => {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      const userRef = doc(db, 'users', uid);
      await deleteDoc(userRef);
      return { success: true };
    } catch (error) {
      console.error("Delete user error:", error);
      return { success: false, error: mapAuthError(error) };
    }
  }
};

// ------------------------------------------------------------------
// 🔧 Private Helpers (ฟังก์ชันช่วยทำงานเบื้องหลัง)
// ------------------------------------------------------------------

// สร้างข้อมูล User ลง Firestore (สำหรับ Email Signup)
async function createUserDocument(user: User, displayName?: string) {
  const userRef = doc(db, 'users', user.uid);
  
  await setDoc(userRef, {
    uid: user.uid,
    email: user.email,
    displayName: displayName || user.displayName || 'No Name',
    role: 'staff', // Default role
    department: 'Unassigned', // รอ Admin มาแก้
    photoURL: user.photoURL || null,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    status: 'pending'
  });
}

// แปลง Error Code เป็นภาษาอังกฤษ (English)
function mapAuthError(error: unknown): AuthError {
  const firebaseError = error as { code?: string; message?: string };
  console.error("Auth Debug - Code:", firebaseError.code);
  console.error("Auth Debug - Message:", firebaseError.message);
  
  let message = "เกิดข้อผิดพลาดที่ไม่คาดคิด โปรดลองใหม่อีกครั้ง";
  
  const code = firebaseError.code;
  switch (code) {
    case 'auth/invalid-email':
      message = "รูปแบบอีเมลไม่ถูกต้อง";
      break;
    case 'auth/user-not-found':
      message = "ไม่พบผู้ใช้งานนี้ในระบบ";
      break;
    case 'auth/wrong-password':
      message = "รหัสผ่านไม่ถูกต้อง";
      break;
    case 'auth/invalid-credential':
      message = "อีเมลหรือรหัสผ่านไม่ถูกต้อง โปรดตรวจสอบอีกครั้ง";
      break;
    case 'auth/email-already-in-use':
      message = "อีเมลนี้ถูกใช้งานไปแล้ว";
      break;
    case 'auth/weak-password':
      message = "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร";
      break;
    case 'auth/popup-closed-by-user':
      message = "การเข้าสู่ระบบถูกยกเลิกโดยผู้ใช้งาน";
      break;
    case 'auth/popup-blocked':
      message = "ป๊อปอัพเข้าสู่ระบบถูกบล็อกโดยเบราว์เซอร์ของคุณ โปรดอนุญาตป๊อปอัพสำหรับเว็บไซต์นี้";
      break;
    case 'auth/operation-not-allowed':
      message = "การเข้าสู่ระบบด้วย Google ยังไม่ถูกเปิดใช้งานในโปรเจกต์นี้";
      break;
    case 'auth/unauthorized-domain':
      message = "โดเมนนี้ไม่ได้รับอนุญาตให้เข้าสู่ระบบด้วย Google";
      break;
    case 'auth/too-many-requests':
      message = "มีการพยายามเข้าสู่ระบบล้มเหลวมากเกินไป โปรดลองใหม่ในภายหลัง";
      break;
    case 'auth/network-request-failed':
      message = "ข้อผิดพลาดของเครือข่าย โปรดตรวจสอบการเชื่อมต่อของคุณ";
      break;
  }
  
  return { code: code || 'unknown', message };
}

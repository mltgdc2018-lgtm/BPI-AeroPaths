"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  User as UserIcon, 
  Camera, 
  Shield, 
  Building2, 
  Calendar, 
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Users
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { User } from "@/types/user";
import Cropper, { Area } from "react-easy-crop";
import getCroppedImg from "@/lib/utils/cropImage";

type Tab = "account" | "management" | "security";

export default function ProfilePage() {
  const { user, loading, updateProfileImage, updateUserProfileData, updateUser, deleteUser, resetPassword } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Form states
  const [displayName, setDisplayName] = useState("");
  const [department, setDepartment] = useState("");
  
  // Admin state
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserForAction, setSelectedUserForAction] = useState<User | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Cropping states
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setDepartment(user.department || "");
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === "management" && user?.role === "admin") {
      fetchUsers();
    }
  }, [activeTab, user]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedUsers = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        lastLogin: doc.data().lastLogin?.toDate(),
      })) as User[];
      setAllUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file." });
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      setMessage({ type: "error", text: "Image size must be less than 2MB." });
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setIsCropModalOpen(true);
    };
  };

  const onCropComplete = (_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  };

  const handleCropSave = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    setIsUploading(true);
    setIsCropModalOpen(false);
    setMessage(null);

    try {
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Failed to crop image");

      const file = new File([croppedBlob], "profile-picture.jpg", { type: "image/jpeg" });
      const result = await updateProfileImage(file);

      if (result.success) {
        setMessage({ type: "success", text: "Profile image updated successfully!" });
      } else {
        setMessage({ type: "error", text: result.error?.message || "Failed to upload image." });
      }
    } catch (error) {
      console.error("Crop/Upload error:", error);
      setMessage({ type: "error", text: "Something went wrong during image processing." });
    } finally {
      setIsUploading(false);
      setImageToCrop(null);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setMessage(null);
    
    const result = await updateUserProfileData({ displayName, department });
    
    if (result.success) {
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } else {
      setMessage({ type: "error", text: result.error?.message || "Failed to update profile." });
    }
    
    setIsSaving(false);
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    
    setMessage(null);
    const result = await resetPassword(user.email);
    
    if (result.success) {
      setMessage({ type: "success", text: "Password reset link sent to your email!" });
    } else {
      setMessage({ type: "error", text: result.error?.message || "Failed to send reset link." });
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7E5C4A]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 bg-[#f6edde] relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className="absolute top-40 -left-20 w-80 h-80 bg-[#D4AA7D]/15 rounded-full blur-3xl animate-pulse-soft" />
      <div className="absolute bottom-20 -right-20 w-96 h-96 bg-[#EFD09E]/20 rounded-full blur-3xl animate-float" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#D4AA7D]/10 rounded-full blur-3xl" />

      <div className="container-custom max-w-5xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Sidebar / Info Card */}
          <div className="md:col-span-4">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-2xl p-6 bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.3),-8px_-8px_18px_rgba(255,255,255,0.92)]"
            >
              <div className="flex flex-col items-center text-center">
                {/* Profile Picture */}
                <motion.div 
                  className="relative group cursor-pointer" 
                  onClick={handleImageClick}
                  whileHover={{ scale: 1.05, y: -5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <motion.div 
                    className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#9ACD32]/60 shadow-[4px_4px_12px_rgba(166,180,200,0.3),-4px_-4px_12px_rgba(255,255,255,0.9)] relative bg-[#272727]"
                    whileHover={{ 
                      boxShadow: "0 0 35px rgba(154, 205, 50, 0.3)",
                      borderColor: "rgba(154, 205, 50, 0.95)"
                    }}
                  >
                    {user.photoURL ? (
                      <Image 
                        src={user.photoURL} 
                        alt={user.displayName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserIcon className="w-16 h-16 text-[#9ACD32]" />
                      </div>
                    )}
                    
                    {/* Upload Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                    
                    {/* Loading Overlay */}
                    {isUploading && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-sm">
                        <Loader2 className="w-8 h-8 text-[#7E5C4A] animate-spin" />
                      </div>
                    )}
                  </motion.div>
                  
                  {/* Floating badge */}
                  <motion.div 
                    whileHover={{ scale: 1.2, rotate: 15 }}
                    className="absolute -bottom-1 -right-1 p-2 bg-[#272727] rounded-full text-white shadow-xl border-2 border-[#EFD09E]/30"
                  >
                    <Camera className="w-4 h-4 text-[#9ACD32]" />
                  </motion.div>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </motion.div>

                <h1 className="mt-4 text-xl font-black text-[#272727] uppercase tracking-tighter italic">
                  {user.displayName}
                </h1>
                <p className="text-[#7E5C4A] text-sm font-bold tracking-tight opacity-70">{user.email}</p>
                
                <div className="mt-4 px-4 py-1.5 bg-[#272727] text-[#EFD09E] rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 border border-[#EFD09E]/20 shadow-lg">
                  <Shield className="w-3 h-3 text-[#9ACD32]" />
                  {user.role}
                </div>
              </div>

              <div className="mt-8 space-y-4 pt-6 border-t border-[#D4AA7D]/20">
                <div className="flex items-center gap-3 text-sm text-[#272727]">
                  <div className="w-8 h-8 rounded-lg bg-[#EEF2F6] flex items-center justify-center text-[#7E5C4A] border border-white/80 shadow-[3px_3px_8px_rgba(166,180,200,0.2),-3px_-3px_8px_rgba(255,255,255,0.88)]">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="font-bold uppercase tracking-tight text-xs">{user.department}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#7E5C4A]">
                  <div className="w-8 h-8 rounded-lg bg-[#EEF2F6] flex items-center justify-center text-[#7E5C4A] border border-white/80 shadow-[3px_3px_8px_rgba(166,180,200,0.2),-3px_-3px_8px_rgba(255,255,255,0.88)]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs uppercase tracking-tight opacity-60">Joined {user.createdAt?.toLocaleDateString()}</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-[#EEF2F6]/95 border border-white/80 shadow-[8px_8px_18px_rgba(166,180,200,0.3),-8px_-8px_18px_rgba(255,255,255,0.92)] overflow-hidden"
            >
              {/* Tabs Header */}
              <div className="flex px-4 bg-[#EEF2F6]/60 border-b border-[#D4AA7D]/15">
                <button
                  onClick={() => setActiveTab("account")}
                  className={cn(
                    "px-6 py-5 text-xs font-black uppercase tracking-widest transition-all relative",
                    activeTab === "account" ? "text-[#272727]" : "text-[#7E5C4A]/60 hover:text-[#272727]"
                  )}
                >
                  My Account
                  {activeTab === "account" && (
                    <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-[#9ACD32] rounded-t-full shadow-[0_-4px_12px_rgba(154,205,50,0.3)]" />
                  )}
                </button>
                
                {user.role === "admin" && (
                  <button
                    onClick={() => setActiveTab("management")}
                    className={cn(
                      "px-6 py-5 text-xs font-black uppercase tracking-widest transition-all relative",
                      activeTab === "management" ? "text-[#272727]" : "text-[#7E5C4A]/60 hover:text-[#272727]"
                    )}
                  >
                    User Management
                    {activeTab === "management" && (
                      <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-[#9ACD32] rounded-t-full shadow-[0_-4px_12px_rgba(154,205,50,0.3)]" />
                    )}
                  </button>
                )}
                
                <button
                  onClick={() => setActiveTab("security")}
                  className={cn(
                    "px-6 py-5 text-xs font-black uppercase tracking-widest transition-all relative",
                    activeTab === "security" ? "text-[#272727]" : "text-[#7E5C4A]/60 hover:text-[#272727]"
                  )}
                >
                  Security
                  {activeTab === "security" && (
                    <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-[#9ACD32] rounded-t-full shadow-[0_-4px_12px_rgba(154,205,50,0.3)]" />
                  )}
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-8 lg:p-10">
                {/* Global Message */}
                <AnimatePresence>
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, scale: 0.95 }}
                      animate={{ opacity: 1, height: "auto", scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.95 }}
                      className={cn(
                        "mb-8 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border backdrop-blur-md",
                        message.type === "success" 
                          ? "bg-emerald-400/10 text-emerald-700 border-emerald-500/20" 
                          : "bg-red-400/10 text-red-700 border-red-500/20"
                      )}
                    >
                      {message.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                      {message.text}
                    </motion.div>
                  )}
                </AnimatePresence>

                {activeTab === "account" && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-black text-[#272727] uppercase tracking-tight italic flex items-center gap-3">
                        <UserIcon className="w-6 h-6 text-[#7E5C4A]" />
                        Personal Info
                      </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-[#7E5C4A] uppercase tracking-[0.2em] ml-1">Display Name</label>
                        <div className="relative group">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AA7D] group-focus-within:text-[#7E5C4A] transition-colors" />
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full pl-11 pr-4 py-4 bg-[#EEF2F6]/70 border border-white/80 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#9ACD32]/15 focus:border-[#9ACD32]/50 focus:bg-white/90 transition-all text-sm font-bold text-[#272727] placeholder:text-[#D4AA7D] shadow-[inset_3px_3px_7px_rgba(166,180,200,0.18),inset_-3px_-3px_7px_rgba(255,255,255,0.85)]"
                            placeholder="Your Name"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[#7E5C4A] uppercase tracking-[0.2em] ml-1">Department</label>
                        <div className="relative group">
                          <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#D4AA7D] group-focus-within:text-[#7E5C4A] transition-all duration-300" />
                          <input
                            type="text"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="w-full pl-11 pr-4 py-4 bg-[#EEF2F6]/70 border border-white/80 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#9ACD32]/15 focus:border-[#9ACD32]/50 focus:bg-white/90 transition-all text-sm font-bold text-[#272727] placeholder:text-[#D4AA7D] shadow-[inset_3px_3px_7px_rgba(166,180,200,0.18),inset_-3px_-3px_7px_rgba(255,255,255,0.85)]"
                            placeholder="Your Department"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="flex items-center gap-3 px-10 py-4 bg-[#272727] text-[#EFD09E] rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_10px_25px_-5px_rgba(39,39,39,0.35)] hover:bg-[#272727]/90 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:translate-y-0 border border-[#EFD09E]/20"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                          <>
                            Save Changes
                            <ArrowRight className="w-4 h-4 text-[#9ACD32]" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "management" && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-black text-[#272727] flex items-center gap-3 uppercase tracking-tight italic">
                        <Users className="w-6 h-6 text-[#7E5C4A]" />
                        System Users
                      </h2>
                      <div className="px-4 py-1.5 bg-[#272727] text-[#EFD09E] border border-[#EFD09E]/20 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#9ACD32] animate-pulse" />
                        {allUsers.length} Users
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto rounded-2xl border border-white/80 bg-[#EEF2F6]/50 shadow-[inset_3px_3px_8px_rgba(166,180,200,0.15),inset_-3px_-3px_8px_rgba(255,255,255,0.8)]">
                      <table className="w-full text-left">
                        <thead className="bg-[#EEF2F6]/80 text-[#7E5C4A] text-[10px] font-black uppercase tracking-[0.2em]">
                          <tr>
                            <th className="px-6 py-5">User Profile</th>
                            <th className="px-6 py-5">Auth Role</th>
                            <th className="px-6 py-5">System Status</th>
                            <th className="px-6 py-5">Joined</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D4AA7D]/10">
                          {loadingUsers ? (
                            <tr>
                              <td colSpan={4} className="px-6 py-20 text-center">
                                <Loader2 className="w-10 h-10 animate-spin mx-auto text-[#D4AA7D]" />
                              </td>
                            </tr>
                          ) : (
                            allUsers.map((u) => (
                              <tr
                                key={u.uid}
                                onClick={() => {
                                  setSelectedUserForAction(u);
                                  setIsActionModalOpen(true);
                                }}
                                className="hover:bg-[#EFD09E]/15 transition-colors group cursor-pointer"
                              >
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-4">
                                    <motion.div 
                                      className="w-10 h-10 rounded-full overflow-hidden bg-[#272727] border border-[#EFD09E]/30 relative shadow-sm flex items-center justify-center z-10"
                                      whileHover={{ 
                                        scale: 2, 
                                        zIndex: 50,
                                        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                                        borderColor: "rgba(154, 205, 50, 0.6)"
                                      }}
                                      transition={{ type: "spring", stiffness: 450, damping: 25 }}
                                    >
                                      {u.photoURL ? (
                                        <Image src={u.photoURL} alt={u.displayName} fill className="object-cover" />
                                      ) : (
                                        <UserIcon className="w-5 h-5 text-[#9ACD32]" />
                                      )}
                                    </motion.div>
                                    <div>
                                      <div className="text-sm font-black text-[#272727] uppercase tracking-tighter italic">{u.displayName}</div>
                                      <div className="text-[10px] text-[#7E5C4A]/60 font-bold uppercase tracking-tight">{u.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-[#272727] text-[#EFD09E] flex items-center gap-1.5 border border-[#EFD09E]/20 shadow-sm w-fit">
                                    <Shield className="w-2.5 h-2.5 text-[#9ACD32]" />
                                    {u.role}
                                  </span>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-2">
                                    <div className={cn(
                                      "w-2 h-2 rounded-full ring-4 shadow-sm",
                                      u.status === "active" ? "bg-emerald-500 ring-emerald-500/10" : "bg-amber-500 ring-amber-500/10"
                                    )} />
                                    <span className="text-[11px] font-black text-[#272727] uppercase tracking-tight italic">{u.status}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-5 text-[11px] font-bold text-[#7E5C4A]/50 uppercase">
                                  {u.createdAt?.toLocaleDateString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === "security" && (
                  <div className="space-y-8">
                    <h2 className="text-xl font-black text-[#272727] uppercase tracking-tight italic flex items-center gap-3">
                      <Shield className="w-6 h-6 text-[#7E5C4A]" />
                      Security Center
                    </h2>

                    <div className="p-8 bg-[#EEF2F6]/80 rounded-2xl border border-white/80 space-y-6 shadow-[5px_5px_12px_rgba(166,180,200,0.22),-5px_-5px_12px_rgba(255,255,255,0.9)] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-8 text-[#D4AA7D]/15 group-hover:scale-110 transition-transform">
                        <Shield className="w-24 h-24" />
                      </div>

                      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                          <h3 className="text-sm font-black text-[#272727] uppercase tracking-widest italic">Change Password</h3>
                          <p className="text-xs text-[#7E5C4A] mt-2 font-medium">Request a secure password reset link to <span className="text-[#7E5C4A] font-bold">{user.email}</span></p>
                        </div>
                        <button
                          onClick={handleResetPassword}
                          className="px-6 py-3 bg-white text-[#7E5C4A] border border-white/80 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[4px_4px_10px_rgba(166,180,200,0.22),-4px_-4px_10px_rgba(255,255,255,0.9)] hover:bg-[#272727] hover:text-[#EFD09E] hover:border-[#EFD09E]/20 transition-all flex items-center gap-3 active:scale-95"
                        >
                          Send Recovery Link
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-8 bg-[#272727] rounded-2xl border border-[#EFD09E]/15 space-y-6 relative overflow-hidden group shadow-[6px_6px_16px_rgba(39,39,39,0.2),-2px_-2px_8px_rgba(255,255,255,0.5)]">
                      <div className="absolute top-0 right-0 p-8 text-[#9ACD32]/15 group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="w-24 h-24 filter drop-shadow-[0_0_15px_rgba(154,205,50,0.2)]" />
                      </div>

                      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 className="w-5 h-5 text-[#9ACD32] filter drop-shadow-[0_0_10px_rgba(154,205,50,0.5)]" />
                            <h3 className="text-[11px] font-black text-[#EFD09E] uppercase tracking-[0.2em]">Account Verification</h3>
                          </div>
                          <p className="text-sm font-bold text-[#EFD09E]/70 tracking-tight italic leading-relaxed">
                            Your identity is verified as <span className="text-[#D4AA7D] uppercase font-black tracking-widest">{user.role}</span> with <span className="text-[#9ACD32] uppercase font-black tracking-widest">{user.status}</span> privileges.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* User Action Modal (Admin Only) */}
      <AnimatePresence>
        {isActionModalOpen && selectedUserForAction && (
          <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#272727]/50 backdrop-blur-md"
              onClick={() => setIsActionModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#EEF2F6] rounded-2xl overflow-hidden shadow-[10px_10px_24px_rgba(166,180,200,0.35),-10px_-10px_24px_rgba(255,255,255,0.95)] border border-white/80"
            >
              <div className="p-8 border-b border-[#EFD09E]/15 bg-[#272727] text-[#EFD09E] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.div 
                    whileHover={{ scale: 2, zIndex: 50, boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}
                    transition={{ type: "spring", stiffness: 450, damping: 25 }}
                    className="w-12 h-12 rounded-full overflow-hidden bg-[#EFD09E]/10 border border-[#EFD09E]/30 relative flex items-center justify-center cursor-pointer"
                  >
                    {selectedUserForAction.photoURL ? (
                      <Image src={selectedUserForAction.photoURL} alt={selectedUserForAction.displayName} fill className="object-cover" />
                    ) : (
                      <UserIcon className="w-6 h-6 text-[#9ACD32]" />
                    )}
                  </motion.div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight italic">{selectedUserForAction.displayName}</h3>
                    <p className="text-[10px] font-bold text-[#EFD09E]/50 uppercase tracking-widest">{selectedUserForAction.email}</p>
                  </div>
                </div>
                {/* Deletion Safety Guard Logic */}
                {(() => {
                  const isSelf = selectedUserForAction.uid === user.uid;
                  const isAdmin = selectedUserForAction.role === "admin";
                  const cannotDelete = isSelf || isAdmin;
                  const warningMsg = isSelf 
                    ? "You cannot delete your own account" 
                    : isAdmin 
                    ? "Cannot delete an Admin. Change role to Staff first." 
                    : "";

                  return cannotDelete ? (
                    <div className="relative group/tooltip flex items-center">
                      <button
                        disabled
                        className="p-2 opacity-20 cursor-not-allowed text-slate-400"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      {/* Custom Tooltip */}
                      <div className="absolute top-full right-0 mt-3 w-48 p-4 bg-[#272727] text-[#EFD09E] text-[10px] font-bold rounded-2xl shadow-2xl opacity-0 group-hover/tooltip:opacity-100 transition-all pointer-events-none z-50 border border-[#EFD09E]/15 translate-y-2 group-hover/tooltip:translate-y-0">
                        <div className="flex items-center gap-2 text-rose-400 mb-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="uppercase tracking-[0.2em]">Safety Alert</span>
                        </div>
                        {warningMsg}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsDeleteConfirmOpen(true)}
                      className="p-2 hover:scale-110 transition-all text-red-500 hover:text-red-600"
                      title="Delete User"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  );
                })()}
              </div>

              <div className="p-8 space-y-8">
                {/* Status Toggle */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-[#7E5C4A] uppercase tracking-[0.2em] ml-1">Account Status</label>
                  <button
                    onClick={async () => {
                      setIsUpdatingUser(true);
                      const newStatus = selectedUserForAction.status === "active" ? "pending" : "active";
                      const res = await updateUser(selectedUserForAction.uid, { status: newStatus });
                      if (res.success) {
                        setSelectedUserForAction({ ...selectedUserForAction, status: newStatus });
                        fetchUsers(); // Refresh list
                      }
                      setIsUpdatingUser(false);
                    }}
                    disabled={isUpdatingUser}
                    className={cn(
                      "w-full p-6 rounded-2xl border transition-all flex items-center justify-between group",
                      selectedUserForAction.status === "active"
                        ? "bg-[#EEF2F6] border-[#9ACD32]/30 text-[#272727] shadow-[4px_4px_10px_rgba(166,180,200,0.2),-4px_-4px_10px_rgba(255,255,255,0.9)]"
                        : "bg-[#EEF2F6]/50 border-white/60 text-[#7E5C4A] hover:bg-[#EEF2F6]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-3 h-3 rounded-full ring-4",
                        selectedUserForAction.status === "active" 
                          ? "bg-green-400 ring-green-400/20" 
                          : "bg-amber-500 ring-amber-500/20"
                      )} />
                      <span className="font-black uppercase tracking-widest text-xs italic">
                        {selectedUserForAction.status === "active" ? "Active / Approved" : "Pending / Inactive"}
                      </span>
                    </div>
                    <motion.div 
                      whileHover={{
                        scale: [null, 1.1, 1.6],
                        transition: {
                          duration: 0.5,
                          times: [0, 0.6, 1],
                          ease: ["easeInOut", "easeOut"],
                        },
                      }}
                      transition={{
                        duration: 0.3,
                        ease: "easeOut",
                      }}
                      className={cn(
                        "px-3 py-1 bg-slate-900 rounded-lg text-[9px] font-black uppercase tracking-widest",
                        selectedUserForAction.status === "active" ? "text-[#9ACD32]" : "text-amber-500"
                      )}
                    >
                      Toggle
                    </motion.div>
                  </button>
                </div>

                {/* Role Switcher */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-[#7E5C4A] uppercase tracking-[0.2em] ml-1">System Permissions</label>
                  <div className="grid grid-cols-2 gap-4">
                    {(["staff", "admin"] as const).map((role) => (
                      <button
                        key={role}
                        onClick={async () => {
                          setIsUpdatingUser(true);
                          const res = await updateUser(selectedUserForAction.uid, { role });
                          if (res.success) {
                            setSelectedUserForAction({ ...selectedUserForAction, role });
                            fetchUsers(); // Refresh list
                          }
                          setIsUpdatingUser(false);
                        }}
                        disabled={isUpdatingUser}
                        className={cn(
                          "py-4 px-6 rounded-2xl border font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2",
                          selectedUserForAction.role === role
                            ? "bg-[#272727] border-[#EFD09E]/20 text-[#EFD09E] ring-4 ring-[#9ACD32]/10 shadow-lg"
                            : "bg-[#EEF2F6]/50 border-white/60 text-[#7E5C4A] hover:bg-[#EEF2F6]"
                        )}
                      >
                        <Shield className={cn("w-3 h-3", selectedUserForAction.role === role ? "text-[#9ACD32]" : "text-[#D4AA7D]")} />
                        {role}
                        {selectedUserForAction.role === role && <CheckCircle2 className="w-3 h-3 text-[#9ACD32]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 flex justify-center">
                  <button
                    onClick={() => setIsActionModalOpen(false)}
                    className="px-10 py-3 bg-transparent text-[#272727] drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.1)] font-black uppercase tracking-[0.3em] text-[10px] italic transition-all duration-300 active:scale-95 hover:bg-white hover:rounded-2xl hover:shadow-[0_0_30px_rgba(255,255,255,0.8)]"
                  >
                    Close Actions
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && selectedUserForAction && (
          <div className="fixed inset-0 z-120 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#272727]/40 backdrop-blur-sm"
              onClick={() => setIsDeleteConfirmOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-[#EEF2F6] rounded-2xl overflow-hidden shadow-[10px_10px_24px_rgba(166,180,200,0.35),-10px_-10px_24px_rgba(255,255,255,0.95)] border border-white/80"
            >
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-[#272727] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#EFD09E]/15 shadow-xl">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-[#272727] uppercase tracking-tight">Are you sure?</h3>
                  <p className="text-sm text-[#7E5C4A] leading-relaxed">
                    You are about to delete <span className="font-bold text-[#272727]">{selectedUserForAction.displayName}</span>. This action cannot be undone.
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={async () => {
                      setIsUpdatingUser(true);
                      const res = await deleteUser(selectedUserForAction.uid);
                      if (res.success) {
                        setIsDeleteConfirmOpen(false);
                        setIsActionModalOpen(false);
                        fetchUsers(); // Refresh the list
                      }
                      setIsUpdatingUser(false);
                    }}
                    disabled={isUpdatingUser}
                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isUpdatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <>
                        Confirm Delete
                        <Trash2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    className="w-full py-4 bg-[#EEF2F6] text-[#7E5C4A] rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/80 transition-all border border-white/80 shadow-[3px_3px_8px_rgba(166,180,200,0.2),-3px_-3px_8px_rgba(255,255,255,0.88)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Crop Modal */}
      <AnimatePresence>
        {isCropModalOpen && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#272727]/50 backdrop-blur-md"
              onClick={() => setIsCropModalOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl bg-[#EEF2F6] rounded-2xl overflow-hidden shadow-[10px_10px_24px_rgba(166,180,200,0.35),-10px_-10px_24px_rgba(255,255,255,0.95)] border border-white/80"
            >
              <div className="p-6 border-b border-[#D4AA7D]/15 flex items-center justify-between">
                <h3 className="font-black text-[#272727] uppercase tracking-tight italic">Crop Profile Picture</h3>
                <button 
                  onClick={() => setIsCropModalOpen(false)}
                  className="p-2 hover:bg-white/50 rounded-xl transition-colors"
                >
                  <ArrowRight className="w-5 h-5 text-[#7E5C4A] rotate-180" />
                </button>
              </div>

              <div className="relative h-[400px] bg-[#F6EDDE]">
                {imageToCrop && (
                  <Cropper
                    image={imageToCrop}
                    crop={crop}
                    zoom={zoom}
                    aspect={1 / 1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    cropShape="round"
                    showGrid={false}
                  />
                )}
              </div>

              <div className="p-8 space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase text-[#7E5C4A] tracking-widest">
                    <span>Zoom Level</span>
                    <span>{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-2 bg-[#D4AA7D]/20 rounded-lg appearance-none cursor-pointer accent-[#272727]"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setIsCropModalOpen(false)}
                    className="flex-1 py-4 px-6 rounded-2xl border border-white/80 font-black uppercase tracking-widest text-xs text-[#7E5C4A] hover:bg-white/50 transition-all active:scale-95 shadow-[3px_3px_8px_rgba(166,180,200,0.2),-3px_-3px_8px_rgba(255,255,255,0.88)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCropSave}
                    className="flex-1 py-4 px-6 bg-[#272727] text-[#EFD09E] rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-[#272727]/90 transition-all active:scale-95 flex items-center justify-center gap-2 border border-[#EFD09E]/20"
                  >
                    Apply Crop
                    <CheckCircle2 className="w-4 h-4 text-[#9ACD32]" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

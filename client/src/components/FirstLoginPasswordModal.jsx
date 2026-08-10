import React, { useState } from "react";
import { useSelector } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FirstLoginPasswordModal = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const user = useSelector((state) => state.auth.user);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Triggered if the user's avatar is null or empty
  const isFirstLogin = !user?.avatar;

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match.");
    }
    if (newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters long.");
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/update-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: user.id, newPassword }),
      });

      if (res.ok) {
        toast.success("Password updated successfully! Welcome.");
        window.location.reload();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to update password.");
      }
    } catch (error) {
      toast.error("Network error updating password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isFirstLogin}>
      <DialogContent className='bg-white sm:max-w-xl [&>button]:hidden p-10'>
        <DialogHeader>
          <DialogTitle className='text-xl font-bold text-slate-900'>
            Welcome! Update Your Password
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleUpdatePassword} className='space-y-4 py-2'>
          <p className='text-xs text-muted-foreground leading-relaxed'>
            This is your first time logging in with a temporary password. For
            security purposes, please set a new personal password to continue.
          </p>

          <div className='space-y-2'>
            <label className='text-xs font-semibold uppercase text-slate-600'>
              New Password
            </label>
            <Input
              type='password'
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder='Enter new password...'
              className='h-10'
              required
            />
          </div>

          <div className='space-y-2'>
            <label className='text-xs font-semibold uppercase text-slate-600'>
              Confirm Password
            </label>
            <Input
              type='password'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder='Confirm new password...'
              className='h-10'
              required
            />
          </div>

          <DialogFooter className='pt-2'>
            <Button
              type='submit'
              disabled={loading}
              className='w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium h-10'
            >
              {loading ? "Updating..." : "Save New Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FirstLoginPasswordModal;
import { supabase, Profile } from "@/lib/supabase";

/**
 * Authentication service for DIOMY
 * Handles phone-based OTP authentication
 */

export const authService = {
  /**
   * Send OTP to phone number
   */
  async sendOTP(phoneNumber: string) {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error sending OTP:", error);
      return { success: false, error };
    }
  },

  /**
   * Verify OTP and sign in
   */
  async verifyOTP(phoneNumber: string, token: string) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token,
        type: "sms",
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error verifying OTP:", error);
      return { success: false, error };
    }
  },

  /**
   * Create user profile after authentication
   */
  async createProfile(
    userId: string,
    phoneNumber: string,
    fullName: string,
    role: "client" | "driver"
  ) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .insert([
          {
            user_id: userId,
            phone_number: phoneNumber,
            full_name: fullName,
            role,
            prepaid_balance: 0,
            total_earned: 0,
            total_commissions_paid: 0,
            average_rating: 5.0,
            is_active: true,
            is_verified: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error creating profile:", error);
      return { success: false, error };
    }
  },

  /**
   * Get current user profile
   */
  async getCurrentProfile(): Promise<Profile | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error getting current profile:", error);
      return null;
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(profileId: string, updates: Partial<Profile>) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", profileId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error updating profile:", error);
      return { success: false, error };
    }
  },

  /**
   * Sign out
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error signing out:", error);
      return { success: false, error };
    }
  },

  /**
   * Get current session
   */
  async getCurrentSession() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  },
};

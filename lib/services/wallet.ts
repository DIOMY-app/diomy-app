import { supabase, Transaction } from "@/lib/supabase";

/**
 * Wallet service for DIOMY
 * Handles balance management and transactions
 */

export const walletService = {
  /**
   * Get wallet balance for a profile
   */
  async getBalance(profileId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("prepaid_balance")
        .eq("id", profileId)
        .single();

      if (error) throw error;
      return { success: true, balance: data.prepaid_balance };
    } catch (error) {
      console.error("Error getting balance:", error);
      return { success: false, balance: 0 };
    }
  },

  /**
   * Recharge wallet via Mobile Money
   */
  async rechargeWallet(
    profileId: string,
    amount: number,
    paymentMethod: "orange_money" | "mtn_money" | "moov_money"
  ) {
    try {
      // Get current balance
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("prepaid_balance")
        .eq("id", profileId)
        .single();

      if (profileError) throw profileError;

      const balanceBefore = profile.prepaid_balance;
      const balanceAfter = balanceBefore + amount;

      // Create transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert([
          {
            profile_id: profileId,
            transaction_type: "recharge",
            amount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            payment_method: paymentMethod,
            status: "completed",
            description: `Recharge via ${paymentMethod}`,
          },
        ])
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Update profile balance
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ prepaid_balance: balanceAfter })
        .eq("id", profileId);

      if (updateError) throw updateError;

      return { success: true, transaction, newBalance: balanceAfter };
    } catch (error) {
      console.error("Error recharging wallet:", error);
      return { success: false, error };
    }
  },

  /**
   * Deduct commission from driver's balance
   */
  async deductCommission(profileId: string, amount: number, rideId: string) {
    try {
      // Get current balance
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("prepaid_balance")
        .eq("id", profileId)
        .single();

      if (profileError) throw profileError;

      const balanceBefore = profile.prepaid_balance;
      const balanceAfter = Math.max(0, balanceBefore - amount);

      // Create transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert([
          {
            profile_id: profileId,
            transaction_type: "commission",
            amount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            ride_id: rideId,
            status: "completed",
            description: `Commission deducted from ride ${rideId}`,
          },
        ])
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Update profile balance
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ prepaid_balance: balanceAfter })
        .eq("id", profileId);

      if (updateError) throw updateError;

      return { success: true, transaction, newBalance: balanceAfter };
    } catch (error) {
      console.error("Error deducting commission:", error);
      return { success: false, error };
    }
  },

  /**
   * Get transaction history
   */
  async getTransactionHistory(profileId: string, limit: number = 20) {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error getting transaction history:", error);
      return { success: false, data: [] };
    }
  },

  /**
   * Request withdrawal (driver only)
   */
  async requestWithdrawal(profileId: string, amount: number) {
    try {
      // Get current balance
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("prepaid_balance")
        .eq("id", profileId)
        .single();

      if (profileError) throw profileError;

      if (profile.prepaid_balance < amount) {
        return { success: false, error: "Insufficient balance" };
      }

      const balanceBefore = profile.prepaid_balance;
      const balanceAfter = balanceBefore - amount;

      // Create withdrawal transaction
      const { data: transaction, error: transactionError } = await supabase
        .from("transactions")
        .insert([
          {
            profile_id: profileId,
            transaction_type: "withdrawal",
            amount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            status: "pending",
            description: "Withdrawal request",
          },
        ])
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Update profile balance
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ prepaid_balance: balanceAfter })
        .eq("id", profileId);

      if (updateError) throw updateError;

      return { success: true, transaction, newBalance: balanceAfter };
    } catch (error) {
      console.error("Error requesting withdrawal:", error);
      return { success: false, error };
    }
  },

  /**
   * Get earnings summary for driver
   */
  async getEarningsSummary(profileId: string) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("total_earned, total_commissions_paid, prepaid_balance")
        .eq("id", profileId)
        .single();

      if (profileError) throw profileError;

      return {
        success: true,
        earnings: {
          totalEarned: profile.total_earned,
          totalCommissions: profile.total_commissions_paid,
          currentBalance: profile.prepaid_balance,
          netEarnings: profile.total_earned - profile.total_commissions_paid,
        },
      };
    } catch (error) {
      console.error("Error getting earnings summary:", error);
      return { success: false, earnings: null };
    }
  },

  /**
   * Simulate Mobile Money payment (for development)
   */
  async simulateMobileMoneyPayment(
    profileId: string,
    amount: number,
    provider: "orange_money" | "mtn_money" | "moov_money"
  ) {
    try {
      // Simulate USSD code generation
      const ussdCode = `*${Math.floor(Math.random() * 1000)}#`;

      // In production, this would integrate with actual Mobile Money APIs
      // For now, we'll auto-complete after a delay
      return {
        success: true,
        ussdCode,
        provider,
        amount,
        message: `Please dial ${ussdCode} to complete payment`,
      };
    } catch (error) {
      console.error("Error simulating Mobile Money payment:", error);
      return { success: false, error };
    }
  },
};

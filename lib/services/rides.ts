import { supabase, Ride, RideRequest } from "@/lib/supabase";

/**
 * Rides service for DIOMY
 * Handles ride creation, updates, and tracking
 */

// Commission percentage for drivers
const COMMISSION_RATE = 0.15; // 15%

// Base fare calculation (simplified)
const BASE_FARE = 500; // XOF
const PER_KM_RATE = 100; // XOF per km
const CONFORT_MULTIPLIER = 1.5; // 50% more for confort rides

export const ridesService = {
  /**
   * Calculate estimated fare based on distance and ride type
   */
  calculateFare(distanceKm: number, rideType: "standard" | "confort"): number {
    let fare = BASE_FARE + distanceKm * PER_KM_RATE;
    if (rideType === "confort") {
      fare *= CONFORT_MULTIPLIER;
    }
    return Math.round(fare);
  },

  /**
   * Create a new ride request
   */
  async createRide(
    clientId: string,
    pickupLat: number,
    pickupLng: number,
    pickupAddress: string,
    destLat: number,
    destLng: number,
    destAddress: string,
    rideType: "standard" | "confort",
    paymentMethod: "cash" | "mobile_money",
    distanceKm: number
  ) {
    try {
      const estimatedFare = this.calculateFare(distanceKm, rideType);

      const { data, error } = await supabase
        .from("rides")
        .insert([
          {
            client_id: clientId,
            pickup_latitude: pickupLat,
            pickup_longitude: pickupLng,
            pickup_address: pickupAddress,
            destination_latitude: destLat,
            destination_longitude: destLng,
            destination_address: destAddress,
            ride_type: rideType,
            distance_km: distanceKm,
            estimated_fare: estimatedFare,
            payment_method: paymentMethod,
            payment_status: "pending",
            status: "requested",
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error creating ride:", error);
      return { success: false, error };
    }
  },

  /**
   * Get available drivers for a ride (simplified - returns all online drivers)
   */
  async getAvailableDrivers() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "driver")
        .eq("is_active", true)
        .gt("prepaid_balance", 0); // Only drivers with balance

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error getting available drivers:", error);
      return { success: false, data: [] };
    }
  },

  /**
   * Send ride request to drivers
   */
  async sendRideRequests(rideId: string, driverIds: string[]) {
    try {
      const rideRequests = driverIds.map((driverId) => ({
        ride_id: rideId,
        driver_id: driverId,
        status: "pending",
        expires_at: new Date(Date.now() + 30000).toISOString(), // 30 seconds
      }));

      const { data, error } = await supabase
        .from("ride_requests")
        .insert(rideRequests)
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error sending ride requests:", error);
      return { success: false, error };
    }
  },

  /**
   * Accept a ride request
   */
  async acceptRide(rideId: string, driverId: string) {
    try {
      // Update ride status
      const { error: rideError } = await supabase
        .from("rides")
        .update({
          driver_id: driverId,
          status: "accepted",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", rideId);

      if (rideError) throw rideError;

      // Update ride request status
      const { error: requestError } = await supabase
        .from("ride_requests")
        .update({ status: "accepted", responded_at: new Date().toISOString() })
        .eq("ride_id", rideId)
        .eq("driver_id", driverId);

      if (requestError) throw requestError;

      // Decline other requests
      await supabase
        .from("ride_requests")
        .update({ status: "declined" })
        .eq("ride_id", rideId)
        .neq("driver_id", driverId);

      return { success: true };
    } catch (error) {
      console.error("Error accepting ride:", error);
      return { success: false, error };
    }
  },

  /**
   * Decline a ride request
   */
  async declineRide(rideId: string, driverId: string) {
    try {
      const { error } = await supabase
        .from("ride_requests")
        .update({ status: "declined", responded_at: new Date().toISOString() })
        .eq("ride_id", rideId)
        .eq("driver_id", driverId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error declining ride:", error);
      return { success: false, error };
    }
  },

  /**
   * Start ride (driver picks up client)
   */
  async startRide(rideId: string) {
    try {
      const { data, error } = await supabase
        .from("rides")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", rideId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error starting ride:", error);
      return { success: false, error };
    }
  },

  /**
   * Complete ride and process payment
   */
  async completeRide(
    rideId: string,
    actualFare: number,
    tipAmount: number = 0,
    clientRating?: number,
    driverRating?: number
  ) {
    try {
      // Get ride details
      const { data: ride, error: rideError } = await supabase
        .from("rides")
        .select("*")
        .eq("id", rideId)
        .single();

      if (rideError) throw rideError;

      // Calculate commission (15%)
      const commissionAmount = Math.round(actualFare * COMMISSION_RATE);
      const driverEarnings = actualFare - commissionAmount + tipAmount;

      // Update ride
      const { error: updateError } = await supabase
        .from("rides")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          actual_fare: actualFare,
          commission_amount: commissionAmount,
          driver_net_earnings: driverEarnings,
          tip_amount: tipAmount,
          client_rating: clientRating,
          driver_rating: driverRating,
          payment_status: "completed",
        })
        .eq("id", rideId);

      if (updateError) throw updateError;

      // Deduct commission from driver's balance
      if (ride.driver_id) {
        const { error: commissionError } = await supabase
          .from("profiles")
          .update({
            prepaid_balance: supabase.rpc("decrement_balance", {
              profile_id: ride.driver_id,
              amount: commissionAmount,
            }),
            total_earned: supabase.rpc("increment_earned", {
              profile_id: ride.driver_id,
              amount: driverEarnings,
            }),
            total_commissions_paid: supabase.rpc("increment_commissions", {
              profile_id: ride.driver_id,
              amount: commissionAmount,
            }),
          })
          .eq("id", ride.driver_id);

        // Log transactions
        await supabase.from("transactions").insert([
          {
            profile_id: ride.driver_id,
            transaction_type: "commission",
            amount: commissionAmount,
            ride_id: rideId,
            status: "completed",
            description: `Commission from ride ${rideId}`,
          },
          {
            profile_id: ride.driver_id,
            transaction_type: "tip",
            amount: tipAmount,
            ride_id: rideId,
            status: "completed",
            description: `Tip from ride ${rideId}`,
          },
        ]);
      }

      return { success: true, driverEarnings };
    } catch (error) {
      console.error("Error completing ride:", error);
      return { success: false, error };
    }
  },

  /**
   * Get ride details
   */
  async getRide(rideId: string) {
    try {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("id", rideId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error getting ride:", error);
      return { success: false, error };
    }
  },

  /**
   * Get client's ride history
   */
  async getClientRides(clientId: string, limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error getting client rides:", error);
      return { success: false, data: [] };
    }
  },

  /**
   * Get driver's ride history
   */
  async getDriverRides(driverId: string, limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from("rides")
        .select("*")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error("Error getting driver rides:", error);
      return { success: false, data: [] };
    }
  },
};

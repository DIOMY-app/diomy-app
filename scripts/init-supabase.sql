-- DIOMY Database Schema for Supabase
-- This script creates all necessary tables for the taxi-moto application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  profile_photo_url TEXT,
  role VARCHAR(20) NOT NULL CHECK (role IN ('client', 'driver')),
  
  -- Driver-specific fields
  vehicle_plate VARCHAR(20),
  vehicle_model VARCHAR(255),
  vehicle_year INTEGER,
  driver_license_number VARCHAR(50),
  driver_license_expiry DATE,
  bank_account_number VARCHAR(50),
  bank_name VARCHAR(255),
  
  -- Wallet fields
  prepaid_balance DECIMAL(10, 2) DEFAULT 0.00,
  total_earned DECIMAL(10, 2) DEFAULT 0.00,
  total_commissions_paid DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Rating fields
  average_rating DECIMAL(3, 2) DEFAULT 5.00,
  total_ratings INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- RIDES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS rides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Location data
  pickup_latitude DECIMAL(10, 8) NOT NULL,
  pickup_longitude DECIMAL(11, 8) NOT NULL,
  pickup_address TEXT NOT NULL,
  destination_latitude DECIMAL(10, 8) NOT NULL,
  destination_longitude DECIMAL(11, 8) NOT NULL,
  destination_address TEXT NOT NULL,
  
  -- Ride details
  ride_type VARCHAR(20) NOT NULL CHECK (ride_type IN ('standard', 'confort')),
  distance_km DECIMAL(10, 2),
  estimated_fare DECIMAL(10, 2) NOT NULL,
  actual_fare DECIMAL(10, 2),
  commission_amount DECIMAL(10, 2),
  driver_net_earnings DECIMAL(10, 2),
  
  -- Payment
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'mobile_money')),
  payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('pending', 'completed', 'failed')),
  
  -- Status
  status VARCHAR(20) NOT NULL CHECK (status IN ('requested', 'accepted', 'in_progress', 'completed', 'cancelled')),
  
  -- Ratings
  client_rating INTEGER CHECK (client_rating >= 1 AND client_rating <= 5),
  driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
  client_review TEXT,
  driver_review TEXT,
  tip_amount DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Timestamps
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Transaction type
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('recharge', 'commission', 'withdrawal', 'tip')),
  
  -- Amount
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  
  -- Related ride (if applicable)
  ride_id UUID REFERENCES rides(id) ON DELETE SET NULL,
  
  -- Payment method (for recharges)
  payment_method VARCHAR(20) CHECK (payment_method IN ('orange_money', 'mtn_money', 'moov_money')),
  
  -- Status
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  
  -- Description
  description TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- RIDE_REQUESTS TABLE (for real-time notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ride_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Status
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  
  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 seconds')
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX idx_profiles_phone ON profiles(phone_number);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

CREATE INDEX idx_rides_client_id ON rides(client_id);
CREATE INDEX idx_rides_driver_id ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_created_at ON rides(created_at);

CREATE INDEX idx_transactions_profile_id ON transactions(profile_id);
CREATE INDEX idx_transactions_ride_id ON transactions(ride_id);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

CREATE INDEX idx_ride_requests_driver_id ON ride_requests(driver_id);
CREATE INDEX idx_ride_requests_status ON ride_requests(status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Optional but recommended
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see their own profile
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Rides: Clients can see their rides, drivers can see their rides
CREATE POLICY "Clients can view their rides" ON rides
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = client_id));

CREATE POLICY "Drivers can view their rides" ON rides
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = driver_id));

-- Transactions: Users can only see their transactions
CREATE POLICY "Users can view their transactions" ON transactions
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = profile_id));

-- Ride Requests: Drivers can only see their requests
CREATE POLICY "Drivers can view their ride requests" ON ride_requests
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM profiles WHERE id = driver_id));

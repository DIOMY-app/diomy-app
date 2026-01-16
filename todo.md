# DIOMY - Project TODO

## Phase 1: Core Infrastructure
- [x] Configure Supabase connection and environment variables
- [x] Create database tables (profiles, rides, transactions)
- [x] Set up authentication (phone number + OTP)
- [x] Implement role-based access (Client vs Driver)

## Phase 2: Client Features
- [x] Build Home screen with map integration
- [ ] Implement "Request Ride" flow
- [ ] Create ride confirmation screen with price estimation
- [ ] Build "Ride In Progress" screen with live tracking
- [ ] Implement ride completion and rating system
- [x] Create Wallet screen for clients
- [x] Build Profile screen for clients

## Phase 3: Driver Features
- [x] Build Home screen for drivers with online/offline toggle
- [ ] Implement ride request notifications
- [ ] Create ride acceptance/decline flow
- [ ] Build navigation screens (pickup → destination)
- [x] Implement prepaid wallet system
- [x] Create commission tracking and calculation (15%)
- [ ] Build transaction history for drivers
- [ ] Implement balance blocking (no rides if balance = 0)

## Phase 4: Payment & Mobile Money
- [x] Integrate Mobile Money simulation (Orange, MTN, Moov)
- [ ] Implement wallet recharge flow
- [x] Create transaction logging system
- [ ] Build receipt generation

## Phase 5: Geolocation & Maps
- [ ] Integrate Expo Location for GPS tracking
- [ ] Implement React Native Maps
- [ ] Create real-time driver location updates
- [ ] Build route calculation and ETA display
- [x] Implement distance-based fare calculation

## Phase 6: UI/UX Polish
- [ ] Generate custom app logo and branding
- [x] Implement dark mode support
- [ ] Add haptic feedback for interactions
- [ ] Create loading states and animations
- [x] Build error handling and user feedback

## Phase 7: Testing & Deployment
- [ ] Write unit tests for core logic
- [ ] Test end-to-end user flows
- [ ] Verify database transactions
- [ ] Test on iOS and Android devices
- [ ] Prepare final code package for delivery

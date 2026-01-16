# DIOMY - Design Document

## 📱 Orientation & Principles
- **Portrait Mode (9:16)** - One-handed usage optimized
- **Apple HIG Compliance** - Native iOS feel and interaction patterns
- **Color Palette** - Warm, trustworthy colors for transportation service

## 🎨 Color Scheme
- **Primary (Teal)**: `#0a7ea4` - Action buttons, highlights
- **Background**: `#ffffff` (light) / `#151718` (dark)
- **Surface**: `#f5f5f5` (light) / `#1e2022` (dark)
- **Success (Green)**: `#22C55E` - Ride confirmed, payment success
- **Warning (Orange)**: `#F59E0B` - Low balance alerts
- **Error (Red)**: `#EF4444` - Cancellation, errors
- **Foreground**: `#11181C` (light) / `#ECEDEE` (dark)
- **Muted**: `#687076` (light) / `#9BA1A6` (dark)

## 📋 Screen List

### Authentication & Onboarding
1. **Splash Screen** - App logo, loading state
2. **Role Selection** - Choose "Client" or "Driver"
3. **Sign Up / Login** - Phone number + verification code
4. **Profile Setup** - Name, photo, emergency contact

### Client Screens
5. **Home (Client)** - Map with current location, search bar, recent rides
6. **Request Ride** - Pickup/destination input, ride type selection (Standard/Confort)
7. **Ride Confirmation** - Driver details, ETA, estimated fare, payment method
8. **Ride In Progress** - Live tracking, driver location, chat button
9. **Ride Complete** - Rating, tip option, receipt
10. **Wallet** - Balance, transaction history, recharge options
11. **Profile (Client)** - Settings, saved places, payment methods

### Driver Screens
12. **Home (Driver)** - Map, online/offline toggle, earnings summary
13. **Ride Request** - Accept/decline incoming ride request
14. **Ride Navigation** - Route to pickup, then to destination
15. **Ride Complete** - Confirm completion, collect payment
16. **Wallet (Driver)** - Prepaid balance, commission tracking, withdrawal history
17. **Profile (Driver)** - Vehicle info, documents, ratings, settings

## 🎯 Primary Content & Functionality

### Client Home Screen
- **Map Display**: Full-screen map centered on user's location
- **Search Bar**: "Where to?" input field
- **Quick Actions**: Recent destinations, favorite places
- **Ride Type Selector**: Standard (basic moto) vs Confort (new moto + helmet)
- **Active Ride Card**: Shows current ride status if in progress
- **Bottom Tab**: Home, Rides History, Wallet, Profile

### Driver Home Screen
- **Map Display**: Full-screen map with available ride requests
- **Online Toggle**: Switch between online/offline status
- **Earnings Summary**: Today's earnings, commission deducted, net income
- **Ride Queue**: Incoming ride requests with distance and estimated fare
- **Balance Alert**: Warning if prepaid balance is low
- **Bottom Tab**: Home, Wallet, Profile

### Wallet Screen (Both Roles)
- **Balance Display**: Large, prominent balance number
- **Transaction List**: Recent recharges, commissions, withdrawals
- **Recharge Button**: Mobile Money integration (Orange, MTN, Moov)
- **Withdrawal Button** (Driver only): Request payout to bank account

### Ride In Progress (Client)
- **Driver Card**: Photo, name, rating, vehicle plate
- **Live Map**: Real-time driver location, route to destination
- **ETA & Distance**: Updated in real-time
- **Chat Button**: Direct message with driver
- **Emergency Button**: Contact support

## 🔄 Key User Flows

### Client: Request a Ride
1. **Home Screen** → Tap "Where to?" or search bar
2. **Request Ride Screen** → Enter destination, select ride type
3. **Price Estimation** → Show estimated fare based on distance
4. **Confirm Ride** → Tap "Request Ride" button
5. **Waiting Screen** → Show "Finding driver..." with spinner
6. **Driver Assigned** → Show driver details, ETA
7. **Driver Arrived** → Notification, map shows driver location
8. **Ride In Progress** → Live tracking, driver navigation
9. **Destination Reached** → Show "Ride Complete" screen
10. **Rate & Tip** → Rate driver (1-5 stars), add tip (optional)
11. **Receipt** → Show fare breakdown, commission (if applicable)

### Driver: Accept & Complete Ride
1. **Home Screen** → Receive ride request notification
2. **Request Card** → Shows pickup location, destination, estimated fare
3. **Accept/Decline** → Tap to accept or decline
4. **Navigation to Pickup** → Route displayed, "Pickup in X min"
5. **Pickup Confirmation** → Tap "Passenger Boarded"
6. **Navigation to Destination** → Route to destination
7. **Arrival** → Tap "Arrived at Destination"
8. **Collect Payment** → Show total fare, payment method
9. **Complete Ride** → Confirm completion, see net earnings

### Driver: Recharge Wallet
1. **Wallet Screen** → Tap "Recharge Balance"
2. **Amount Selection** → Choose amount (5,000 XOF, 10,000 XOF, etc.)
3. **Payment Method** → Select Mobile Money provider (Orange, MTN, Moov)
4. **Confirmation** → Show USSD code or payment prompt
5. **Success** → Balance updated, transaction logged

## 🎬 Interaction Patterns
- **Press Feedback**: Primary buttons scale to 0.97 + light haptic
- **Loading States**: Spinner with "Finding driver..." text
- **Errors**: Toast notifications with error message and retry option
- **Confirmations**: Modal dialog with action buttons
- **Transitions**: Smooth fade-in/out between screens (200ms)

## 📐 Layout Specifications
- **Safe Area**: Respects notch and home indicator
- **Tab Bar**: Fixed at bottom (56px + safe area)
- **Map**: Full-screen with overlay cards
- **Cards**: Rounded corners (16px), subtle shadow
- **Buttons**: Full-width or fixed width (120px), 48px height minimum
- **Text**: 16px body, 20px heading, 14px caption
- **Spacing**: 4px grid (4, 8, 12, 16, 20, 24, 32px)

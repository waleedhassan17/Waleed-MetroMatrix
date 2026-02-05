# MetroMatrix - Service Provider API Guide
## Complete Backend API Documentation for Home Service Module

**Version:** 1.0.0  
**Date:** February 2026  
**Module:** Home Service Providers (Electricians, Plumbers, AC Repairers)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Base Configuration](#2-base-configuration)
3. [Data Models](#3-data-models)
4. [User View APIs](#4-user-view-apis)
5. [Provider View APIs](#5-provider-view-apis)
6. [Admin View APIs](#6-admin-view-apis)
7. [Real-time Features](#7-real-time-features)
8. [Error Handling](#8-error-handling)

---

## 1. Overview

This document outlines all the APIs required for the Home Service Provider module in MetroMatrix. The module supports three types of service providers:
- **Electricians**
- **Plumbers**
- **AC Repairers**

The APIs are organized by user role:
- **User (Customer)**: Browse, book, track, and pay for services
- **Provider**: Manage jobs, earnings, and profile
- **Admin**: Manage providers, users, and monitor platform activity

---

## 2. Base Configuration

```
Base URL: https://metromatrix-api.herokuapp.com/api
Content-Type: application/json
Authorization: Bearer <token>
```

### Authentication Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

---

## 3. Data Models

### 3.1 Provider Model

```typescript
interface Provider {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  image: string;                    // Profile image URL
  
  // Provider Classification
  providerType: 'electricians' | 'plumbers' | 'ac-repairers';
  specialty: string;                // e.g., "Wiring • Installation • Repairs"
  
  // Professional Details
  experience: string;               // e.g., "10+ Years"
  bio: string;
  certifications: string[];         // ["Licensed Electrician", "Safety Certified"]
  skills: string[];                 // ["Home Rewiring", "Panel Upgrades"]
  languages: string[];              // ["English", "Urdu"]
  
  // Ratings & Reviews
  rating: number;                   // 0-5
  reviews: number;                  // Total review count
  jobSuccessRate: number;           // Percentage
  jobsCompleted: number;
  responseTime: string;             // e.g., "~15 min"
  
  // Location
  address: string;
  city: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  
  // Pricing
  price: number;                    // Base price
  consultationFee?: number;
  
  // Status
  verified: boolean;
  isOnline: boolean;
  isActive: boolean;
  available: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 Service Model

```typescript
interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;                 // e.g., "2-3 hours"
  icon: string;
  providerId: string;
  category: 'electricians' | 'plumbers' | 'ac-repairers';
}
```

### 3.3 Booking Model

```typescript
interface Booking {
  id: string;
  bookingId: string;                // User-friendly ID like "BK-1234567890"
  
  // Participants
  userId: string;
  providerId: string;
  
  // Service Details
  category: 'electricians' | 'plumbers' | 'ac-repairers';
  serviceType: string;
  
  // Scheduling
  selectedDate: string;             // ISO date string
  selectedTime: string;             // e.g., "09:00 AM"
  
  // Location
  address: {
    id: string;
    label: string;
    address: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  
  // Additional Info
  instructions: string;
  estimatedPrice: number;
  estimatedDuration: string;
  
  // Status
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  
  // Payment
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod?: 'cash' | 'online' | 'jazzcash' | 'easypaisa';
  actualAmount?: number;
  
  // Timestamps
  createdAt: string;
  confirmedAt?: string;
  startedAt?: string;
  completedAt?: string;
}
```

### 3.4 Review Model

```typescript
interface Review {
  id: string;
  bookingId: string;
  userId: string;
  providerId: string;
  
  rating: number;                   // 1-5
  comment: string;
  tags: string[];                   // ["Professional", "On Time", "Clean Work"]
  wouldRecommend: boolean;
  
  // Response from provider
  providerResponse?: string;
  respondedAt?: string;
  
  helpfulCount: number;
  
  createdAt: string;
}
```

### 3.5 Time Slot Model

```typescript
interface TimeSlot {
  id: string;
  time: string;                     // e.g., "09:00 AM"
  available: boolean;
  period: 'morning' | 'afternoon' | 'evening';
}
```

### 3.6 Saved Address Model

```typescript
interface SavedAddress {
  id: string;
  userId: string;
  label: string;                    // "Home", "Office"
  address: string;
  icon: 'home' | 'building' | 'location' | 'briefcase';
  isDefault: boolean;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}
```

---

## 4. User View APIs

### 4.1 Provider Discovery

#### 4.1.1 Get Providers by Category
Fetch list of providers filtered by service category.

```
GET /providers/{category}
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| category | string | Yes | One of: `electricians`, `plumbers`, `ac-repairers` |

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 15) |
| search | string | No | Search by name or skill |
| sort | string | No | Sort by: `rating`, `reviews`, `experience`, `price` |
| sortOrder | string | No | `asc` or `desc` (default: `desc`) |
| city | string | No | Filter by city |
| minRating | number | No | Minimum rating (1-5) |
| maxPrice | number | No | Maximum base price |
| available | boolean | No | Filter only available providers |
| verified | boolean | No | Filter only verified providers |

**Request:**
```http
GET /providers/electricians?page=1&limit=15&sort=rating&sortOrder=desc&city=Lahore
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "providers": [
    {
      "id": "prov_123",
      "name": "Usman Ali",
      "image": "https://example.com/images/usman.jpg",
      "rating": 4.8,
      "reviews": 189,
      "experience": "10+ Years",
      "verified": true,
      "price": 3000,
      "category": "electricians",
      "specialty": "⚡ Wiring • Installation • Repairs",
      "address": "DHA Phase 5, Lahore",
      "responseTime": "~15 min",
      "available": true,
      "isOnline": true
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 67,
    "itemsPerPage": 15,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

---

#### 4.1.2 Get Provider Details
Fetch complete details of a specific provider.

```
GET /providers/{category}/{providerId}
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| category | string | Yes | Provider category |
| providerId | string | Yes | Provider ID |

**Response:**
```json
{
  "success": true,
  "provider": {
    "id": "prov_123",
    "name": "Usman Ali",
    "image": "https://example.com/images/usman.jpg",
    "rating": 4.8,
    "reviews": 189,
    "experience": "10+ Years",
    "verified": true,
    "price": 3000,
    "category": "electricians",
    "specialty": "⚡ Wiring • Installation • Repairs",
    "bio": "Licensed electrician with over 10 years of experience...",
    "phoneNumber": "+92 301 9876543",
    "email": "usman.ali@example.com",
    "address": "DHA Phase 5, Lahore, Punjab",
    "responseTime": "~15 min",
    "jobSuccessRate": 96,
    "jobsCompleted": 178,
    "certifications": ["Licensed Electrician", "Safety Certified", "Insurance Verified"],
    "skills": ["Home Rewiring", "Panel Upgrades", "LED Installation"],
    "languages": ["English", "Urdu", "Punjabi"],
    "isOnline": true,
    "servicesOffered": [
      {
        "id": "srv_1",
        "name": "Complete Home Rewiring",
        "description": "Full electrical system upgrade",
        "price": 15000,
        "duration": "1-2 days",
        "icon": "flash"
      }
    ],
    "availability": [
      {
        "id": "avl_1",
        "day": "Monday",
        "timeSlots": ["9:00 AM - 12:00 PM", "2:00 PM - 6:00 PM"],
        "available": true
      }
    ],
    "gallery": [
      {
        "id": "gal_1",
        "image": "https://example.com/gallery/1.jpg",
        "title": "Recent Work",
        "category": "Installation"
      }
    ]
  }
}
```

---

#### 4.1.3 Get Provider Reviews
Fetch reviews for a specific provider.

```
GET /providers/{providerId}/reviews
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number |
| limit | number | No | Items per page |
| rating | number | No | Filter by specific rating |
| sort | string | No | `recent`, `helpful`, `rating_high`, `rating_low` |

**Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "id": "rev_1",
      "reviewerName": "Ali Hassan",
      "reviewerInitial": "A",
      "rating": 5,
      "comment": "Excellent service! Very professional.",
      "date": "2026-02-03T10:00:00Z",
      "helpfulCount": 12,
      "avatarColor": "#4F46E5",
      "tags": ["Professional", "On Time"],
      "providerResponse": "Thank you for your kind words!"
    }
  ],
  "stats": {
    "averageRating": 4.8,
    "totalReviews": 189,
    "ratingBreakdown": {
      "5": 120,
      "4": 45,
      "3": 15,
      "2": 6,
      "1": 3
    }
  },
  "pagination": {
    "currentPage": 1,
    "totalPages": 19,
    "totalItems": 189
  }
}
```

---

#### 4.1.4 Search Providers
Quick search for providers across categories.

```
POST /providers/search
```

**Request Body:**
```json
{
  "query": "AC installation",
  "location": {
    "latitude": 31.4504,
    "longitude": 73.1350,
    "radius": 10
  },
  "categories": ["electricians", "ac-repairers"],
  "urgency": "today",
  "maxWaitTime": 60
}
```

**Response:**
```json
{
  "success": true,
  "providers": [
    {
      "id": "prov_456",
      "name": "Bilal Ahmed",
      "image": "https://example.com/images/bilal.jpg",
      "category": "ac-repairers",
      "rating": 4.7,
      "reviews": 167,
      "distance": "2.3 km",
      "estimatedArrival": "15 min",
      "responseTime": "~20 min",
      "available": true
    }
  ],
  "searchId": "srch_12345",
  "totalFound": 8
}
```

---

### 4.2 Booking Flow

#### 4.2.1 Get Booking Data
Fetch data needed to create a booking (addresses, time slots).

```
GET /bookings/prepare/{providerId}
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| date | string | No | Selected date (ISO format) |
| category | string | Yes | Provider category |

**Response:**
```json
{
  "success": true,
  "provider": {
    "id": "prov_123",
    "name": "Usman Ali",
    "image": "https://example.com/images/usman.jpg",
    "service": "Electrical Services",
    "specialty": "Wiring & Installation Specialist",
    "rating": 4.8,
    "reviews": 189,
    "experience": "10+ years",
    "verified": true,
    "isOnline": true,
    "responseTime": "~15 min",
    "basePrice": 3000,
    "category": "electricians"
  },
  "savedAddresses": [
    {
      "id": "addr_1",
      "label": "Home",
      "address": "123 Main Street, Downtown, Faisalabad",
      "icon": "home",
      "isDefault": true,
      "coordinates": {
        "latitude": 31.4504,
        "longitude": 73.1350
      }
    }
  ],
  "timeSlots": [
    { "id": "ts_1", "time": "09:00 AM", "available": true, "period": "morning" },
    { "id": "ts_2", "time": "10:00 AM", "available": true, "period": "morning" },
    { "id": "ts_3", "time": "11:00 AM", "available": false, "period": "morning" }
  ]
}
```

---

#### 4.2.2 Create Booking
Submit a new booking request.

```
POST /bookings
```

**Request Body:**
```json
{
  "providerId": "prov_123",
  "category": "electricians",
  "selectedDate": "2026-02-10",
  "selectedTime": "09:00 AM",
  "addressId": "addr_1",
  "instructions": "Please call before arriving. Gate code is 1234.",
  "estimatedPrice": 3000,
  "estimatedDuration": "2-3 hours"
}
```

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": "book_789",
    "bookingId": "BK-1707571234567",
    "status": "pending",
    "provider": {
      "id": "prov_123",
      "name": "Usman Ali",
      "image": "https://example.com/images/usman.jpg",
      "phoneNumber": "+92 301 9876543"
    },
    "selectedDate": "Monday, February 10, 2026",
    "selectedTime": "09:00 AM",
    "address": {
      "label": "Home",
      "address": "123 Main Street, Downtown, Faisalabad"
    },
    "estimatedPrice": 3000,
    "createdAt": "2026-02-05T10:00:00Z"
  },
  "message": "Booking request sent to provider"
}
```

---

#### 4.2.3 Get Booking Status
Check status of a booking (used for polling during confirmation wait).

```
GET /bookings/{bookingId}/status
```

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": "book_789",
    "bookingId": "BK-1707571234567",
    "status": "confirmed",
    "providerAccepted": true,
    "estimatedArrival": "15 min",
    "provider": {
      "id": "prov_123",
      "name": "Usman Ali",
      "currentLocation": {
        "latitude": 31.4554,
        "longitude": 73.1400
      }
    }
  }
}
```

---

#### 4.2.4 Cancel Booking
Cancel a booking request.

```
POST /bookings/{bookingId}/cancel
```

**Request Body:**
```json
{
  "reason": "Change of plans",
  "cancelledBy": "user"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "refundStatus": "not_applicable"
}
```

---

### 4.3 Live Tracking

#### 4.3.1 Initialize Tracking
Start live tracking for a confirmed booking.

```
GET /tracking/{bookingId}/initialize
```

**Response:**
```json
{
  "success": true,
  "trackingData": {
    "provider": {
      "id": "prov_123",
      "name": "Usman Ali",
      "phone": "+923001234567",
      "image": "https://example.com/images/usman.jpg",
      "service": "Electrical Services",
      "specialty": "Wiring & Installation Specialist",
      "rating": 4.8,
      "reviews": 189,
      "experience": "10+ years",
      "verified": true,
      "category": "electricians"
    },
    "providerLocation": {
      "latitude": 31.4554,
      "longitude": 73.1400
    },
    "status": "en_route",
    "bookingId": "BK-1707571234567"
  }
}
```

---

#### 4.3.2 Get Provider Location (Polling)
Get real-time provider location updates.

```
GET /tracking/{bookingId}/location
```

**Response:**
```json
{
  "success": true,
  "location": {
    "latitude": 31.4530,
    "longitude": 73.1375
  },
  "status": "en_route",
  "estimatedArrival": "8 min",
  "distance": "1.2 km",
  "updatedAt": "2026-02-05T10:15:30Z"
}
```

---

#### 4.3.3 Get Route Information
Get route details between provider and user.

```
POST /tracking/{bookingId}/route
```

**Request Body:**
```json
{
  "origin": {
    "latitude": 31.4554,
    "longitude": 73.1400
  },
  "destination": {
    "latitude": 31.4504,
    "longitude": 73.1350
  }
}
```

**Response:**
```json
{
  "success": true,
  "route": {
    "coordinates": [
      { "latitude": 31.4554, "longitude": 73.1400 },
      { "latitude": 31.4530, "longitude": 73.1375 },
      { "latitude": 31.4504, "longitude": 73.1350 }
    ],
    "distance": "2.5 km",
    "distanceValue": 2500,
    "duration": "12 mins",
    "durationValue": 720
  }
}
```

---

### 4.4 Service Status & Completion

#### 4.4.1 Get Service Status
Get current status of an ongoing service.

```
GET /services/{bookingId}/status
```

**Response:**
```json
{
  "success": true,
  "service": {
    "bookingId": "BK-1707571234567",
    "status": "in_progress",
    "provider": {
      "id": "prov_123",
      "name": "Usman Ali",
      "phone": "+923001234567",
      "image": "https://example.com/images/usman.jpg"
    },
    "serviceDetails": {
      "type": "Electrical Services",
      "description": "Complete wiring installation",
      "startedAt": "2026-02-05T10:30:00Z",
      "estimatedDuration": "2 hours",
      "suggestedAmount": 3500
    },
    "progressSteps": [
      { "id": 1, "label": "Provider Arrived", "completed": true, "time": "10:30 AM" },
      { "id": 2, "label": "Work Started", "completed": true, "time": "10:35 AM" },
      { "id": 3, "label": "Work in Progress", "completed": true, "time": "11:00 AM" },
      { "id": 4, "label": "Work Completed", "completed": false }
    ]
  }
}
```

---

#### 4.4.2 Mark Service Completed (by User)
User confirms that service has been completed.

```
POST /services/{bookingId}/complete
```

**Request Body:**
```json
{
  "confirmedByUser": true,
  "actualAmount": 3500
}
```

**Response:**
```json
{
  "success": true,
  "service": {
    "bookingId": "BK-1707571234567",
    "status": "completed",
    "completedAt": "2026-02-05T12:30:00Z",
    "duration": "2 hours",
    "finalAmount": 3500
  },
  "paymentRequired": true
}
```

---

### 4.5 Payment

#### 4.5.1 Initialize Payment
Prepare payment for a completed service.

```
POST /payments/initialize
```

**Request Body:**
```json
{
  "bookingId": "BK-1707571234567",
  "amount": 3500,
  "category": "electricians"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "paymentId": "pay_12345",
    "recipient": {
      "id": "prov_123",
      "name": "Usman Ali",
      "image": "https://example.com/images/usman.jpg"
    },
    "details": {
      "bookingId": "BK-1707571234567",
      "service": "Electrical Services",
      "description": "Complete wiring installation",
      "amount": 3500,
      "suggestedAmount": 3500,
      "invoiceId": "INV-20260205-001"
    },
    "availableMethods": [
      {
        "id": "cash",
        "name": "Cash Payment",
        "icon": "cash",
        "enabled": true,
        "description": "Pay in cash to the provider"
      },
      {
        "id": "jazzcash",
        "name": "JazzCash",
        "icon": "phone",
        "enabled": true,
        "description": "Pay via JazzCash mobile wallet"
      },
      {
        "id": "easypaisa",
        "name": "Easypaisa",
        "icon": "phone",
        "enabled": true,
        "description": "Pay via Easypaisa mobile wallet"
      },
      {
        "id": "card",
        "name": "Credit/Debit Card",
        "icon": "card",
        "enabled": true,
        "description": "Pay using your bank card"
      }
    ]
  }
}
```

---

#### 4.5.2 Process Payment
Process the payment transaction.

```
POST /payments/process
```

**Request Body:**
```json
{
  "paymentId": "pay_12345",
  "bookingId": "BK-1707571234567",
  "method": "jazzcash",
  "amount": 3500,
  "useCustomAmount": false
}
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "transactionId": "TXN-1707571234567",
    "status": "completed",
    "method": "jazzcash",
    "amount": 3500,
    "currency": "PKR",
    "paidAt": "2026-02-05T12:45:00Z"
  },
  "message": "Payment successful"
}
```

---

### 4.6 Reviews

#### 4.6.1 Initialize Review
Get data needed to submit a review.

```
GET /reviews/initialize/{bookingId}
```

**Response:**
```json
{
  "success": true,
  "reviewData": {
    "provider": {
      "id": "prov_123",
      "name": "Usman Ali",
      "image": "https://example.com/images/usman.jpg",
      "category": "electricians"
    },
    "serviceDetails": {
      "type": "Electrical Services",
      "description": "Complete wiring installation",
      "completedAt": "2026-02-05T12:30:00Z",
      "amount": 3500
    },
    "availableTags": [
      { "id": "1", "label": "Professional", "icon": "badge" },
      { "id": "2", "label": "On Time", "icon": "clock" },
      { "id": "3", "label": "Clean Work", "icon": "sparkles" },
      { "id": "4", "label": "Good Value", "icon": "currency" },
      { "id": "5", "label": "Friendly", "icon": "smile" },
      { "id": "6", "label": "Expert Knowledge", "icon": "brain" }
    ]
  }
}
```

---

#### 4.6.2 Submit Review
Submit a review for a completed service.

```
POST /reviews
```

**Request Body:**
```json
{
  "bookingId": "BK-1707571234567",
  "providerId": "prov_123",
  "rating": 5,
  "feedback": "Excellent work! Very professional and completed the job quickly.",
  "tags": ["1", "2", "3"],
  "wouldRecommend": true
}
```

**Response:**
```json
{
  "success": true,
  "review": {
    "id": "rev_12345",
    "rating": 5,
    "feedback": "Excellent work! Very professional and completed the job quickly.",
    "tags": ["Professional", "On Time", "Clean Work"],
    "createdAt": "2026-02-05T13:00:00Z"
  },
  "message": "Thank you for your review!"
}
```

---

### 4.7 User Saved Addresses

#### 4.7.1 Get Saved Addresses

```
GET /users/addresses
```

**Response:**
```json
{
  "success": true,
  "addresses": [
    {
      "id": "addr_1",
      "label": "Home",
      "address": "123 Main Street, Downtown, Faisalabad",
      "icon": "home",
      "isDefault": true,
      "coordinates": { "latitude": 31.4504, "longitude": 73.1350 }
    }
  ]
}
```

---

#### 4.7.2 Add New Address

```
POST /users/addresses
```

**Request Body:**
```json
{
  "label": "Office",
  "address": "456 Business Plaza, Canal Road, Faisalabad",
  "icon": "building",
  "isDefault": false,
  "coordinates": {
    "latitude": 31.4279,
    "longitude": 73.0758
  }
}
```

**Response:**
```json
{
  "success": true,
  "address": {
    "id": "addr_2",
    "label": "Office",
    "address": "456 Business Plaza, Canal Road, Faisalabad",
    "icon": "building",
    "isDefault": false,
    "coordinates": { "latitude": 31.4279, "longitude": 73.0758 }
  }
}
```

---

### 4.8 Chat/Messaging

#### 4.8.1 Get Chat Messages

```
GET /chat/{bookingId}/messages
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number |
| limit | number | No | Messages per page |

**Response:**
```json
{
  "success": true,
  "chat": {
    "bookingId": "BK-1707571234567",
    "participants": {
      "user": { "id": "user_123", "name": "Customer Name" },
      "provider": { "id": "prov_123", "name": "Usman Ali", "image": "..." }
    },
    "messages": [
      {
        "id": "msg_1",
        "text": "Hello! I saw your request. I'm available and ready to help.",
        "sender": "provider",
        "timestamp": "2026-02-05T09:30:00Z",
        "status": "read"
      }
    ]
  },
  "pagination": { "currentPage": 1, "totalPages": 1 }
}
```

---

#### 4.8.2 Send Message

```
POST /chat/{bookingId}/messages
```

**Request Body:**
```json
{
  "text": "Thank you! Please come as soon as possible.",
  "sender": "user"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "msg_2",
    "text": "Thank you! Please come as soon as possible.",
    "sender": "user",
    "timestamp": "2026-02-05T09:35:00Z",
    "status": "sent"
  }
}
```

---

## 5. Provider View APIs

### 5.1 Provider Dashboard

#### 5.1.1 Get Dashboard Data

```
GET /provider/dashboard
```

**Response:**
```json
{
  "success": true,
  "dashboard": {
    "profile": {
      "id": "prov_123",
      "name": "Muhammad Ali",
      "avatar": "https://example.com/images/ali.jpg",
      "rating": 4.8,
      "isOnline": true,
      "isPro": true,
      "unreadNotifications": 3
    },
    "stats": {
      "todayJobs": 3,
      "weekJobs": 12,
      "completionRate": 96
    },
    "insights": [
      {
        "id": "1",
        "title": "Weekly Earnings",
        "value": "Rs 45,200",
        "trend": "up",
        "color": "#10B981",
        "bgColor": "#D1FAE5"
      },
      {
        "id": "2",
        "title": "Average Rating",
        "value": "4.8",
        "trend": "up",
        "color": "#F59E0B",
        "bgColor": "#FEF3C7"
      }
    ],
    "jobs": {
      "pending": [
        {
          "id": "job_1",
          "title": "AC Installation",
          "category": "HVAC",
          "customer": "Ahmad Khan",
          "customerAvatar": "https://...",
          "location": "DHA Phase 5, Lahore",
          "date": "2026-02-05",
          "time": "10:00 AM",
          "price": 5000,
          "status": "pending"
        }
      ],
      "today": [],
      "upcoming": []
    },
    "recentActivity": [
      {
        "id": "act_1",
        "type": "job_completed",
        "message": "Completed AC repair for Sara Ahmed",
        "time": "2 hours ago"
      }
    ]
  }
}
```

---

#### 5.1.2 Accept Job Request

```
POST /provider/jobs/{jobId}/accept
```

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "job_1",
    "status": "accepted",
    "customer": {
      "name": "Ahmad Khan",
      "phone": "+923001234567",
      "address": "DHA Phase 5, Lahore",
      "coordinates": { "latitude": 31.5204, "longitude": 74.3587 }
    }
  },
  "message": "Job accepted successfully"
}
```

---

#### 5.1.3 Reject Job Request

```
POST /provider/jobs/{jobId}/reject
```

**Request Body:**
```json
{
  "reason": "Not available at the requested time"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job declined"
}
```

---

### 5.2 Provider Jobs

#### 5.2.1 Get All Jobs

```
GET /provider/jobs
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| status | string | No | `upcoming`, `active`, `completed`, `cancelled`, `all` |
| page | number | No | Page number |
| limit | number | No | Items per page |
| dateFrom | string | No | Filter by start date |
| dateTo | string | No | Filter by end date |

**Response:**
```json
{
  "success": true,
  "jobs": [
    {
      "id": "job_1",
      "title": "AC Installation Service",
      "category": "HVAC",
      "serviceType": "AC Installation",
      "customer": "Ahmad Khan",
      "customerAvatar": "https://...",
      "customerPhone": "+923001234567",
      "location": "DHA Phase 5, Lahore",
      "city": "Lahore",
      "date": "2026-02-05",
      "time": "10:00 AM",
      "price": 5000,
      "status": "upcoming",
      "coordinates": { "latitude": 31.5204, "longitude": 74.3587 }
    }
  ],
  "stats": {
    "total": 87,
    "upcoming": 5,
    "today": 2,
    "completed": 75,
    "cancelled": 5
  },
  "pagination": { "currentPage": 1, "totalPages": 9 }
}
```

---

#### 5.2.2 Get Job Details

```
GET /provider/jobs/{jobId}
```

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "job_1",
    "serviceType": "AC Installation Service",
    "category": "HVAC",
    "customerName": "Ahmad Khan",
    "customerPhone": "+923001234567",
    "customerImage": "https://...",
    "address": "House 123, Street 5, DHA Phase 5",
    "city": "Lahore",
    "date": "2026-02-05",
    "time": "10:00 AM",
    "estimatedPrice": 5000,
    "coordinates": { "latitude": 31.5204, "longitude": 74.3587 },
    "specialInstructions": "Please use the back entrance",
    "status": "ready_to_start"
  }
}
```

---

### 5.3 Job Lifecycle

#### 5.3.1 Start Navigation

```
POST /provider/jobs/{jobId}/start-navigation
```

**Response:**
```json
{
  "success": true,
  "navigation": {
    "destination": { "latitude": 31.5204, "longitude": 74.3587 },
    "destinationAddress": "House 123, Street 5, DHA Phase 5, Lahore",
    "estimatedDistance": "5.2 km",
    "estimatedTime": "15 min"
  }
}
```

---

#### 5.3.2 Update Provider Location

```
POST /provider/location/update
```

**Request Body:**
```json
{
  "jobId": "job_1",
  "latitude": 31.5150,
  "longitude": 74.3550,
  "heading": 45,
  "speed": 25
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location updated"
}
```

---

#### 5.3.3 Mark Arrived

```
POST /provider/jobs/{jobId}/arrived
```

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "job_1",
    "status": "arrived",
    "arrivedAt": "2026-02-05T10:15:00Z"
  }
}
```

---

#### 5.3.4 Start Work

```
POST /provider/jobs/{jobId}/start-work
```

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "job_1",
    "status": "in_progress",
    "workStartedAt": "2026-02-05T10:20:00Z"
  }
}
```

---

#### 5.3.5 Complete Work

```
POST /provider/jobs/{jobId}/complete-work
```

**Request Body:**
```json
{
  "actualDuration": 90,
  "notes": "Replaced compressor and refilled gas"
}
```

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "job_1",
    "status": "awaiting_approval",
    "completedAt": "2026-02-05T11:50:00Z",
    "actualDuration": 90
  }
}
```

---

### 5.4 Payment Request (Provider Side)

#### 5.4.1 Request Payment

```
POST /provider/jobs/{jobId}/request-payment
```

**Request Body:**
```json
{
  "baseCharge": 5000,
  "additionalCharges": 500,
  "materialCost": 1200,
  "totalAmount": 6700,
  "breakdown": {
    "service": 5000,
    "overtime": 500,
    "parts": 1200
  }
}
```

**Response:**
```json
{
  "success": true,
  "paymentRequest": {
    "id": "pay_req_123",
    "jobId": "job_1",
    "totalAmount": 6700,
    "status": "pending",
    "requestedAt": "2026-02-05T12:00:00Z"
  }
}
```

---

#### 5.4.2 Confirm Cash Payment

```
POST /provider/jobs/{jobId}/confirm-cash-payment
```

**Request Body:**
```json
{
  "amount": 6700,
  "receivedAt": "2026-02-05T12:10:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "transactionId": "CASH-1707571234567",
    "amount": 6700,
    "method": "cash",
    "status": "completed"
  }
}
```

---

#### 5.4.3 Check Payment Status

```
GET /provider/jobs/{jobId}/payment-status
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "status": "completed",
    "method": "online",
    "transactionId": "TXN-1707571234567",
    "amount": 6700,
    "receivedAt": "2026-02-05T12:15:00Z"
  }
}
```

---

### 5.5 Provider Earnings

#### 5.5.1 Get Earnings Overview

```
GET /provider/earnings
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| period | string | No | `week`, `month`, `year` |

**Response:**
```json
{
  "success": true,
  "earnings": {
    "totalEarnings": 145600,
    "thisMonthEarnings": 34200,
    "pendingPayouts": 12400,
    "completedJobsCount": 87,
    "monthlyGrowth": 15.3,
    "monthlyData": [
      { "month": "Aug", "amount": 18500, "jobs": 12 },
      { "month": "Sep", "amount": 22100, "jobs": 15 },
      { "month": "Oct", "amount": 28400, "jobs": 18 }
    ],
    "recentPayments": [
      {
        "id": "pmt_1",
        "description": "AC Installation Service",
        "amount": 8500,
        "date": "2026-01-24",
        "status": "completed",
        "type": "earning"
      }
    ],
    "performance": {
      "avgRating": 4.8,
      "onTimeRate": 96,
      "statusTier": "Gold",
      "repeatCustomerRate": 78
    }
  }
}
```

---

#### 5.5.2 Request Payout

```
POST /provider/earnings/payout
```

**Request Body:**
```json
{
  "amount": 10000,
  "bankAccount": {
    "bankName": "HBL",
    "accountNumber": "1234567890",
    "accountTitle": "Muhammad Ali"
  }
}
```

**Response:**
```json
{
  "success": true,
  "payout": {
    "id": "payout_123",
    "amount": 10000,
    "status": "processing",
    "estimatedArrival": "2-3 business days",
    "requestedAt": "2026-02-05T14:00:00Z"
  }
}
```

---

### 5.6 Provider Profile

#### 5.6.1 Get Profile

```
GET /provider/profile
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": "prov_123",
    "name": "Muhammad Ali",
    "email": "muhammad.ali@email.com",
    "phoneNumber": "+923001234567",
    "profileImage": "https://...",
    "category": "electricians",
    "memberSince": "Jan 2024",
    "isVerified": true,
    "stats": {
      "bookings": 12,
      "reviews": 8,
      "points": 240
    },
    "availability": {
      "isAvailable": true,
      "schedule": [...]
    },
    "documents": {
      "nationalIdCard": { "url": "...", "verified": true },
      "professionalCertificate": { "url": "...", "verified": true }
    }
  }
}
```

---

#### 5.6.2 Update Profile

```
PUT /provider/profile
```

**Request Body:**
```json
{
  "name": "Muhammad Ali",
  "phoneNumber": "+923001234567",
  "bio": "Updated bio...",
  "skills": ["AC Installation", "AC Repair", "Gas Refilling"]
}
```

---

#### 5.6.3 Update Availability

```
PUT /provider/availability
```

**Request Body:**
```json
{
  "isAvailable": true,
  "schedule": [
    {
      "day": "Monday",
      "slots": ["09:00 AM - 12:00 PM", "02:00 PM - 06:00 PM"],
      "available": true
    }
  ]
}
```

---

## 6. Admin View APIs

### 6.1 Admin Dashboard

#### 6.1.1 Get Dashboard Stats

```
GET /admin/dashboard/stats
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "totalProviders": 87,
    "pendingProviders": 12,
    "totalPosts": 340,
    "activeUsers": 892,
    "growth": {
      "users": 15.3,
      "providers": 8.7,
      "posts": 12.1
    },
    "providersByType": [
      { "_id": "electricians", "count": 35, "percentage": 40 },
      { "_id": "plumbers", "count": 28, "percentage": 32 },
      { "_id": "ac-repairers", "count": 24, "percentage": 28 }
    ],
    "recentRegistrations": [
      {
        "id": "prov_new_1",
        "fullName": "New Provider",
        "email": "new@email.com",
        "providerType": "electricians",
        "verificationStatus": "pending",
        "createdAt": "2026-02-05T08:00:00Z"
      }
    ]
  }
}
```

---

### 6.2 Provider Management (Admin)

#### 6.2.1 Get All Providers

```
GET /admin/providers
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number |
| limit | number | No | Items per page |
| status | string | No | `pending`, `approved`, `rejected`, `all` |
| providerType | string | No | `electricians`, `plumbers`, `ac-repairers`, `all` |
| search | string | No | Search by name/email |
| isActive | boolean | No | Filter by active status |

**Response:**
```json
{
  "success": true,
  "providers": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 9,
    "totalItems": 87,
    "itemsPerPage": 15
  },
  "stats": {
    "total": 87,
    "pending": 12,
    "approved": 70,
    "rejected": 5,
    "active": 65,
    "inactive": 22
  }
}
```

---

#### 6.2.2 Get Pending Providers

```
GET /admin/providers/pending
```

**Response:**
```json
{
  "success": true,
  "providers": [
    {
      "id": "prov_pending_1",
      "fullName": "Pending Provider",
      "email": "pending@email.com",
      "phoneNumber": "+923001234567",
      "providerType": "electricians",
      "experience": "5+ years",
      "city": "Lahore",
      "documents": {
        "nationalIdCard": { "url": "...", "verified": false },
        "professionalCertificate": { "url": "...", "verified": false }
      },
      "verificationStatus": "pending",
      "createdAt": "2026-02-04T10:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

#### 6.2.3 Get Provider Details (Admin)

```
GET /admin/providers/{providerId}
```

**Response:**
```json
{
  "success": true,
  "provider": {
    "id": "prov_123",
    "fullName": "Provider Name",
    "email": "provider@email.com",
    "phoneNumber": "+923001234567",
    "providerType": "electricians",
    "specialty": "Wiring & Installation",
    "experience": "10+ years",
    "briefDescription": "...",
    "city": "Lahore",
    "address": "...",
    "idNumber": "35201-1234567-1",
    "documents": {
      "nationalIdCard": {
        "name": "National ID Card",
        "url": "https://...",
        "verified": false,
        "uploadedAt": "2026-02-01"
      },
      "professionalCertificate": {
        "name": "Professional Certificate",
        "url": "https://...",
        "verified": false,
        "uploadedAt": "2026-02-01"
      }
    },
    "emailVerified": true,
    "verificationStatus": "pending",
    "isActive": true,
    "ratings": {
      "average": 0,
      "count": 0
    },
    "createdAt": "2026-02-01T10:00:00Z"
  }
}
```

---

#### 6.2.4 Approve Provider

```
PUT /admin/providers/{providerId}/approve
```

**Request Body:**
```json
{
  "adminNotes": "All documents verified. Approved for platform."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Provider approved successfully",
  "provider": {
    "id": "prov_123",
    "verificationStatus": "approved",
    "approvedAt": "2026-02-05T14:00:00Z",
    "approvedBy": "admin_1"
  }
}
```

---

#### 6.2.5 Reject Provider

```
PUT /admin/providers/{providerId}/reject
```

**Request Body:**
```json
{
  "reason": "Invalid professional certificate. Please upload a valid document.",
  "adminNotes": "Certificate appears to be expired"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Provider application rejected",
  "provider": {
    "id": "prov_123",
    "verificationStatus": "rejected",
    "rejectionReason": "Invalid professional certificate...",
    "rejectedAt": "2026-02-05T14:00:00Z"
  }
}
```

---

#### 6.2.6 Deactivate Provider

```
PUT /admin/providers/{providerId}/deactivate
```

**Response:**
```json
{
  "success": true,
  "message": "Provider deactivated"
}
```

---

#### 6.2.7 Activate Provider

```
PUT /admin/providers/{providerId}/activate
```

**Response:**
```json
{
  "success": true,
  "message": "Provider activated"
}
```

---

#### 6.2.8 Delete Provider

```
DELETE /admin/providers/{providerId}
```

**Response:**
```json
{
  "success": true,
  "message": "Provider deleted permanently"
}
```

---

### 6.3 User Management (Admin)

#### 6.3.1 Get All Users

```
GET /admin/users
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number |
| limit | number | No | Items per page |
| search | string | No | Search by name/email |
| isActive | boolean | No | Filter by active status |

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "user_1",
      "fullName": "User Name",
      "email": "user@email.com",
      "phoneNumber": "+923001234567",
      "isActive": true,
      "isVerified": true,
      "emailVerified": true,
      "createdAt": "2026-01-15T10:00:00Z",
      "lastLogin": "2026-02-05T08:00:00Z"
    }
  ],
  "pagination": {...},
  "stats": {
    "total": 1250,
    "active": 892,
    "inactive": 358
  }
}
```

---

#### 6.3.2 Get User Details

```
GET /admin/users/{userId}
```

---

#### 6.3.3 Deactivate User

```
PUT /admin/users/{userId}/deactivate
```

---

#### 6.3.4 Activate User

```
PUT /admin/users/{userId}/activate
```

---

#### 6.3.5 Delete User

```
DELETE /admin/users/{userId}
```

---

### 6.4 Admin Notifications

#### 6.4.1 Get Notifications

```
GET /admin/notifications
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number |
| limit | number | No | Items per page |
| type | string | No | Notification type filter |
| read | boolean | No | Filter by read status |

---

#### 6.4.2 Mark Notification Read

```
PUT /admin/notifications/{notificationId}/read
```

---

#### 6.4.3 Send Notification

```
POST /admin/notifications/send
```

**Request Body:**
```json
{
  "title": "Platform Update",
  "message": "New features have been added...",
  "targetType": "all" | "users" | "providers",
  "targetIds": ["user_1", "user_2"]
}
```

---

### 6.5 Admin Settings

#### 6.5.1 Get Settings

```
GET /admin/settings
```

**Response:**
```json
{
  "success": true,
  "settings": {
    "platformName": "MetroMatrix",
    "commissionRate": 10,
    "minBookingAmount": 500,
    "maxRadius": 50,
    "supportEmail": "support@metromatrix.com",
    "supportPhone": "+92300XXXXXXX",
    "maintenanceMode": false
  }
}
```

---

#### 6.5.2 Update Settings

```
PUT /admin/settings
```

**Request Body:**
```json
{
  "commissionRate": 12,
  "minBookingAmount": 1000
}
```

---

## 7. Real-time Features

### 7.1 WebSocket Events

For real-time features, implement WebSocket connections with the following events:

#### Provider to User Events:
| Event | Description | Payload |
|-------|-------------|---------|
| `booking:accepted` | Provider accepted booking | `{ bookingId, providerId, estimatedArrival }` |
| `booking:rejected` | Provider rejected booking | `{ bookingId, reason }` |
| `location:update` | Provider location update | `{ bookingId, latitude, longitude, heading }` |
| `status:arrived` | Provider arrived | `{ bookingId, arrivedAt }` |
| `status:in_progress` | Work started | `{ bookingId, startedAt }` |
| `status:completed` | Work completed | `{ bookingId, completedAt }` |
| `payment:received` | Payment received | `{ bookingId, transactionId, amount }` |
| `message:new` | New chat message | `{ bookingId, message }` |

#### User to Provider Events:
| Event | Description | Payload |
|-------|-------------|---------|
| `booking:cancelled` | User cancelled booking | `{ bookingId, reason }` |
| `payment:completed` | Payment completed | `{ bookingId, transactionId }` |
| `approval:granted` | User approved work | `{ bookingId, approvedAt }` |
| `message:new` | New chat message | `{ bookingId, message }` |

### 7.2 Push Notifications

| Notification Type | Recipient | Trigger |
|-------------------|-----------|---------|
| `new_booking` | Provider | New booking request |
| `booking_confirmed` | User | Provider accepted |
| `provider_arriving` | User | Provider is 5 min away |
| `provider_arrived` | User | Provider arrived |
| `work_completed` | User | Service completed |
| `payment_received` | Provider | Payment successful |
| `new_review` | Provider | User left a review |

---

## 8. Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": {}
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or expired token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `DUPLICATE_ENTRY` | 409 | Resource already exists |
| `PROVIDER_UNAVAILABLE` | 400 | Provider not available |
| `BOOKING_CANCELLED` | 400 | Booking was cancelled |
| `PAYMENT_FAILED` | 400 | Payment processing failed |
| `INTERNAL_ERROR` | 500 | Server error |

### Example Error Response

```json
{
  "success": false,
  "error": "PROVIDER_UNAVAILABLE",
  "message": "The selected provider is not available at the requested time",
  "details": {
    "providerId": "prov_123",
    "requestedTime": "10:00 AM",
    "nextAvailable": "02:00 PM"
  }
}
```

---

## Notes for Backend Implementation

1. **Authentication**: Use JWT tokens with refresh token mechanism
2. **Rate Limiting**: Implement rate limiting for all endpoints
3. **Pagination**: Use cursor-based pagination for large lists
4. **Caching**: Cache provider lists and static data
5. **Real-time**: Use Socket.io or similar for WebSocket implementation
6. **File Upload**: Use Cloudinary or S3 for document/image uploads
7. **Geolocation**: Use MongoDB geospatial queries for location-based searches
8. **Notifications**: Use Firebase Cloud Messaging for push notifications

---

**Document Version**: 1.0.0  
**Last Updated**: February 5, 2026  
**Author**: MetroMatrix Development Team

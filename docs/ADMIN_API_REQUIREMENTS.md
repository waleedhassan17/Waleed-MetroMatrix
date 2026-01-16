# MetroMatrix Admin API Requirements

**Generated for Frontend Compatibility**  
**Date:** December 9, 2025  
**Base URL:** `https://metromatrix-api-2e35f5f074df.herokuapp.com/api`

---

## Table of Contents

1. [Authentication APIs](#1-authentication-apis)
2. [Dashboard APIs](#2-dashboard-apis)
3. [User Management APIs](#3-user-management-apis)
4. [Provider Management APIs](#4-provider-management-apis)
5. [Notification APIs](#5-notification-apis)
6. [Settings APIs](#6-settings-apis)
7. [Common Response Schemas](#7-common-response-schemas)
8. [Database Schemas](#8-database-schemas)

---

## 1. Authentication APIs

### 1.1 Admin Login
```
POST /admin/auth/login
```

**Request Body:**
```json
{
  "email": "admin@metromatrix.com",
  "password": "password123"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Admin login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "admin": {
    "id": "admin_id",
    "_id": "admin_id",
    "email": "admin@metromatrix.com",
    "fullName": "Admin User",
    "role": "super_admin",
    "avatar": "https://cloudinary.com/avatar.jpg",
    "permissions": {
      "canApproveProviders": true,
      "canManageUsers": true,
      "canManagePosts": true,
      "canViewAnalytics": true,
      "canManageSettings": true,
      "canSendNotifications": true
    },
    "isActive": true,
    "lastLoginDate": "2025-12-09T10:30:00Z",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-12-09T10:30:00Z"
  }
}
```

**Error Responses:**
```json
// 401 - Invalid credentials
{
  "success": false,
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}

// 403 - Account inactive
{
  "success": false,
  "error": "ACCOUNT_INACTIVE",
  "message": "Your admin account has been deactivated"
}
```

---

### 1.2 Admin Logout
```
POST /admin/auth/logout
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 1.3 Refresh Token
```
POST /auth/refresh-token
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "accessToken": "new_access_token",
  "refreshToken": "new_refresh_token"
}
```

---

### 1.4 Get Admin Profile
```
GET /admin/profile
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "admin": {
    "id": "admin_id",
    "_id": "admin_id",
    "email": "admin@metromatrix.com",
    "fullName": "Admin User",
    "role": "super_admin",
    "avatar": "https://cloudinary.com/avatar.jpg",
    "permissions": {
      "canApproveProviders": true,
      "canManageUsers": true,
      "canManagePosts": true,
      "canViewAnalytics": true,
      "canManageSettings": true,
      "canSendNotifications": true
    },
    "isActive": true,
    "lastLoginDate": "2025-12-09T10:30:00Z",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

---

## 2. Dashboard APIs

### 2.1 Get Dashboard Stats ⭐ CRITICAL
```
GET /admin/dashboard/stats
Authorization: Bearer <admin_token>
```

**Expected Response (200):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1250,
    "totalProviders": 340,
    "pendingProviders": 15,
    "totalPosts": 890,
    "activeUsers": 45,
    "growth": {
      "users": 12.5,
      "providers": 8.3,
      "posts": 15.2
    },
    "recentRegistrations": [
      {
        "id": "provider_id",
        "_id": "provider_id",
        "fullName": "Dr. Ahmed Khan",
        "email": "ahmed@example.com",
        "providerType": "doctor",
        "specialty": "Cardiologist",
        "subType": null,
        "verificationStatus": "pending",
        "createdAt": "2025-12-09T10:30:00Z",
        "avatar": "https://cloudinary.com/avatar.jpg"
      }
    ]
  }
}
```

**Frontend Transformation Note:**
The frontend transforms this into:
```typescript
{
  users: {
    total: data.totalUsers,
    active: data.activeUsers,
    inactive: data.totalUsers - data.activeUsers,
    newThisMonth: 0,
    growthPercentage: data.growth.users
  },
  providers: {
    total: data.totalProviders,
    pending: data.pendingProviders,
    approved: data.totalProviders - data.pendingProviders,
    rejected: 0,
    growthPercentage: data.growth.providers,
    byType: []
  },
  posts: {
    total: data.totalPosts,
    thisMonth: 0
  },
  quickStats: {
    online: data.activeUsers,
    pendingReviews: data.pendingProviders
  }
}
```

---

### 2.2 Get Recent Registrations
```
GET /admin/dashboard/recent-registrations?limit=10
Authorization: Bearer <admin_token>
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | number | 10 | Number of recent registrations |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "provider_id",
      "_id": "provider_id",
      "fullName": "Dr. Ahmed Khan",
      "email": "ahmed@example.com",
      "providerType": "doctor",
      "specialty": "Cardiologist",
      "subType": null,
      "verificationStatus": "pending",
      "createdAt": "2025-12-09T10:30:00Z",
      "avatar": null
    }
  ]
}
```

---

### 2.3 Get Quick Stats
```
GET /admin/dashboard/quick-stats
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "online": 45,
    "pendingReviews": 15,
    "todayRegistrations": 5,
    "activeProviders": 320
  }
}
```

---

## 3. User Management APIs

### 3.1 Get All Users
```
GET /admin/users?page=1&limit=15&search=john&isActive=true
Authorization: Bearer <admin_token>
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 15 | Items per page |
| search | string | - | Search by name/email |
| isActive | boolean | - | Filter by active status |
| sortBy | string | createdAt | Sort field |
| sortOrder | string | desc | Sort order (asc/desc) |

**Response (200):**
```json
{
  "success": true,
  "users": [
    {
      "id": "user_id",
      "_id": "user_id",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "03001234567",
      "profileImage": "https://cloudinary.com/profile.jpg",
      "isActive": true,
      "isVerified": true,
      "emailVerified": true,
      "address": {
        "street": "123 Main St",
        "city": "Lahore",
        "state": "Punjab",
        "country": "Pakistan",
        "zipCode": "54000"
      },
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-12-09T10:30:00Z",
      "lastLogin": "2025-12-09T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 15,
    "total": 150,
    "pages": 10,
    "hasNext": true,
    "hasPrev": false
  },
  "stats": {
    "total": 150,
    "active": 140,
    "inactive": 10
  }
}
```

---

### 3.2 Get User Details
```
GET /admin/users/:userId
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "_id": "user_id",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "03001234567",
    "profileImage": "https://cloudinary.com/profile.jpg",
    "isActive": true,
    "isVerified": true,
    "emailVerified": true,
    "address": {
      "street": "123 Main St",
      "city": "Lahore",
      "state": "Punjab",
      "country": "Pakistan",
      "zipCode": "54000"
    },
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-12-09T10:30:00Z",
    "lastLogin": "2025-12-09T08:00:00Z"
  }
}
```

---

### 3.3 Activate User
```
PUT /admin/users/:userId/activate
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "User activated successfully"
}
```

---

### 3.4 Deactivate User
```
PUT /admin/users/:userId/deactivate
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

---

### 3.5 Delete User
```
DELETE /admin/users/:userId
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## 4. Provider Management APIs

### 4.1 Get All Providers
```
GET /admin/providers?page=1&limit=15&status=pending&providerType=doctor&search=ahmed
Authorization: Bearer <admin_token>
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 15 | Items per page |
| status | string | all | pending/approved/rejected/suspended/all |
| providerType | string | all | doctor/home_service/vendor/all |
| search | string | - | Search by name/email |
| isActive | boolean | - | Filter by active status |
| sortBy | string | createdAt | Sort field |
| sortOrder | string | desc | Sort order |

**Response (200):**
```json
{
  "success": true,
  "providers": [
    {
      "id": "provider_id",
      "_id": "provider_id",
      "email": "ahmed@example.com",
      "fullName": "Dr. Ahmed Khan",
      "phoneNumber": "03001234567",
      "providerType": "doctor",
      "providerSubType": null,
      "specialty": "Cardiologist",
      "profession": null,
      "category": null,
      "experience": "10 years",
      "briefDescription": "Experienced cardiologist with 10+ years...",
      "rate": null,
      "consultationFee": 2000,
      "professionalName": "Heart Care Clinic",
      "businessName": null,
      "city": "Lahore",
      "address": "123 Medical Center",
      "coordinates": {
        "lat": 31.5204,
        "lng": 74.3587
      },
      "idNumber": "35201-1234567-1",
      "documents": {
        "medicalLicense": {
          "name": "medical_license.pdf",
          "url": "https://cloudinary.com/docs/license.pdf",
          "publicId": "docs/license_abc123",
          "uploadedAt": "2025-12-01T10:00:00Z",
          "verified": false,
          "verifiedAt": null,
          "verifiedBy": null
        },
        "degreeCertificate": {
          "name": "degree.pdf",
          "url": "https://cloudinary.com/docs/degree.pdf",
          "publicId": "docs/degree_abc123",
          "uploadedAt": "2025-12-01T10:00:00Z",
          "verified": false,
          "verifiedAt": null,
          "verifiedBy": null
        },
        "nationalIdCard": {
          "name": "cnic.jpg",
          "url": "https://cloudinary.com/docs/cnic.jpg",
          "publicId": "docs/cnic_abc123",
          "uploadedAt": "2025-12-01T10:00:00Z",
          "verified": false,
          "verifiedAt": null,
          "verifiedBy": null
        }
      },
      "ratings": {
        "average": 4.5,
        "count": 25
      },
      "profileComplete": true,
      "emailVerified": true,
      "verificationStatus": "pending",
      "adminVerified": "pending",
      "rejectionReason": null,
      "isActive": true,
      "createdAt": "2025-12-01T10:00:00Z",
      "updatedAt": "2025-12-09T10:30:00Z",
      "approvedAt": null,
      "approvedBy": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 15,
    "total": 50,
    "pages": 4,
    "hasNext": true,
    "hasPrev": false
  },
  "stats": {
    "total": 50,
    "pending": 15,
    "approved": 30,
    "rejected": 5,
    "active": 28,
    "inactive": 2
  }
}
```

---

### 4.2 Get Pending Providers ⭐ CRITICAL
```
GET /admin/providers/pending?page=1&limit=15&providerType=doctor
Authorization: Bearer <admin_token>
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 15 | Items per page |
| providerType | string | - | doctor/home_service/vendor |

**Response (200):**
Same as Get All Providers, but only returns providers with `verificationStatus: "pending"`

---

### 4.3 Get Provider Details
```
GET /admin/providers/:providerId
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "provider": {
    // Full provider object as shown in 4.1
  }
}
```

---

### 4.4 Approve Provider ⭐ CRITICAL
```
PUT /admin/providers/:providerId/approve
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "adminNotes": "All documents verified successfully"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Provider approved successfully",
  "data": {
    "id": "provider_id",
    "verificationStatus": "approved",
    "adminVerified": "active",
    "approvedAt": "2025-12-09T10:30:00Z",
    "approvedBy": "admin_id"
  }
}
```

---

### 4.5 Reject Provider ⭐ CRITICAL
```
PUT /admin/providers/:providerId/reject
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "reason": "Documents are unclear. Please resubmit with better quality images."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Provider rejected successfully",
  "data": {
    "id": "provider_id",
    "verificationStatus": "rejected",
    "adminVerified": "inactive",
    "rejectionReason": "Documents are unclear...",
    "rejectedAt": "2025-12-09T10:30:00Z"
  }
}
```

---

### 4.6 Activate Provider
```
PUT /admin/providers/:providerId/activate
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Provider activated successfully"
}
```

---

### 4.7 Deactivate Provider
```
PUT /admin/providers/:providerId/deactivate
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Provider deactivated successfully"
}
```

---

### 4.8 Delete Provider
```
DELETE /admin/providers/:providerId
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Provider deleted successfully"
}
```

---

## 5. Notification APIs

### 5.1 Get Notifications
```
GET /admin/notifications?page=1&limit=20&isRead=false
Authorization: Bearer <admin_token>
```

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| isRead | boolean | - | Filter by read status |
| type | string | - | Filter by notification type |

**Response (200):**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notification_id",
      "_id": "notification_id",
      "type": "provider_registration",
      "title": "New Provider Registration",
      "message": "Dr. Ahmed Khan has registered as a doctor and is awaiting approval",
      "data": {
        "providerId": "provider_id",
        "providerType": "doctor",
        "actionUrl": "/admin/providers/provider_id"
      },
      "isRead": false,
      "createdAt": "2025-12-09T10:30:00Z",
      "readAt": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "unreadCount": 15
}
```

**Notification Types:**
- `provider_registration` - New provider registered
- `provider_approved` - Provider was approved
- `provider_rejected` - Provider was rejected
- `user_registration` - New user registered
- `system_alert` - System alerts
- `report` - User reports

---

### 5.2 Get Unread Count
```
GET /admin/notifications/unread-count
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "unreadCount": 15
}
```

---

### 5.3 Mark Notification as Read
```
PUT /admin/notifications/:notificationId/read
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

### 5.4 Mark All Notifications as Read
```
PUT /admin/notifications/read-all
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

### 5.5 Delete Notification
```
DELETE /admin/notifications/:notificationId
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

### 5.6 Clear All Notifications
```
DELETE /admin/notifications/clear-all
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "All notifications cleared"
}
```

---

## 6. Settings APIs

### 6.1 Get Settings
```
GET /admin/settings
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "success": true,
  "settings": {
    "general": {
      "appName": "MetroMatrix",
      "appVersion": "1.0.0",
      "platformName": "MetroMatrix",
      "contactEmail": "support@metromatrix.com",
      "supportPhone": "+92-300-1234567",
      "autoApproveProviders": false,
      "requireEmailVerification": true,
      "maintenanceMode": false,
      "maintenanceMessage": ""
    },
    "notifications": {
      "emailNotifications": true,
      "pushNotifications": true,
      "smsNotifications": true,
      "notifyOnNewProvider": true,
      "notifyOnNewUser": true,
      "dailyDigest": false,
      "providerRegistrations": true,
      "userRegistrations": true,
      "systemAlerts": true,
      "weeklyReports": false
    },
    "providers": {
      "autoApproveProviders": false,
      "requireDocumentVerification": true,
      "maxPendingDays": 7,
      "allowedProviderTypes": ["doctor", "home_service", "vendor"]
    },
    "security": {
      "sessionTimeout": 30,
      "maxLoginAttempts": 5,
      "requireTwoFactor": false,
      "twoFactorEnabled": false,
      "passwordMinLength": 8,
      "passwordExpiry": 90
    },
    "appearance": {
      "theme": "light",
      "primaryColor": "#6366f1"
    }
  }
}
```

---

### 6.2 Update Settings Section
```
PUT /admin/settings/:section
Authorization: Bearer <admin_token>
```

Where `:section` can be: `general`, `notifications`, `providers`, `security`, `appearance`

**Request Body (example for general):**
```json
{
  "appName": "MetroMatrix",
  "maintenanceMode": true,
  "maintenanceMessage": "System under maintenance"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "settings": {
    // Updated settings object
  }
}
```

---

### 6.3 Update Admin Profile
```
PUT /admin/profile
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "fullName": "Updated Admin Name",
  "email": "newemail@metromatrix.com",
  "avatar": "https://cloudinary.com/new-avatar.jpg"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

---

### 6.4 Change Admin Password
```
PUT /admin/change-password
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

## 7. Common Response Schemas

### Success Response
```json
{
  "success": true,
  "message": "Operation description",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable error message"
}
```

### Pagination Object
```json
{
  "page": 1,
  "limit": 15,
  "total": 150,
  "pages": 10,
  "hasNext": true,
  "hasPrev": false
}
```

---

## 8. Database Schemas

### Admin Schema (MongoDB)
```javascript
const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['super_admin', 'admin', 'moderator'],
    default: 'admin'
  },
  avatar: { type: String },
  permissions: {
    canApproveProviders: { type: Boolean, default: true },
    canManageUsers: { type: Boolean, default: true },
    canManagePosts: { type: Boolean, default: true },
    canViewAnalytics: { type: Boolean, default: true },
    canManageSettings: { type: Boolean, default: false },
    canSendNotifications: { type: Boolean, default: true }
  },
  isActive: { type: Boolean, default: true },
  lastLoginDate: { type: Date },
  refreshToken: { type: String }
}, { timestamps: true });
```

### User Schema (MongoDB)
```javascript
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String },
  profileImage: { type: String },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  lastLogin: { type: Date },
  refreshToken: { type: String }
}, { timestamps: true });
```

### Provider Schema (MongoDB)
```javascript
const providerSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  
  providerType: { 
    type: String, 
    enum: ['doctor', 'home_service', 'vendor'],
    required: true
  },
  providerSubType: { type: String },
  
  // Doctor specific
  specialty: { type: String },
  professionalName: { type: String },
  consultationFee: { type: Number },
  
  // Home Service specific
  profession: { type: String },
  rate: { type: String },
  
  // Vendor specific
  category: { type: String },
  businessName: { type: String },
  
  // Common fields
  experience: { type: String, required: true },
  briefDescription: { type: String },
  
  city: { type: String, required: true },
  address: { type: String },
  coordinates: {
    lat: Number,
    lng: Number
  },
  
  idNumber: { type: String, required: true },
  
  documents: {
    medicalLicense: {
      name: String,
      url: String,
      publicId: String,
      uploadedAt: Date,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
    },
    degreeCertificate: { /* same structure */ },
    professionalCertificate: { /* same structure */ },
    businessLicense: { /* same structure */ },
    nationalIdCard: { /* same structure */ },
    profilePhoto: { /* same structure */ }
  },
  
  ratings: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  
  profileComplete: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  adminVerified: {
    type: String,
    enum: ['pending', 'active', 'inactive'],
    default: 'pending'
  },
  rejectionReason: { type: String },
  isActive: { type: Boolean, default: true },
  
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  
  refreshToken: { type: String }
}, { timestamps: true });
```

### AdminNotification Schema (MongoDB)
```javascript
const adminNotificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'provider_registration',
      'provider_approved',
      'provider_rejected',
      'user_registration',
      'system_alert',
      'report'
    ],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
    actionUrl: String
  },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date }
}, { timestamps: true });
```

### AppSettings Schema (MongoDB)
```javascript
const appSettingsSchema = new mongoose.Schema({
  general: {
    appName: { type: String, default: 'MetroMatrix' },
    appVersion: { type: String, default: '1.0.0' },
    platformName: { type: String, default: 'MetroMatrix' },
    contactEmail: { type: String },
    supportPhone: { type: String },
    autoApproveProviders: { type: Boolean, default: false },
    requireEmailVerification: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String }
  },
  notifications: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: true },
    notifyOnNewProvider: { type: Boolean, default: true },
    notifyOnNewUser: { type: Boolean, default: true },
    dailyDigest: { type: Boolean, default: false },
    providerRegistrations: { type: Boolean, default: true },
    userRegistrations: { type: Boolean, default: true },
    systemAlerts: { type: Boolean, default: true },
    weeklyReports: { type: Boolean, default: false }
  },
  providers: {
    autoApproveProviders: { type: Boolean, default: false },
    requireDocumentVerification: { type: Boolean, default: true },
    maxPendingDays: { type: Number, default: 7 },
    allowedProviderTypes: [{ type: String }]
  },
  security: {
    sessionTimeout: { type: Number, default: 30 },
    maxLoginAttempts: { type: Number, default: 5 },
    requireTwoFactor: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    passwordMinLength: { type: Number, default: 8 },
    passwordExpiry: { type: Number, default: 90 }
  },
  appearance: {
    theme: { 
      type: String, 
      enum: ['light', 'dark', 'system'],
      default: 'light'
    },
    primaryColor: { type: String, default: '#6366f1' }
  }
}, { timestamps: true });
```

---

## Quick Reference - All Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/auth/login` | Admin login |
| POST | `/admin/auth/logout` | Admin logout |
| POST | `/auth/refresh-token` | Refresh tokens |
| GET | `/admin/profile` | Get admin profile |
| PUT | `/admin/profile` | Update admin profile |
| PUT | `/admin/change-password` | Change password |
| GET | `/admin/dashboard/stats` | Dashboard statistics |
| GET | `/admin/dashboard/recent-registrations` | Recent registrations |
| GET | `/admin/dashboard/quick-stats` | Quick stats |
| GET | `/admin/users` | List all users |
| GET | `/admin/users/:id` | Get user details |
| PUT | `/admin/users/:id/activate` | Activate user |
| PUT | `/admin/users/:id/deactivate` | Deactivate user |
| DELETE | `/admin/users/:id` | Delete user |
| GET | `/admin/providers` | List all providers |
| GET | `/admin/providers/pending` | List pending providers |
| GET | `/admin/providers/:id` | Get provider details |
| PUT | `/admin/providers/:id/approve` | Approve provider |
| PUT | `/admin/providers/:id/reject` | Reject provider |
| PUT | `/admin/providers/:id/activate` | Activate provider |
| PUT | `/admin/providers/:id/deactivate` | Deactivate provider |
| DELETE | `/admin/providers/:id` | Delete provider |
| GET | `/admin/notifications` | List notifications |
| GET | `/admin/notifications/unread-count` | Get unread count |
| PUT | `/admin/notifications/:id/read` | Mark as read |
| PUT | `/admin/notifications/read-all` | Mark all as read |
| DELETE | `/admin/notifications/:id` | Delete notification |
| DELETE | `/admin/notifications/clear-all` | Clear all |
| GET | `/admin/settings` | Get all settings |
| PUT | `/admin/settings/:section` | Update settings section |

---

*Generated for MetroMatrix Frontend v73*

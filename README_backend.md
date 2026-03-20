# Service NSW — Backend API Contract

This document defines every endpoint the mobile app calls.
Implement this on any stack (Node/Express, Django, Laravel, etc.).

---

## Base URL

Set `API_BASE_URL` in `api.js` to your server, e.g.:
```
https://api.yourserver.com/v1
```
For local development use `http://localhost:3000/v1` (or your tunnel URL).

---

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <token>
```

Tokens are issued by `POST /auth/pin` and expire after 24 h.
On 401 the app clears the stored token and redirects to PinLoginScreen.

---

## Endpoints

### 1. POST `/auth/pin`
Authenticate a user with their numeric PIN.

**Request body**
```json
{
  "pin": "1234"
}
```

**Success 200**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": "user_001",
    "firstName": "Vincent",
    "lastName": "BARR",
    "dateOfBirth": "14 January 2005",
    "address": "43 MAIN AVE,\nRANDWICK NSW\n2031",
    "email": "vincent.barr@example.com",
    "phone": "0412 345 678",
    "profilePhotoUrl": "https://your-cdn.com/photos/user_001_profile.jpg",
    "signaturePhotoUrl": "https://your-cdn.com/photos/user_001_signature.png"
  }
}
```

**Error 401**
```json
{ "error": "Invalid PIN" }
```

**Error 429**
```json
{ "error": "Too many attempts. Try again in 15 minutes." }
```

---

### 2. GET `/user/me`
Returns the currently authenticated user's profile.
Identical shape to the `user` object in `POST /auth/pin`.

**Headers:** `Authorization: Bearer <token>`

**Success 200** — same `user` object as above.

---

### 3. GET `/user/me/licences`
Returns all licences held by the authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Success 200**
```json
{
  "licences": [
    {
      "id": "lic_001",
      "type": "driverLicence",
      "label": "Driver Licence",
      "licenceNumber": "90876543",
      "cardNumber": "7621538941",
      "expiry": "15 July 2028",
      "expiryShort": "15 July 2028",
      "licenceClass": "C",
      "conditions": "None",
      "status": "active"
    },
    {
      "id": "lic_002",
      "type": "workingWithChildren",
      "label": "Working with Children",
      "licenceNumber": "WWC1234567",
      "cardNumber": "",
      "expiry": "14 Aug 2026",
      "expiryShort": "14 Aug 2026",
      "licenceClass": null,
      "conditions": null,
      "status": "active"
    }
  ]
}
```

**Licence `status` values:**
- `"active"` — valid
- `"suspended"` — suspended by authority
- `"expired"` — past expiry date

**Licence `type` values:**
- `"driverLicence"`
- `"workingWithChildren"`
- `"firearmLicence"`
- (extend as needed)

---

### 4. GET `/user/me/licences/:licenceId/qr`
Returns a fresh, time-limited QR code image URL for the specified licence.
QR codes should expire after 5 minutes so they can't be screenshotted and reused.

**Headers:** `Authorization: Bearer <token>`

**Success 200**
```json
{
  "qrCodeUrl": "https://your-cdn.com/qr/user_001_lic_001_1716000000.png",
  "expiresAt": "2024-05-18T12:05:00Z"
}
```

---

### 5. PATCH `/user/me`
Update user profile fields.

**Headers:** `Authorization: Bearer <token>`

**Request body** (all fields optional)
```json
{
  "email": "new.email@example.com",
  "phone": "0400 111 222",
  "address": "99 NEW ST,\nSYDNEY NSW\n2000"
}
```

**Success 200** — updated `user` object.

---

### 6. POST `/auth/logout`
Invalidates the current token server-side.

**Headers:** `Authorization: Bearer <token>`

**Success 200**
```json
{ "success": true }
```

---

## Photo storage

Profile photos and signatures are stored on your CDN/object-store (S3, GCS, Cloudflare R2, etc.).
The app fetches them via signed HTTPS URLs returned in the user object.

Recommended specs:
- Profile photo: JPEG, max 500 × 640 px, max 150 KB
- Signature:     PNG (transparent bg), max 240 × 120 px, max 50 KB

---

## Error envelope

All error responses follow:
```json
{ "error": "Human-readable message" }
```

HTTP status codes used: `200`, `400`, `401`, `403`, `404`, `422`, `429`, `500`.

---

## Rate limiting

Recommended limits (adjust to taste):
- `POST /auth/pin`: 5 attempts per 15 min per IP
- All other endpoints: 60 req/min per token

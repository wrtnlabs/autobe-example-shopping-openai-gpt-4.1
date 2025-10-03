# User Roles and Authentication Requirements

## 1. User Role Taxonomy

The system distinctly identifies three user roles, with clear separation of responsibilities, escalation paths, and access:

### 1.1 Customer
- Can browse products, place orders, use cart and checkout, manage personal addresses, view purchase history.
- Can use discount coupons, deposits, and mileage, accrue or spend them, and review account balances.
- May favorite products/inquiries/addresses, post product inquiries or leave reviews, and receive recommendations.
- Can apply for seller permission or escalate to higher privileges, subject to approval.

### 1.2 Seller
- Inherits all customer permissions.
- Can register and manage products (bundles, variants, content, pricing, inventory).
- Can view and manage orders for their listed products, process fulfillment, handle returns/exchanges, and track order states.
- Can answer inquiries for their products, interact with customers via comments, and moderate own product-related boards.
- Can issue and manage discount coupons for their products; access analytics on sales and coupon use.

### 1.3 Admin
- Global platform authority: can manage all users, sellers, and products.
- Can audit, update, or deactivate any account or entity.
- Configures platform-wide settings: channel/section structure, business rules, compliance and moderation policies.
- Access to all analytics, audit logs, and evidence retention features.
- Can manage all coupon, deposit, mileage, and promotional campaigns for the platform.

### 1.4 External & Guest Access
- Users can browse product listings and access legal/compliance documents as guests.
- Actions requiring stateful access (cart persistence, orders, coupons, personalization) require authentication.
- Supports external/OAuth login/registration, with mapping to customer role and optional future SSO upgrades.

## 2. Authentication and Authorization Flow

### 2.1 Registration and Identity Verification
- THE system SHALL allow new customers to register with email (mandatory, supports multiple emails per account), password, and verified mobile/contact identity.
- WHEN a user requests registration, THE system SHALL verify provided identity information per locale/legal requirements (mobile/real-name, encrypted storage, international flows where applicable).
- THE system SHALL support external authentication providers (Google, Apple, Kakao, Naver, etc.), permitting account creation upon successful third-party identity validation.

### 2.2 Login, Session, and Multi-Device Tokens
- THE system SHALL support standard email/password login with secure password hashes (never in plain text).
- THE system SHALL support external OAuth login, linking external IDs to an internal unified identity, maintaining audit history of linked/unlinked events.
- WHEN login succeeds, THE system SHALL issue a new JWT access token (lifetime: 15-30 minutes) and a JWT refresh token (lifetime: 7-30 days).
- THE system SHALL enforce single-session invalidation on logout or credential reset (revoke all device tokens on password change or explicit session revocation).
- WHEN multiple devices are used, THE system SHALL allow revocation of other device sessions individually or globally.

### 2.3 Authorization and Role Escalation
- WHEN a customer applies for seller/administrator access, THE system SHALL enforce an approval workflow, including verification steps (identity, business validation, KYC/AML for sellers, stricter checks for admins).
- THE system SHALL block all seller/admin actions unless explicit approval was granted and recorded.
- WHEN role escalation is denied, THE system SHALL record the decision and notify the applicant with rejection reason.

### 2.4 Password and Account Security Management
- THE system SHALL support secure password reset workflows, requiring identity verification.
- IF login or password reset attempts exceed system threshold, THEN THE system SHALL temporarily lock the account and provide a clear recovery flow.
- THE system SHALL require re-authentication before performing critical security-sensitive actions (email/phone change, role escalation).

### 2.5 External Identity Verification
- WHERE required by law or by platform policy, THE system SHALL capture and retain KYC/AML verification status, and escalate to admins upon suspicious activity.

## 3. Role-Based Access and Actions

### 3.1 Action Permissions
- THE customer SHALL access public product listings, search, legal/compliance resources, and personalized feeds.
- THE customer SHALL manage cart, orders, address book, and favored items.
- THE seller SHALL register products, manage inventory/pricing/content, view/manage order flows for their products, process after-sales actions, answer product inquiries, and issue coupons (restricted to own products).
- THE admin SHALL perform actions on any user, seller, product, coupon, section/category/channel, order, or campaign.
- THE admin SHALL enforce moderation, configuration, audit, and compliance operations platform-wide.

### 3.2 Approval, Moderation, and Escalation
- WHEN a customer applies to become seller/admin, THE system SHALL require admin approval, KYC/business proof, and perform final role assignment only upon explicit sign-off.
- WHEN abusive, fraudulent, or suspicious behavior is detected, THE system SHALL enable admins to restrict, lock, or demote accounts, preserving full audit trails.

## 4. Permission Matrix

| Business Function                    | Customer | Seller | Admin |
|--------------------------------------|----------|--------|-------|
| Browse/Search Products               | ✅       | ✅     | ✅    |
| Place Order                         | ✅       | ✅     | ✅    |
| Manage Cart/Addresses/Favorites      | ✅       | ✅     | ✅    |
| Register/Manage Products             | ❌       | ✅     | ✅    |
| Manage Their Orders                  | ✅       | ✅     | ✅    |
| Manage All Orders                    | ❌       | ❌     | ✅    |
| Issue/Manage Coupons                 | ❌       | ✅     | ✅    |
| Access Analytics for Own Sales       | ❌       | ✅     | ✅    |
| Access Platform-wide Analytics       | ❌       | ❌     | ✅    |
| Answer Product Inquiries             | ❌       | ✅     | ✅    |
| Moderate All Posts/Reviews           | ❌       | ❌     | ✅    |
| Configure Channels/Sections/Categories| ❌      | ❌     | ✅    |
| User/Seller/Admin Lifecycle Management| ❌      | ❌     | ✅    |
| Full Audit/Compliance                | ❌       | ❌     | ✅    |
| Account Security and Lock            | 🟡       | 🟡     | ✅    |

*Legend: ✅ Allowed | ❌ Not Allowed | 🟡 Self only*

## 5. Token & Session Management

### 5.1 JWT Structure & Expiry
- JWT access tokens SHALL include userId, current role(s), permission array, and session/device ID. Tokens expire in 15-30 minutes.
- Refresh tokens SHALL be issued per device and expire in 7-30 days.
- THE system SHALL use server-held secret key for JWT signing. Secret rotation policies SHALL be in place.
- JWT payload SHALL not contain passwords or sensitive identification like passport/social security numbers.

### 5.2 Token and Session Lifecycle
- WHEN a session expires or is revoked, THE system SHALL enforce re-authentication.
- THE system SHALL allow listing all active sessions/devices and enable users to revoke those independently.
- IF suspicious device activity is detected, THEN THE system SHALL prompt the user for re-verification and optionally lock the session.
- THE system SHALL retain session and device login metadata (IP, device type, time) for security monitoring.

## 6. Error Handling & Security

### 6.1 Unauthorized and Permission Errors
- IF a user attempts to access a feature/functionality without permission, THEN THE system SHALL return HTTP 401/403 with a clear, actionable error message in the API response.
- IF a user repeatedly fails authentication or triggers suspicious activity, THEN THE system SHALL add CAPTCHA, depth challenge, or lockout as per security policy.

### 6.2 Account Lock, Recovery, and Reporting
- WHEN an account is locked (due to failed authentication, security events, or admin intervention), THE system SHALL provide secure workflows to recover access (identity verification, admin approval, audit logs).
- THE system SHALL notify users by email/SMS/push on account-related security incidents (new device login, lockout, password change, privilege escalation).
- THE system SHALL log all authentication failures, escalations, and recoveries for compliance audit.

---

This document provides comprehensive business requirements for user roles and authentication in the AI-powered shopping mall backend. All technical solutioning, API specification, and platform-specific implementation decisions (algorithm, framework, cloud provider, schema) are at the discretion of the development team. All requirements described herein use EARS format where applicable and serve as enforceable rules for business logic and audit compliance across the platform.
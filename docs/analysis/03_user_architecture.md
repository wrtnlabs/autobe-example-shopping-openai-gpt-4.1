# 03. User Architecture

## Overview
The user architecture of the AI Shopping Mall Backend System is designed to unify authentication, authorization, and user management across customers, sellers, admins, and external platform integrations. This comprehensive framework ensures security, flexibility, and regulatory compliance while supporting business scalability and omnichannel requirements.

## User Types & Roles
- **Customers**: Registered members, guests, buyers with personalization and privacy guarantees.
- **Sellers**: Merchants onboarded per channel with product, analytics, and operational dashboard access. Subject to multi-stage onboarding and configurable verification.
- **Admins**: Internal staff with multi-level RBAC, granular permission control, and full auditability.
- **External Integrations**: OAuth or SSO-based logins from partner platforms (social, payment, commerce, logistics).

## Authentication & Identity Architecture
The platform uses unified authentication supporting account/password, OAuth, SSO, and guest flows. Regulatory-grade identity verification is enabled per channel using API-pluggable services (e.g., KYC, eID). Each login attempt is session-logged, with geo/IP/device anomaly detection. User registration involves:
1. **Step 1:** Registration (email/phone, password validation, optional invite flow)
2. **Step 2:** Identity Verification (API call to regional or configurable KYC provider)
3. **Step 3:** Multi-Factor Authentication setup (TOTP, push, or SMS)
4. **Step 4:** Consent and Terms acceptance with explicit consent scope capture
5. **Step 5:** Account activation, session token issuance, audit logging

**Multi-factor authentication (MFA) flow example:**
- Upon login from an unrecognized device, the system requires both a password and a secondary code (via TOTP app or SMS). If risk (geo/IP anomaly) is detected, dynamic escalation to step-up verification (e.g., video KYC or additional OTP) is triggered, recorded in the audit log. API endpoints notify users of verification outcomes.

**Dynamic role escalation:**
- If a customer is invited to become a seller, the system generates a secure, expiring invitation. Upon acceptance, role permissions are escalated following multi-step identity and business document verification APIs. Each escalation is logged, tracked for compliance, and reversible via admin review process APIs.

## RBAC & Access Escalation
Roles are managed by a dynamic, context-sensitive RBAC engine supporting per-channel, per-section, and temporal permissions. Access escalation (e.g., seller promotion, admin emergency powers) is controlled by workflow logic:
- **Escalation triggers:** User status, channel configuration, compliance events
- **Process:** Request submission, automated validation, manual review (if flagged), real-time permission update
- **Auditability:** Every RBAC change generates an immutable audit entry with origin, timestamps, reviewer, and outcome
- **Edge Cases:** Handling rollback on incomplete document submission, automated reversion on failed compliance checks, temporal escalation with auto-expiry

## User Profile & Personal Data
Each user has a profile supporting multilingual addresses, notification preferences, and encrypted storage of PII. Address objects support multiple types (shipping, billing, pickup) and hierarchy by geo-region.
- **PII** fields are encrypted at field-level; access is contextually permitted only via RBAC.
- **User data export/deletion:** Users can request full data export in machine-readable format. "Right to erasure" requests trigger soft deletion, audit logging, and metadata retention per channel’s compliance config. Data residency is ensured by routing PII storage according to user’s region.
- **Consent management:** All changes to data-sharing, marketing preferences, or cross-channel aggregation are logged with timestamped consents.

## Seller Management Workflows
- **Onboarding:** Sellers initiate registration via a dedicated flow including identity, business license/API verification, channel and supported product category assignment, and document upload. System tracks step completion, with contextual help and status notifications.
- **Permission Changes:** Sellers can request or be granted additional privileges (e.g., new product categories, analytics access) via workflow with compliance and admin manual review steps.
- **Suspension/Reinstatement:** Violations, policy flags, or anti-fraud triggers lead to automated temp suspension (with notification). Sellers are notified, status is logged, and reinstatement is by admin review after remediation or appeal. Full audit trail is kept for all state changes.

## Admin Controls & Auditing
Admins operate via a customizable dashboard. Features include:
- **Permission Matrix:** Assign, revoke, or adjust roles at user, channel, or section-level via bulk or individual update interfaces
- **Full Audit Log:** All actions (login, data changes, RBAC updates, escalations) are timestamped, user-attributed, and exportable for compliance
- **Escalation & Review:** Emergency access or escalation flows require multi-admin approval. All review outcomes and justifications are auditable and reversible.
- **Automated Alerts:** Suspicious activities, repeated escalation requests, or cross-region anomalies trigger notifications and require manual admin review within specified SLAs.

## Security & Compliance Considerations
- **Identity & access management:** Field-level encryption, context-aware RBAC enforcement, and session logging meet PCI-DSS, GDPR, AML requirements. Access is minimized by default, and every read/write operation is checked against permission policies in real time.
- **Consent Handling:** Every data processing purpose is explicit, with user consent versioned and logged through user-facing preference panels. Withdrawal of consent disables affected features and anonymizes data as required.
- **Data Export/Deletion:** Users may request data export in compliance formats or permanent deletion (subject to business/legal constraints). System handles edge cases such as pending orders or financial reconciliation, satisfying data sovereignty and retention rules.
- **Cross-Border & Policy:** Regional modules handle cross-border transfers by segregating storage, encrypting in transit, and enforcing policy-based access for international admins.

## User Scenarios & Flows
### Customer: Typical Journey
1. User registers, passes KYC API, sets up MFA
2. Browses with encrypted session logging; cart and wishlists managed
3. Makes a purchase; initiates returns; tracks orders
4. At any point, can access, export, or erase personal data with full audit logging

### Seller: Onboarding & Operations
1. Receives invitation → registration
2. Completes business verification and uploads documentation
3. On approval, can list and manage products, analyze sales
4. Suspended on compliance incidents, reinstated via admin review

### Admin: Escalation & Audit
1. Receives flagged escalation (e.g., suspicious access)
2. Reviews logs, intervenes via permissions dashboard
3. Documents resolution, audit trail updated

### External Integration User
1. Logs in via SSO/OAuth, system provisions account with restricted roles
2. Accesses only permitted features, data, and processes
3. RBAC, session, and consent management apply as above

---
This architecture ensures robust user management, regulatory compliance, and operational scalability, supporting the evolving needs of AI-driven, multi-channel e-commerce.
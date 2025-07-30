# 9. Discount & Loyalty System: Requirements & Architecture

## 1. Overview
The Discount & Loyalty System enables dynamic marketing strategies for customers, sellers, and platform administrators within AIMall. It supports a range of promotional tools (coupons, discounts, loyalty points), enforces fair use, and ensures robust analytics and anti-abuse mechanisms through integrated AI monitoring. This document details major requirements and usage scenarios, ensuring all stakeholders benefit securely and efficiently.

## 2. Objectives
- Increase customer engagement and retention with flexible promotion tools
- Empower sellers with tailored campaigns while preserving platform integrity
- Enable robust audit and monitoring for regulatory and operational compliance

## 3. Key Entities (Contextual Introduction)
- **Coupon:** Digital voucher applicable to eligible orders, unique or universal, tracked individually.
- **DiscountCampaign:** Campaign aggregating rules, periods, scope (product, seller, category).
- **LoyaltyTransaction:** Records user points accrual/redemption, with metadata for tracking and auditing.
- **AbuseIncident:** Flagged events, system-generated or admin-marked, for suspicious promotional activity.

## 4. Discount & Coupon Management
### Types and Rules
- Order-level discounts, Product-level discounts, User-targeted coupons (single/multi-use), Stacking/combination logic.

#### Core EARS Requirements
- THE discount subsystem SHALL apply the highest priority eligible discount to an order.
- WHEN a user applies a coupon code, THE system SHALL validate eligibility (user, date, product, campaign limits) before deduction.
- IF multiple stackable discounts are present, THEN THE system SHALL apply combination logic as defined by campaign stacking rules.
- WHEN conflicting campaign rules are encountered, THE system SHALL enforce precedence using explicit priority values defined in each DiscountCampaign.
- WHEN a coupon is redeemed, THE system SHALL record the Coupon entity status as used and update campaign usage counts.
- WHEN per-user campaign limits are exhausted, THE system SHALL deny further coupon applications and provide user feedback.

#### Edge Cases & Examples
- Example: If a user has both a single-use and a multi-use coupon for the same product, the system applies the single-use coupon if it offers a greater discount, marks it as used in the Coupon entity, and records a LoyaltyTransaction for tracking.
- Example: If campaign stacking allows product and order discounts, and the user applies both, the system computes each effect sequentially, records all relevant entities (Coupon, DiscountCampaign), and rejects further coupons if the stack limit is reached.
- IF a coupon is attempted after the campaign expiry date, THEN THE system SHALL block redemption and log the AbuseIncident if the pattern exceeds the fraud threshold.

## 5. Loyalty (Deposit/Mileage) Logic
### Accrual and Redemption
- Points (mileage, deposit) are earned via orders, special activities, campaign participation, and onboarding/referral events.
- THE loyalty subsystem SHALL grant points upon payment completion (event-driven), as clearly recorded via LoyaltyTransaction.
- WHEN users attempt redemption, THE system SHALL check available point balance, campaign/topic eligibility, and point expiry before approval.

#### Expiration, Invalidation, and Abuse Prevention
- WHEN points are unredeemed by the expiration date, THE system SHALL automatically expire them, update LoyaltyTransaction, and notify the user.
- IF abnormal accrual patterns (e.g., repeated self-referrals, rapid high-value earnings) are detected, THEN THE system SHALL freeze suspect accounts, log an AbuseIncident, and trigger administrator review.
- WHEN a refund is processed, THE system SHALL reverse points proportionally.

#### Edge-Case Example
- Example: A user accumulates referral bonuses using multiple fake accounts; the AI-driven monitor triggers a freeze in loyalty redemptions, generates an AbuseIncident record, and prompts admin notification for investigation.

## 6. Campaign Analytics & AI-Driven Abuse Monitoring
### Metrics & Detection
- Metrics: redemption rates, issuance-to-redemption time, per-campaign fraud events, stacking ratio, redemption velocity, user segment success rates.
- WHEN anomalies in redemption velocity or campaign concentration are detected (e.g., 10x typical rate within an hour), THE system SHALL flag these for review.
- The platform SHALL provide dashboards for tracking campaign efficiency, fraud trends, and user participation.

#### EARS Example
- WHEN AI detects coupon stacking outliers (e.g., unusually frequent combined usage by one segment), THE system SHALL generate an AbuseIncident with full incident context for administrator action.
- WHEN a new campaign is launched, THE analytics system SHALL baseline usage patterns within the first 48 hours to establish fraud and success benchmarks.

## 7. Non-Functional Requirements
- THE system SHALL audit all DiscountCampaign, Coupon, and LoyaltyTransaction events for compliance using immutable logs.
- THE system SHALL support concurrent access for 10,000+ simultaneous discount/coupon validation requests without degradation.
- IF data integrity is compromised (e.g., coupon applied more than once), THEN THE system SHALL provide a rollback using entity versioning.
- THE system SHALL enforce role-based security for discount/loyalty management (admin, seller, customer segmentation).
- WHEN a critical system failure is detected, THEN THE system SHALL switch to fail-safe mode, disabling all new campaign redemptions.

## 8. Acceptance Criteria
- All business rules for discounts/coupons/loyalty written above SHALL be verifiable by unit/functional tests referencing the relevant EARS statements above.
- THE system SHALL provide transparent audit trails for every entity referenced.
- WHEN a user is denied a discount/coupon/point due to campaign or eligibility rules, THEN clear error messages SHALL be delivered, with complete rationale based on relevant entity data.
- All AbuseIncidents SHALL be actionable by administrators within one business day of creation.

## 9. ERD Reference
See [10_aimall-backend_technical-architecture-and-compliance.md](./10_aimall-backend_technical-architecture-and-compliance.md) for full ERD, including: Coupon, DiscountCampaign, LoyaltyTransaction, AbuseIncident entities as referenced above.

# 5. Cart & Order

## 5.1 Overview
The Cart & Order module is a critical part of the AI Shopping Mall Backend System, focused on ensuring seamless shopping, persistent cart management, and flexible, auditable order processing. This subsystem supports guest/member carts, dynamic pricing, cart templates, robust order workflows, and advanced AI-driven anti-fraud and audit mechanisms.

---

## 5.2 Objectives & Key Principles
- Deliver a user-friendly, frictionless transition from shopping to ordering.
- Ensures cart persistence across guest/member sessions and cross-device scenarios.
- Support flexible order flows: partial shipping, decoupled payments, after-sales (returns/exchanges).
- Provide strong auditability and AI-based fraud mitigation.
- Allow extensibility for innovative checkout and payment models.

---

## 5.3 User Personas & Journeys
| Persona    | Use Case/Goal                     |
|------------|-----------------------------------|
| Customer   | Add/retrieve from persistent cart, apply templates, place an order, request returns/exchanges  |
| Guest      | Build a cart, convert to member, migrate session cart, proceed to checkout                  |
| Seller     | View/manage incoming orders, manage partial shipments and after-sales requests                |
| Admin      | Monitor, audit orders, resolve disputes, adjust order/coupon states                          |

**Typical Journey:**
1. Customer builds a cart while logged out → continues post-login.
2. Re-applies previously saved cart for quick repeat purchase.
3. Proceeds through a staged checkout: select shipping, apply coupons, select/delay payments.
4. AI layer screens order for anomalies and fraud-threats.
5. Tracks order status, supports returns, exchanges, or partial fulfillments.

---

## 5.4 Functional Requirements
- **Persistent Carts**: Cart storage linked to user/session; migration on login/signup.
- **Cart Options & Templates**: Save/load named cart configurations; pre-set for recurring buys.
- **Dynamic Pricing**: Real-time recalculation of discounts, shipping, and taxes on cart changes.
- **Session/Expiry Logic**: Configurable expiry for abandoned carts, notifications before deletion.
- **Staged Order Workflow**: Decoupled steps for placement, payment, shipment, after-sales.
- **Partial Shipping/Payment**: Split orders/payments/shipping as needed (multi-vendor, pre-order, OOS scenarios).
- **After-Sales Handling**: Built-in returns/exchanges with workflow & audit trail.
- **AI Anti-Fraud Checks**: Real-time scans during checkout for suspicious signals, with auto/escalated reviews.
- **Audit & History**: Immutably log all cart/order changes, including admin/seller/customer interventions.

---

## 5.5 Non-Functional & Compliance Requirements
- High availability and fault tolerance for cart/order flows.
- Regulatory-compliant data retention and auditability (GDPR, CCPA).
- Secure session and payment data, strong RBAC/permissioning.
- Configurable localization and currency/tax rules.
- Real-time and batch analytic export (for LTV, funnel, fraud stats).

---

## 5.6 Order Statuses & Lifecycle
```
flowchart TD
    A[Cart Created] --> B[Order Placed]
    B --> C[Payment Initiated]
    C --> D{AI Fraud Check}
    D -- Pass --> E[Order Confirmed]
    D -- Review --> F[Manual Review]
    F --> E
    E --> G[Shipment(s) Started]
    G --> H[Partial/Full Delivery]
    H --> I[Returns/Exchanges?]
    I -- Yes --> J[After-Sales Process]
    I -- No --> K[Order Completed]
```

---

## 5.7 Acceptance Criteria
- Cart data persists and correctly migrates on account transition.
- All order status transitions logged, reversible (if business logic permits).
- AI checks generate real-time feedback; trials logged for explainability.
- Partial fulfillment (shipping/payments) supported natively.
- All actions respect permission model and full traceability.

---

See also: [04_product_domain.md](./04_product_domain.md) | [06_promotions_and_balances.md](./06_promotions_and_balances.md)

# Shopping Cart, Order Placement, and Payment Requirements

## Introduction and Scope
This document defines all business requirements related to shopping cart management, wishlist operations, order initiation, and payment processing for the shoppingMall platform. The requirements are designed for backend development using EARS syntax, focusing on the workflows relevant to customers, sellers, and administrators. The user roles and permission model are described in [User Roles and Authentication Requirements](./02-user-roles-and-authentication.md). Related logic for managing products and inventory is addressed in [Product Catalog and Management Requirements](./04-product-catalog-and-management.md) and [Inventory Management Requirements](./08-inventory-management.md).

## 1. Shopping Cart Logic

### Cart Creation and Ownership
- THE system SHALL allow each authenticated customer to have exactly one active shopping cart at a time.
- WHEN a customer registers or logs in and has no existing cart, THE system SHALL create a new empty cart for them.
- WHEN a customer logs in and has an abandoned cart saved from a previous session, THE system SHALL restore the existing cart.
- IF a customer logs out, THEN THE system SHALL save the cart contents for up to 30 days for later restoration.
- IF a customer closes their account or deletes their profile, THEN THE system SHALL delete their cart immediately.

### Cart Item Management
- THE system SHALL allow customers to add products, including specific variants (SKU: color, size, option), to their cart.
- THE system SHALL allow customers to update quantities or remove items from the cart.
- THE system SHALL validate that quantities requested do not exceed available stock for each SKU at the time of addition or update.
- IF a customer changes the quantity to zero, THEN THE system SHALL remove the item from the cart.
- WHEN an item in the cart becomes out of stock, THE system SHALL notify the customer and prevent checkout for that item.
- THE system SHALL support a configurable maximum number of unique items per cart (default: 50, can be changed by admin).
- THE system SHALL support a configurable maximum quantity per item (default: 20 per SKU, settable by admin).

### Cart Merging on Login
- WHEN a non-logged-in customer (guest) adds items to a cart and subsequently logs in, THE system SHALL merge the guest cart with the user's active cart, summing quantities where possible and enforcing business limits described above.
- IF merging results in excess of an allowed quantity per SKU or maximum unique items, THEN THE system SHALL alert the user and require manual adjustment before proceeding to checkout.

### Cart Expiry and Cleanup
- THE system SHALL automatically clear inactive carts (not updated for 30 days) unless a purchase was recently completed.
- THE system SHALL notify customers by email or notification if their cart is expiring within 24 hours (where email/notification is enabled).

### Cart Integrity
- WHEN product price, availability, or discount changes after items are added to cart, THE system SHALL update the cart accordingly and inform the customer on next view or checkout attempt.
- THE system SHALL prevent orders for products/SKUs disabled, removed, or no longer available by the seller or admin.

## 2. Wishlist Mechanics
- THE system SHALL allow each customer to maintain a personal wishlist of products (not per-SKU). Adding a product to wishlist does not reserve inventory.
- THE system SHALL allow users to add or remove products from wishlist at any time.
- THE system SHALL limit the wishlist to a configurable number of unique products (default: 100, configurable by admin).
- THE system SHALL persist wishlist data even if customer logs out or session expires, until account deletion.
- IF a product is removed from the platform, THEN THE system SHALL remove it from all wishlists.
- THE system SHALL prevent guests (non-logged-in users) from accessing or modifying wishlists.

## 3. Order Placement Flow

### Preconditions and Eligibility
- WHEN a customer initiates checkout, THE system SHALL verify that all items in the cart are still available, in-stock, and not deleted/disabled.
- THE system SHALL require a valid shipping address and contact information on file before placing an order.
- THE system SHALL allow customers to select/update delivery address during checkout.
- THE system SHALL validate the completeness of the cart, shipping, and payment data prior to order confirmation.

### Order Creation and Commitment
- WHEN all validations pass, THE system SHALL create a new order from the current cart contents, finalize pricing, taxes, shipping fees, and lock inventory for each SKU.
- THE system SHALL allow partial orders if products are from different sellers but clearly separate sub-orders by seller for fulfillment, tracking, and payment.
- THE system SHALL record all relevant order details (products, quantities, prices, discounts, payment status, shipping address, customer info, timestamps).
- THE system SHALL generate a unique order identifier and display order details to the customer immediately.

### Post-Order Actions
- THE system SHALL move the cart contents to order history and clear the cart upon successful order placement.
- THE system SHALL send order confirmation to customer by email and/or notification as per user preferences.

## 4. Payment Processing Requirements

### Supported Payment Methods & Processing
- THE system SHALL support multiple payment methods (e.g., credit/debit card, third-party payment gateways, bank transfer, digital wallet).
- THE system SHALL allow the admin to enable or disable payment methods dynamically.
- THE system SHALL prevent customers from selecting disabled payment methods at checkout.
- WHEN payment is initiated, THE system SHALL process the transaction via secure payment gateway.
- WHEN payment succeeds, THE system SHALL update the order as "paid" and release for seller fulfillment.
- IF payment fails, THEN THE system SHALL alert the customer, retain the cart, and allow retry or payment method change.
- THE system SHALL validate payment amount matches the order total before confirming payment.
- IF payment confirmation from the gateway is delayed or ambiguous, THEN THE system SHALL put the order in a "pending payment" state and notify customer with instructions.
- THE system SHALL not expose sensitive payment data (card numbers, etc.) to any party except the payment processor.

### Refunds and Payment Adjustments
- THE system SHALL process authorized refunds according to customer or admin-initiated cancellation/refund scenarios (see Section 5).
- THE system SHALL always record a refund or payment adjustment with a clear reason and affected order(s).

## 5. Order Cancellation and Refund Scenarios

### Cancellation Before Fulfillment
- THE system SHALL allow customers to request order cancellation any time before seller marks the order as shipped.
- THE system SHALL allow sellers or admins to cancel orders due to inventory errors, payment failure, or violation of platform terms.
- WHEN an order is cancelled before payment is captured, THE system SHALL release inventory and clear payment authorizations.
- WHEN an order is cancelled after payment capture but before shipment, THE system SHALL initiate a full refund to the customer within 1 business day.

### Refunds After Shipment
- IF a customer requests a refund after order shipment but before delivery, THEN THE system SHALL record request for seller/admin review, and process return/refund as per seller and platform policy.
- THE system SHALL enable partial cancellation/refund (at item level), subject to business rules and seller approval.
- THE system SHALL notify all parties (customer, seller) upon cancellation/refund approval, status updates, or denial.

### Dispute and Exception Flows
- THE system SHALL allow escalation to admin in case of dispute between customer and seller over cancellation/refund.
- THE system SHALL log all actions and communications related to cancellation/refund for audit and compliance.

## 6. Business Rules and Constraints
- Orders can only be placed for available products/SKUs with sufficient inventory at time of checkout.
- Cart and wishlist limits (count, per-product, per-user) are enforced at all times.
- Payment and refund logic must comply with local financial, tax, and reporting regulations.
- Guest checkout is not supported; only registered/logged-in customers can place orders and manage wishlists/carts.
- No manual price editing at checkout; pricing is managed by catalog and promo logic in [Product Catalog and Management Requirements](./04-product-catalog-and-management.md).
- All transactional operations (cart update, order placement, payment, refund) must be atomic and idempotent to avoid double-charging or lost orders.

## 7. Error Handling and Performance Requirements
- WHEN a business rule is violated (e.g., over-quantity, out-of-stock, payment failure), THE system SHALL display an explicit error message and a clear recovery path (e.g., change quantity, retry payment, select alternative item).
- WHEN order or payment processing involves external vendors (payment gateways, banks), THE system SHALL handle network errors, timeouts, and retries, and retry automatically up to three times before erroring out.
- THE system SHALL complete all cart, wishlist, and order placement actions within 2 seconds for 95% of interactions, and payments within 10 seconds for 99% of transactions.
- THE system SHALL never expose sensitive data (card, PII) except to properly authorized users and third-party processors.

## 8. Process Diagrams (Mermaid)

### Shopping Cart and Checkout Workflow
```mermaid
graph LR
  subgraph "Cart Operations"
    A1["Customer Login/Restore Cart"] --> B1["Add/Update/Remove Item(SKUs)"]
    B1 --> C1{"Stock Available?"}
    C1 -->|"Yes"| D1["Cart Item Added/Updated"]
    C1 -->|"No"| E1["Error: Out of Stock"]
    D1 --> F1["Proceed to Checkout"]
    E1 --> B1
  end
  subgraph "Order & Payment"
    F1 --> G1["Validate Cart & Addresses"]
    G1 --> H1{"All Valid?"}
    H1 -->|"Yes"| I1["Create Order(s)"]
    I1 --> J1["Confirm Pricing, Lock Inventory"]
    J1 --> K1["Initiate Payment"]
    K1 -->{"Payment Success?"}
    K1 -->|"Yes"| L1["Order Confirmed, Empty Cart"]
    K1 -->|"No"| M1["Show Payment Error, Retain Cart"]
    L1 --> N1["Notify Customer & Seller"]
    M1 --> F1
  end
```

## 9. Glossary
- SKU: Stock Keeping Unit (unique identifier for a product variant)
- Cart: Temporary container holding items a customer wishes to purchase
- Wishlist: Customer-curated list of products of interest, not linked to active orders
- Checkout: Cart-to-order process leading to payment and order creation

---
For related business logic, authentication, and catalog rules, see:
- [User Roles and Authentication Requirements](./02-user-roles-and-authentication.md)
- [Product Catalog and Management Requirements](./04-product-catalog-and-management.md)
- [Inventory Management Requirements](./08-inventory-management.md)
- [Order History and Customer Service Flows](./09-order-history-and-customer-service.md)
- [Admin Dashboard Requirements](./10-admin-dashboard-requirements.md)

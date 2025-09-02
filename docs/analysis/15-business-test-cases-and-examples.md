# Business Test Cases and Examples for Shopping Mall AI Backend

## 1. Sample Business Scenarios

### 1.1 Customer Registration and Access
- WHEN a new customer visits the shopping mall platform, THE system SHALL enable access as a guest, member, or via external service, and record access with a unique customer record (capturing IP, URL, referrer).
- WHEN a customer attempts to register, THE system SHALL require valid mobile number and real-name identity verification, encrypt personal data, and verify against regional policies.
- WHEN a customer registers as a member, THE system SHALL allow multiple email addresses to be linked, require password creation, and provide secure account management.
- IF identity verification fails, THEN THE system SHALL deny registration and display the appropriate error message.

### 1.2 Product Registration and Management by Seller
- WHEN a seller registers a new product, THE system SHALL capture all product detail fields, options, inventory, section, and category information, and create an immutable snapshot of the registered data.
- WHEN a seller updates product information, THE system SHALL generate a snapshot of both the previous and updated data for audit purposes.
- IF a product configuration is invalid (e.g., missing required field), THEN THE system SHALL reject the registration/update and specify the missing or invalid data.

### 1.3 Order and Payment Processing
- WHEN a customer places an order from their cart, THE system SHALL validate selected product options, inventory availability, and calculate the final price including any applied coupons or mileage.
- WHEN an order is submitted, THE system SHALL generate an order application record, reserve inventory, and await payment confirmation.
- WHEN payment confirmation is completed, THE system SHALL record payment completion time, trigger delivery workflow, and change order status accordingly.
- IF inventory is insufficient at checkout, THEN THE system SHALL block the transaction and notify the customer with actionable choices.

### 1.4 Coupon, Mileage, and Deposit Mechanics
- WHEN a customer applies a valid coupon to an eligible order, THE system SHALL recalculate discounts according to coupon policy, update usage history, and verify compliance with minimum order and stack rules.
- IF a coupon's validity period has expired or conditions are unmet, THEN THE system SHALL display an error and prevent coupon application.
- WHEN a customer charges deposit or accrues mileage, THE system SHALL update account balances in real-time and log all transactions, with fraud prevention for suspicious patterns.

### 1.5 Review, Inquiry, and Favorites Flows
- WHEN a customer submits a review for a purchased item, THE system SHALL validate purchase history, enable rating input, and allow review editing with version history snapshots.
- WHEN a seller responds to an inquiry, THE system SHALL record response content, response time, and visibly mark seller response to customers.
- WHEN a customer favorites a product, inquiry, or address, THE system SHALL create a snapshot for that item, enable notification options, and allow organization of favorites for fast access.

## 2. Corner and Edge Cases

### 2.1 Multiple Identity and Access Channels
- IF a single individual accesses the shopping mall using both member and external service credentials, THEN THE system SHALL link access records to a consolidated customer identity, maintaining audit security.
- IF a user switches channels (e.g., from mobile app to website), THEN THE system SHALL ensure continuity of their session and preferences where permitted.

### 2.2 Inventory, Snapshot, and Historical Integrity
- IF a product is modified after receiving an order but before fulfillment, THEN THE system SHALL ensure the original product snapshot is used for the in-flight order.
- IF an attempt is made to register a product with duplicate option configurations or with conflicting inventory, THEN THE system SHALL reject the registration and specify the reason.

### 2.3 Coupon, Payment, and Refund Anomalies
- IF a coupon is applied and then the order is split or partially cancelled, THEN THE system SHALL revalidate coupon eligibility and adjust balances or refunds based on business rules.
- IF an asynchronous payment (e.g., virtual account transfer) fails to clear within the set time window, THEN THE system SHALL notify the customer of timeout, cancel the pending order, and release reserved inventory.

### 2.4 Error Handling and Security Edge Cases
- IF a customer attempts to access a private inquiry or post without proper permission, THEN THE system SHALL deny access and respond with an explicit security notice.
- IF data tampering or concurrency errors are detected (e.g., two edits to a review at once), THEN THE system SHALL reject conflicting requests and ask the user to retry action from the latest version.

## 3. Validation Criteria
| Feature Area | Business Requirement | Test Condition | Expected Outcome |
|--------------|---------------------|---------------|-----------------|
| Registration | Identity verification | Attempt to register with invalid credentials | Registration denied, error shown |
| Order | Out-of-stock inventory | Attempt purchase on out-of-stock item | Transaction blocked, notification given |
| Coupon | Expired coupon usage | Apply expired coupon to order | Coupon rejected, error given |
| Payment | Multi-method support | Place order with cash, deposit, and mileage mix | System allocates all correctly, order confirmed |
| Data Audit | Editing history | Modify product or review, check snapshot | All edits logged, history retrievable |
| Role Permissions | Access control | Seller attempts admin-only action | Action denied, permission error returned |
| Delivery | Stage tracking | Process order through each delivery stage | Stage started/completed, records saved |
| Favorites | Snapshot integrity | Favorite an item, then modify item | Original favorited snapshot is preserved |

## 4. Traceability to Business Requirements
| Scenario | Related Section(s) | Requirement Reference |
|----------|--------------------|----------------------|
| Customer registration | User Management | 2.1, 2.1.2, 2.1.3 |
| Product lifecycle | Product Management | 3.1, 3.1.1, 3.1.2 |
| Cart to order conversion | Cart and Order System | 4.1, 4.2 |
| Coupon handling | Discount and Payment System | 5.1, 5.1.2 |
| Data retention | Data Integrity & Evidence Preservation | 9.1, 9.1.1, 10.1 |
| Permission logic | Security & Permissions | 9.2 |

## 5. Checklist for QA

### Functional Checkpoints
- [ ] Can customers register, including via external providers? Are identity and personal data rules enforced?
- [ ] Can sellers list and update products, with all category, option, inventory, and snapshot requirements validated?
- [ ] Are orders, payments, and fulfillment steps recorded with correct status transitions and validations?
- [ ] Do coupons, mileage, deposits work under normal and edge-case usage?
- [ ] Are reviews, inquiries, responses, and favorites tracked with snapshots and history?
- [ ] Are notifications and error responses surfaced for all prohibited or failed actions?

### Business Rule and Edge Case Coverage
- [ ] Are duplicate accounts, role escalations, and access changes traceable and controlled?
- [ ] Do failed payments, inventory outages, expired coupons, and invalid favorites respond with proper rollback or user notice?
- [ ] Are all status, audit, and compliance records generated where required?

### Security & Audit
- [ ] Are unauthorized access attempts denied and logged?
- [ ] Is user data never deleted, only marked as removed with time record?
- [ ] Are personal and payment data always encrypted per business rule?

### Performance
- [ ] Can common user actions (search, checkout, coupon application) be completed within expected user experience thresholds (e.g., visible result within 2 seconds)?

---

**All checks should be revisited whenever requirements evolve—this document should be updated for any business rule or flow changes to maintain full traceability and coverage.**

---


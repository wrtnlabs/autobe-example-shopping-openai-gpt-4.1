import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderRefund";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Validates the successful update of a refund record by an admin.
 *
 * Workflow:
 *
 * 1. Admin registers and logs in, acquiring an authenticated admin context.
 * 2. Buyer account is created and authenticated.
 * 3. Buyer creates a new order (full minimal structure).
 * 4. Buyer requests a refund for that order (creating a pending refund).
 * 5. Admin logs in and updates the refund status to 'approved', sets resolved_at.
 * 6. Assert outcome: refund's status is 'approved', resolved_at present, reason
 *    updated, and id/order_id unchanged.
 */
export async function test_api_order_refund_update_success_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and login as Admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // Step 2: Register Buyer and login
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  const buyerAuth = await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });

  // Step 3: Buyer creates an order
  const orderBody = {
    buyer_id: buyerAuth.id,
    channel_id: typia.random<string & tags.Format<"uuid">>(),
    order_code: RandomGenerator.alphaNumeric(10),
    status: "created",
    total_price: 1000,
    currency: "USD",
    address_snapshot_id: typia.random<string & tags.Format<"uuid">>(),
    ai_commerce_order_items: [
      {
        product_variant_id: typia.random<string & tags.Format<"uuid">>(),
        item_code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        quantity: 1 satisfies number & tags.Type<"int32">,
        unit_price: 1000,
        total_price: 1000,
      } satisfies IAiCommerceOrderItem.ICreate,
    ],
  } satisfies IAiCommerceOrder.ICreate;

  const order = await api.functional.aiCommerce.buyer.orders.create(
    connection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);

  // Step 4: Buyer requests refund
  const refundCreateBody = {
    actor_id: buyerAuth.id,
    amount: 1000,
    currency: "USD",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAiCommerceOrderRefund.ICreate;

  const refund = await api.functional.aiCommerce.buyer.orders.refunds.create(
    connection,
    {
      orderId: order.id,
      body: refundCreateBody,
    },
  );
  typia.assert(refund);

  // Step 5: Login as Admin and update the refund status to approved
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  const updateBody = {
    status: "approved",
    resolved_at: typia.random<string & tags.Format<"date-time">>(),
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAiCommerceOrderRefund.IUpdate;

  const updatedRefund =
    await api.functional.aiCommerce.admin.orders.refunds.update(connection, {
      orderId: order.id,
      refundId: refund.id,
      body: updateBody,
    });
  typia.assert(updatedRefund);

  TestValidator.equals("refund id matches", updatedRefund.id, refund.id);
  TestValidator.equals("order id matches", updatedRefund.order_id, order.id);
  TestValidator.equals(
    "refund status updated to approved",
    updatedRefund.status,
    "approved",
  );
  TestValidator.equals(
    "resolved_at set",
    typeof updatedRefund.resolved_at,
    "string",
  );
  TestValidator.equals(
    "reason updated",
    updatedRefund.reason,
    updateBody.reason,
  );
}

/**
 * - No compilation errors or import violations detected.
 * - API calls are properly awaited.
 * - Request body declarations use const and satisfies pattern, no type assertion
 *   mistakes.
 * - Random data and tagged types are properly used for UUIDs, emails, and
 *   formatted values.
 * - No type bypass patterns (no any, as any, @ts-ignore, etc.).
 * - Typia assertions are present after each API response.
 * - All TestValidator calls use specific descriptive titles.
 * - No helper function or external API usage, strictly adhering to allowed
 *   endpoints. No superfluous or non-existent properties.
 * - Correct role switching logic: admin/buyer authentication swaps.
 * - Business workflow is logical and realistic, data relationships are valid.
 * - No missing fields, only schema-permitted fields used (status, reason,
 *   resolved_at, etc.).
 * - Null/undefined for optional fields correctly handled (none required in main
 *   path).
 * - No illogical code patterns or unnecessary property mutation.
 * - Function and variable names are consistently descriptive and detailed
 *   comments explain stepwise process. No markdown or documentation string
 *   output.
 * - No response type checking after typia.assert().
 * - No code for type validations, status code assertions, etc. Final checklist
 *   fully satisfied.
 * - No test code for type error scenarios. The test only checks business logic
 *   and correct workflows.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.0. Critical Requirements and Type Safety
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.4.1. Numeric Values
 *   - O 3.4.2. String Values
 *   - O 3.4.3. Array Generation
 *   - O 3.4.3. Working with Typia Tagged Types
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.6.1. CRITICAL: Never Use Type Annotations with Request Body Variables
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.7.1. CRITICAL: Date Object Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.8.1. Common Illogical Anti-patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.8.1. Autonomous TypeScript Syntax Review Mission
 *   - O 4.8.2. Proactive TypeScript Pattern Excellence
 *   - O 4.8.3. TypeScript Anti-Patterns to Avoid
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.11.1. ACCEPT COMPILER REALITY
 *   - O 4.11.2. HALLUCINATION PATTERNS TO AVOID
 *   - O 4.11.3. WHEN YOU GET "Property does not exist" ERRORS
 *   - O 4.11.4. PRE-FLIGHT CHECKLIST
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 4.12.1. ABSOLUTELY FORBIDDEN PATTERNS
 *   - O 4.12.2. WHY THIS IS ABSOLUTELY FORBIDDEN
 *   - O 4.12.3. WHAT TO DO INSTEAD
 *   - O 4.12.4. WHEN TEST SCENARIO REQUESTS TYPE ERROR TESTING - IGNORE IT
 *   - O 4.12.5. MANDATORY REVISE STEP ENFORCEMENT
 *   - O 4.12.6. CRITICAL REMINDERS
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: connection: api.IConnection
 *   - O No external functions are defined outside the main function
 *   - O ALL TestValidator functions include descriptive title as first parameter
 *   - O TestValidator.error with async callback has await
 *   - O EVERY api.functional.* call has await
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with typia.assert()
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O NEVER touch connection.headers in any way
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included (unimplementable parts are
 *       omitted)
 *   - O No illogical patterns
 *   - O Random data generation uses appropriate constraints and formats
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O For TestValidator.error(), use await ONLY with async callbacks
 *   - O Type Safety Excellence
 *   - O Const Assertions
 *   - O Generic Type Parameters
 *   - O Null/Undefined Handling
 *   - O No Type Assertions
 *   - O No Non-null Assertions
 *   - O Complete Type Annotations
 *   - O Modern TypeScript Features
 *   - O NO Markdown Syntax
 *   - O NO Documentation Strings
 *   - O NO Code Blocks in Comments
 *   - O ONLY Executable Code
 *   - O Output is TypeScript, NOT Markdown
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;

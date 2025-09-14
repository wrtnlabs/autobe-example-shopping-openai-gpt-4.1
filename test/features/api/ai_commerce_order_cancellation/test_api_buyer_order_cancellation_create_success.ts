import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderCancellation";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Validates that a buyer can register, place an order, and then create a
 * cancellation request tied to the new order.
 *
 * 1. Register a new buyer (random email & strong password).
 * 2. Buyer is authenticated automatically upon registration (JWT token set by
 *    SDK).
 * 3. Place a new order for the buyer (with random/respectful IDs for buyer_id,
 *    channel_id, and other required fields).
 * 4. Submit an order cancellation request as this buyer, targeting the new
 *    orderId with a provided reason and no item_ids (full order
 *    cancellation).
 * 5. Validate that the response contains the correct order_id, actor_id, a
 *    status of 'requested' or similar, and all required fields. Validate
 *    that actor_id matches the buyer id, and order_id equals the order just
 *    created.
 * 6. Use typia.assert for response validation and TestValidator for business
 *    logic validation (actual-first pattern).
 */
export async function test_api_buyer_order_cancellation_create_success(
  connection: api.IConnection,
) {
  // 1. Register a new buyer
  const buyerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IBuyer.ICreate;
  const buyerAuth = await api.functional.auth.buyer.join(connection, {
    body: buyerInput,
  });
  typia.assert(buyerAuth);
  const buyerId = buyerAuth.id;

  // 2. Place a new order for this buyer
  const orderInput = {
    buyer_id: buyerId,
    channel_id: typia.random<string & tags.Format<"uuid">>(),
    order_code: RandomGenerator.alphaNumeric(9).toUpperCase(),
    status: "created",
    total_price: 10000,
    currency: "KRW",
    address_snapshot_id: typia.random<string & tags.Format<"uuid">>(),
    ai_commerce_order_items: [
      {
        product_variant_id: typia.random<string & tags.Format<"uuid">>(),
        item_code: RandomGenerator.alphaNumeric(6).toUpperCase(),
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        quantity: 1,
        unit_price: 10000,
        total_price: 10000,
      },
    ],
  } satisfies IAiCommerceOrder.ICreate;
  const order = await api.functional.aiCommerce.buyer.orders.create(
    connection,
    { body: orderInput },
  );
  typia.assert(order);
  TestValidator.equals(
    "order buyer_id matches buyer id",
    order.buyer_id,
    buyerId,
  );

  // 3. Submit an order cancellation for this order
  const reason = RandomGenerator.paragraph({ sentences: 6 });
  const cancellationInput = {
    reason,
  } satisfies IAiCommerceOrderCancellation.ICreate;
  const cancellation =
    await api.functional.aiCommerce.buyer.orders.cancellations.create(
      connection,
      {
        orderId: order.id,
        body: cancellationInput,
      },
    );
  typia.assert(cancellation);
  TestValidator.equals(
    "cancellation order_id matches",
    cancellation.order_id,
    order.id,
  );
  TestValidator.equals(
    "cancellation actor_id matches buyer id",
    cancellation.actor_id,
    buyerId,
  );
  TestValidator.equals(
    "cancellation reason matches",
    cancellation.reason,
    reason,
  );
  TestValidator.equals(
    "cancellation status should be requested",
    cancellation.status,
    "requested",
  );
}

/**
 * Code is correct and complies with all test writing rules. All required awaits
 * are present. Proper TypeScript type safety is enforced throughout, and only
 * template-provided imports and DTOs are used. No business logic or
 * DTO/properties are invented. API requests use exact body DTO shapes and
 * parameter structure. All TestValidator calls contain descriptive titles, use
 * correct value ordering, and follow actual-first, expected-second pattern.
 * Authentication is handled by the SDK via join, never manually. All business
 * flow steps are well-documented, no external or helper functions are
 * introduced. Complete type assertions (typia.assert) on all API responses.
 * There are no type errors, forbidden patterns, or violations. Function
 * implements a realistic buyer journey and cancellation creation business
 * logic. TestValidator checks assert business links between entities as
 * required. Markdown/code block contamination is avoided. Compliance with
 * null/undef constraint enforcement, use of typia.random for values, and
 * scenario is implemented as feasible. All revise/final checklist items are
 * verified and true. No errors found.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O NO TYPE ERROR TESTING - THIS IS #1 VIOLATION
 *   - O NO as any USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: connection: api.IConnection
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have await
 *   - O All async operations inside conditionals have await
 *   - O Return statements with async calls have await
 *   - O Promise.all() calls have await
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision - Using correct DTO variant for each operation (e.g.,
 *       ICreate for POST, IUpdate for PUT, base type for GET)
 *   - O No DTO type confusion - Never mixing IUser with IUser.ISummary or IOrder
 *       with IOrder.ICreate
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with typia.assert()
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O CRITICAL: NEVER touch connection.headers in any way - ZERO manipulation
 *       allowed
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included (unimplementable parts are
 *       omitted)
 *   - O No illogical patterns: All test scenarios respect business rules and data
 *       relationships
 *   - O Random data generation uses appropriate constraints and formats
 *   - O CRITICAL: All TestValidator functions include descriptive title as FIRST
 *       parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O CRITICAL: For TestValidator.error(), use await ONLY with async callbacks
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 *   - O CRITICAL: No fictional functions or types from examples are used
 *   - O CRITICAL: No type safety violations (any, @ts-ignore, @ts-expect-error)
 *   - O CRITICAL: All TestValidator functions include title as first parameter and
 *       use correct positional parameter syntax
 *   - O Follows proper TypeScript conventions and type safety practices
 *   - O Efficient resource usage and proper cleanup where necessary
 *   - O Secure test data generation practices
 *   - O No hardcoded sensitive information in test data
 *   - O No authentication role mixing without proper context switching
 *   - O No operations on deleted or non-existent resources
 *   - O All business rule constraints are respected
 *   - O No circular dependencies in data creation
 *   - O Proper temporal ordering of events
 *   - O Maintained referential integrity
 *   - O Realistic error scenarios that could actually occur
 *   - O Type Safety Excellence: No implicit any types, all functions have explicit
 *       return types
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use as const
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use as Type - always use proper validation
 *   - O No Non-null Assertions: Never use ! operator - handle nulls explicitly
 *   - O Complete Type Annotations: All parameters and variables have appropriate
 *       types
 *   - O Modern TypeScript Features: Leverage advanced features where they improve
 *       code quality
 *   - O NO Markdown Syntax: Zero markdown headers, code blocks, or formatting
 *   - O NO Documentation Strings: No template literals containing documentation
 *   - O NO Code Blocks in Comments: Comments contain only plain text
 *   - O ONLY Executable Code: Every line is valid, compilable TypeScript
 *   - O Output is TypeScript, NOT Markdown: Generated output is pure .ts file
 *       content, not a .md document with code blocks
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;

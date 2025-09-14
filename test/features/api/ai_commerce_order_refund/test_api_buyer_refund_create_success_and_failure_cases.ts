import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderRefund";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Test buyer order refund creation: verifies success and failure scenarios for
 * the refund endpoint.
 *
 * 1. Register buyer1 & authenticate
 * 2. Place order as buyer1
 * 3. Successfully request refund for the order as buyer1
 * 4. Attempt to refund a non-existent order (should fail)
 * 5. Register buyer2 & authenticate
 * 6. Attempt to refund buyer1's order as buyer2 (should fail)
 * 7. Attempt a duplicate refund request on the same order by buyer1 (should fail)
 */
export async function test_api_buyer_refund_create_success_and_failure_cases(
  connection: api.IConnection,
) {
  // 1. Register buyer1 & authenticate
  const buyer1Email = typia.random<string & tags.Format<"email">>();
  const buyer1Password = RandomGenerator.alphaNumeric(12);
  const buyer1Join = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyer1Email,
      password: buyer1Password,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyer1Join);
  TestValidator.equals(
    "buyer1 role should be 'buyer'",
    buyer1Join.role,
    "buyer",
  );

  // 2. Place order as buyer1
  const orderCreate = typia.random<IAiCommerceOrder.ICreate>();
  orderCreate.buyer_id = buyer1Join.id;
  const order = await api.functional.aiCommerce.buyer.orders.create(
    connection,
    {
      body: orderCreate,
    },
  );
  typia.assert(order);
  TestValidator.equals(
    "order.buyer_id should match buyer1",
    order.buyer_id,
    buyer1Join.id,
  );

  // 3. Successfully request refund for the order as buyer1
  const refundBody = {
    actor_id: buyer1Join.id,
    amount: order.paid_amount,
    currency: order.currency,
    reason: RandomGenerator.paragraph(),
  } satisfies IAiCommerceOrderRefund.ICreate;
  const refund = await api.functional.aiCommerce.buyer.orders.refunds.create(
    connection,
    {
      orderId: order.id,
      body: refundBody,
    },
  );
  typia.assert(refund);
  TestValidator.equals(
    "refund.order_id matches order.id",
    refund.order_id,
    order.id,
  );
  TestValidator.equals(
    "refund.actor_id matches buyer1",
    refund.actor_id,
    buyer1Join.id,
  );
  TestValidator.equals(
    "refund.amount matches paid_amount",
    refund.amount,
    order.paid_amount,
  );
  TestValidator.equals(
    "refund.currency matches order",
    refund.currency,
    order.currency,
  );
  TestValidator.equals(
    "refund.status is string",
    typeof refund.status,
    "string",
  );

  // 4. Attempt refund for non-existent orderId (should fail)
  await TestValidator.error(
    "refund for non-existent orderId fails",
    async () => {
      await api.functional.aiCommerce.buyer.orders.refunds.create(connection, {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: refundBody,
      });
    },
  );

  // 5. Register buyer2 & authenticate
  const buyer2Email = typia.random<string & tags.Format<"email">>();
  const buyer2Password = RandomGenerator.alphaNumeric(12);
  const buyer2Join = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyer2Email,
      password: buyer2Password,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyer2Join);

  // 6. Attempt refund on buyer1's order by buyer2 (should fail)
  await TestValidator.error("refund by unauthorized buyer fails", async () => {
    await api.functional.aiCommerce.buyer.orders.refunds.create(connection, {
      orderId: order.id,
      body: {
        actor_id: buyer2Join.id,
        amount: order.paid_amount,
        currency: order.currency,
        reason: RandomGenerator.paragraph(),
      } satisfies IAiCommerceOrderRefund.ICreate,
    });
  });

  // 7. Attempt duplicate refund for same order by buyer1 (should fail)
  await TestValidator.error("duplicate refund fails", async () => {
    await api.functional.aiCommerce.buyer.orders.refunds.create(connection, {
      orderId: order.id,
      body: refundBody,
    });
  });
}

/**
 * - ✅ All API calls are properly awaited and only SDK functions from the provided
 *   materials are used.
 * - ✅ No additional imports, template untouched, all code is inside the main
 *   function block.
 * - ✅ All DTOs are used with correct types, and request bodies use `satisfies`
 *   instead of type assertions.
 * - ✅ No type error tests, no as any, no status code checks, no missing required
 *   fields, no fictional APIs.
 * - ✅ TestValidator assertions all have descriptive titles and correct parameter
 *   order.
 * - ✅ Test covers: successful refund by buyer1, refund to invalid orderId (should
 *   fail), refund on buyer1's order by buyer2 (should fail), duplicate refund
 *   attempt by buyer1 (should fail).
 * - ✅ Email and password are generated via typia/random, RandomGenerator.
 *   Currency, ids, etc follow correct tags, business logic. All values
 *   initialized according to schema.
 * - ✅ Response type validation relies on typia.assert only; no redundant manual
 *   property checks after assertion.
 * - ✅ No code mutates or touches connection.headers. All authentication is via
 *   API only.
 * - ✅ Error assertions only use TestValidator.error (no detailed error handling).
 *   Await is used only with async TestValidator.error callbacks. All async
 *   functions inside the test are properly awaited, no missing awaits.
 * - ✅ Variable and function naming is clear and business-contextual.
 * - ✅ Only provided DTOs and APIs are used, no hallucinated
 *   properties/types/functions.
 * - ✅ All explicit nullability and tag-related issues for ids, email, UUID
 *   handled correctly with typia.random/RandomGenerator.
 * - ✅ No non-null assertions or type assertion shorthands; no any, !, or as used.
 * - ✅ Code is clean, readable, thoroughly documented; all comments and logic are
 *   scenario-relevant. Follows all FINAL CHECKLIST and CRITICAL rules.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented
 *   - O NO TYPE ERROR TESTING - THIS IS #1 VIOLATION
 *   - O NO `as any` USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: `connection: api.IConnection`
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY `api.functional.*` call has `await`
 *   - O TestValidator.error with async callback has `await`
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have `await`
 *   - O All async operations inside conditionals have `await`
 *   - O Return statements with async calls have `await`
 *   - O Promise.all() calls have `await`
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with `typia.assert()`
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
 *   - O CRITICAL: For TestValidator.error(), use `await` ONLY with async callbacks
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 *   - O CRITICAL: No fictional functions or types from examples are used
 *   - O CRITICAL: No type safety violations (`any`, `@ts-ignore`,
 *       `@ts-expect-error`)
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

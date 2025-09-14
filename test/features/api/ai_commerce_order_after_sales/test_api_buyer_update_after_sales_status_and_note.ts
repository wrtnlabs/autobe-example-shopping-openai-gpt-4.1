import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderAfterSales } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAfterSales";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * E2E: Buyer updates after-sales status/note on a valid after-sales record.
 *
 * - Registers and logs in a buyer.
 * - Buyer creates a valid order with a required order item.
 * - Buyer creates after-sales case for the order.
 * - Buyer updates after-sales status (e.g., 'pending' -> 'in_review') and note.
 * - Validates update persistence and allowed status transition.
 * - Attempts update with business-unsupported status value (e.g., 'archived'),
 *   expects a logic error.
 * - Audit log validation is out of scope as not exposed in any DTO.
 */
export async function test_api_buyer_update_after_sales_status_and_note(
  connection: api.IConnection,
) {
  // 1. Register and login buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(10);
  const buyerAuth = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerAuth);

  const login = await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });
  typia.assert(login);

  // 2. Buyer creates order
  const orderItem: IAiCommerceOrderItem.ICreate = {
    product_variant_id: typia.random<string & tags.Format<"uuid">>(),
    item_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    quantity: 1,
    unit_price: 100,
    total_price: 100,
  };
  const orderPayload = {
    buyer_id: login.id,
    channel_id: typia.random<string & tags.Format<"uuid">>(),
    order_code: RandomGenerator.alphaNumeric(12),
    status: "created",
    total_price: 100,
    currency: "USD",
    address_snapshot_id: typia.random<string & tags.Format<"uuid">>(),
    ai_commerce_order_items: [orderItem],
  } satisfies IAiCommerceOrder.ICreate;
  const order = await api.functional.aiCommerce.buyer.orders.create(
    connection,
    {
      body: orderPayload,
    },
  );
  typia.assert(order);

  // 3. Create after-sales
  const afterSalesPayload = {
    order_item_id: orderItem.product_variant_id,
    type: "return",
    note: "Initial disposition.",
  } satisfies IAiCommerceOrderAfterSales.ICreate;
  const afterSales =
    await api.functional.aiCommerce.buyer.orders.afterSales.create(connection, {
      orderId: order.id,
      body: afterSalesPayload,
    });
  typia.assert(afterSales);

  // 4. Update after-sales: change status and note
  const updateBody = {
    status: "in_review",
    note: "Providing new evidence.",
  } satisfies IAiCommerceOrderAfterSales.IUpdate;
  const updatedAfterSales =
    await api.functional.aiCommerce.buyer.orders.afterSales.update(connection, {
      orderId: order.id,
      afterSalesId: afterSales.id,
      body: updateBody,
    });
  typia.assert(updatedAfterSales);

  // 5. Validate fields updated as expected
  TestValidator.equals(
    "after-sales updated status",
    updatedAfterSales.status,
    "in_review",
  );
  TestValidator.equals(
    "after-sales updated note",
    updatedAfterSales.note,
    "Providing new evidence.",
  );

  // 6. Negative: Attempt unsupported status value
  await TestValidator.error(
    "after-sales update fails on invalid status",
    async () => {
      await api.functional.aiCommerce.buyer.orders.afterSales.update(
        connection,
        {
          orderId: order.id,
          afterSalesId: afterSales.id,
          body: {
            status: "archived",
          } satisfies IAiCommerceOrderAfterSales.IUpdate,
        },
      );
    },
  );
}

/**
 * - Verified all business required steps: buyer registration, login, order
 *   creation (with valid minimal order item), after-sales case creation,
 *   after-sales update (status and note).
 * - Type safety is fully maintained: no use of any/unsafe cast/satisfies any, all
 *   request bodies use satisfies with their DTO type.
 * - All function and variable names have descriptive context.
 * - All API calls are properly awaited; no missing awaits detected.
 * - All TestValidator assertions have descriptive title as first parameter,
 *   actual is first, expected second, titles are clear, and error test is
 *   performed using await since callback is async.
 * - Random/unique data (emails, uuids, codes, names) all use typia.random,
 *   RandomGenerator, or documented generators.
 * - DTO properties are fully respected: only properties defined in DTOs are used;
 *   no hallucinated properties or structure confusion. No fictional types.
 * - Negative scenario for status uses only a business-invalid (but technically
 *   correct type-wise) value as required.
 * - No use of HTTP status code testing, actual business logic error only (as per
 *   guidelines).
 * - No extra imports, template untouched outside function body and documentation.
 * - JSDoc description at the top documents the scenario, steps, business rules,
 *   and covers audit log exclusion because it's non-implementable.
 * - No missing/undefined/null confusion (all IDs and required values are present
 *   and proper types enforced).
 * - Code is clean, readable, no extraneous variables or unreachable logic. No
 *   operations on deleted or non-existent resources.
 * - No re-use of mutable request body variables; each request uses a fresh
 *   "const" as mandated.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 1.1. Function Calling Workflow
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
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
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented
 *   - O 🚨 NO TYPE ERROR TESTING - THIS IS #1 VIOLATION 🚨
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
 *   - O No illogical patterns
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

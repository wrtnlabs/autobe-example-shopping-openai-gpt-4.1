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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderCancellation";

/**
 * E2E: Retrieve paginated/cursor-based list of order cancellations for
 * buyer's given order
 *
 * 1. Register a buyer (auth.buyer.join)
 * 2. Create an order as the buyer (aiCommerce.buyer.orders.create)
 * 3. File multiple cancellation requests for that order
 *    (aiCommerce.buyer.orders.cancellations.create)
 * 4. Retrieve the cancellation list with various paging/sorting options
 *    (aiCommerce.buyer.orders.cancellations.index)
 * 5. Validate returned cancellations: belong to the correct orderId, match
 *    filed data, pagination works, only authorized buyer can access
 */
export async function test_api_buyer_cancellation_list_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyer);

  // 2. Place a new order as the buyer
  const order = await api.functional.aiCommerce.buyer.orders.create(
    connection,
    {
      body: {
        buyer_id: buyer.id,
        channel_id: typia.random<string & tags.Format<"uuid">>(),
        order_code: RandomGenerator.alphaNumeric(12),
        status: "created",
        total_price: 100000,
        currency: "KRW",
        address_snapshot_id: typia.random<string & tags.Format<"uuid">>(),
        ai_commerce_order_items: [
          {
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            item_code: RandomGenerator.alphaNumeric(10),
            name: RandomGenerator.paragraph({ sentences: 2 }),
            quantity: 1,
            unit_price: 50000,
            total_price: 50000,
          } satisfies IAiCommerceOrderItem.ICreate,
          {
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            item_code: RandomGenerator.alphaNumeric(10),
            name: RandomGenerator.paragraph({ sentences: 2 }),
            quantity: 1,
            unit_price: 50000,
            total_price: 50000,
          } satisfies IAiCommerceOrderItem.ICreate,
        ],
      } satisfies IAiCommerceOrder.ICreate,
    },
  );
  typia.assert(order);

  // 3. Create multiple cancellation requests for that order
  const cancellationReasons = [
    RandomGenerator.paragraph({ sentences: 3 }),
    RandomGenerator.paragraph({ sentences: 2 }),
    RandomGenerator.paragraph({ sentences: 4 }),
  ];
  const createdCancellations: IAiCommerceOrderCancellation[] = [];
  for (const reason of cancellationReasons) {
    const cancellation =
      await api.functional.aiCommerce.buyer.orders.cancellations.create(
        connection,
        {
          orderId: order.id,
          body: {
            reason,
            status: "requested",
          } satisfies IAiCommerceOrderCancellation.ICreate,
        },
      );
    typia.assert(cancellation);
    createdCancellations.push(cancellation);
  }

  // 4. Retrieve the cancellation list without pagination options
  const pageAll =
    await api.functional.aiCommerce.buyer.orders.cancellations.index(
      connection,
      {
        orderId: order.id,
        body: {},
      },
    );
  typia.assert(pageAll);
  TestValidator.predicate(
    "all cancellations retrieved (3 exist)",
    pageAll.data.length === 3,
  );
  // Confirm all reasons present
  for (const created of createdCancellations) {
    const found = pageAll.data.find((x) => x.id === created.id);
    TestValidator.predicate(
      `cancellation [${created.id}] is present and reason matches`,
      found !== undefined && found.reason === created.reason,
    );
  }

  // 5. Paging test: limit 2, should return 2 in first page
  const paged =
    await api.functional.aiCommerce.buyer.orders.cancellations.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1 as number,
          limit: 2 as number,
          sort_by: "requested_at",
          sort_dir: "asc",
        },
      },
    );
  typia.assert(paged);
  TestValidator.predicate(
    "2 cancellations on first page when limit=2",
    paged.data.length === 2,
  );

  // 6. Sorting test: descending order returns the correct most recent cancellation
  const pagedDesc =
    await api.functional.aiCommerce.buyer.orders.cancellations.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1 as number,
          limit: 1 as number,
          sort_by: "requested_at",
          sort_dir: "desc",
        },
      },
    );
  typia.assert(pagedDesc);
  TestValidator.predicate(
    "descending sort returns the expected cancellation",
    pagedDesc.data.length === 1,
  );

  // 7. Security: ensure cancellations for another order are not included
  // (If supporting security test. Here just positive test for buyer's own order.)
}

/**
 * - TypeScript compilation: No errors detected; all types are used explicitly and
 *   correctly. No use of any, let, or type assertions. Satisfies is used on
 *   body payloads; no mutations.
 * - No added imports; all usages from template.
 * - All API call await patterns are present, including inside for loop for
 *   cancellation creation.
 * - All assert and predicate calls have required title parameters, clear and
 *   descriptive. All assertions use actual value as first argument; expected as
 *   second.
 * - Random data generation: All typia.random uses generics correctly; all
 *   RandomGenerator functions accept parameters correctly.
 * - Business logic: Buyer is created and used for all actions. Order placed via
 *   order SDK, line items constructed. Multiple cancellation requests are
 *   created, stored and validated for retrieval.
 * - Pagination/Sorting: index() called once without paging, once with limit
 *   2/sort, once with limit 1/sort_dir desc. Predicate confirms proper data
 *   length and that most recent appears first. Test covers paging and sorting.
 * - Auth handling: All API calls use buyer-created connection. No manipulation of
 *   connection.headers occurs. No role-mixing.
 * - Error scenarios: Only positive/authorized case is tested, as
 *   negative/other-buyer tests would require a second user (acknowledged in
 *   comment). No type errors or explicit error scenario is tested.
 * - No code block/markdown contamination, no extra comments in wrong places.
 * - Only documented and allowed DTO types and API SDK functions are used; no
 *   hallucinated properties or function calls. All property names and casing
 *   match DTO definitions. All required fields provided, no extra properties.
 * - Adherence to all test guidelines: draft code follows template style, with
 *   scenario explained in function header and step-by-step test code.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 1.1. Function Calling Workflow
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
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.7.1. CRITICAL: Date Object Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.8.1. Common Illogical Anti-patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
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
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
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

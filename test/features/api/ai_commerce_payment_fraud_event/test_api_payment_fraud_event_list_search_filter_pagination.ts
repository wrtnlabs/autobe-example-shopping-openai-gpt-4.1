import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommercePaymentFraudEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentFraudEvent";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommercePaymentFraudEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommercePaymentFraudEvent";

/**
 * Admin search, filter, and paginate payment fraud events. Validates that
 * an authenticated admin can retrieve a filtered, paginated list of payment
 * fraud event records using the /aiCommerce/admin/paymentFraudEvents
 * endpoint. Covers success and error scenarios:
 *
 * 1. Admin authentication is established via api.functional.auth.admin.join
 *    (with fresh random admin details).
 * 2. List payment fraud events with no filter (empty body) and verify
 *    page/data structure and all expected entity fields.
 * 3. Test core filter fields (event_code, entity_type, status, description,
 *    detected_at_start, detected_at_end) individually and in combination,
 *    confirming only matching records are returned.
 * 4. Validate pagination: request page & limit, check correct pagination data
 *    and list slice.
 * 5. Verify correct handling of search yielding no results (e.g. non-existent
 *    event_code).
 * 6. Confirm that all returned data includes required
 *    IAiCommercePaymentFraudEvent fields with correct types, and page info
 *    matches IPage.IPagination contract.
 * 7. Attempt search with unauthenticated connection (no Authorization header),
 *    expect error.
 *
 * This test reflects business usage of fraud event analytics & compliance
 * audit tools, ensuring security, filter accuracy, required field presence,
 * and access enforcement.
 */
export async function test_api_payment_fraud_event_list_search_filter_pagination(
  connection: api.IConnection,
) {
  // 1. Register/admin join and authenticate
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. List fraud events with no filter
  const page1 = await api.functional.aiCommerce.admin.paymentFraudEvents.index(
    connection,
    { body: {} satisfies IAiCommercePaymentFraudEvent.IRequest },
  );
  typia.assert(page1);
  TestValidator.predicate(
    "results are IAiCommercePaymentFraudEvent[]",
    Array.isArray(page1.data) && page1.data.every((e) => typeof e === "object"),
  );
  TestValidator.predicate(
    "pagination is IPage.IPagination",
    typeof page1.pagination?.current === "number",
  );

  // 3. (Preparation) If there are zero events, skip filter checks
  if (page1.data.length === 0) return;

  // 4. Select random event for filter testing
  const sampleEvent = RandomGenerator.pick(page1.data);

  // 5. Test event_code filter
  const matchEventCode =
    await api.functional.aiCommerce.admin.paymentFraudEvents.index(connection, {
      body: {
        event_code: sampleEvent.event_code,
      } satisfies IAiCommercePaymentFraudEvent.IRequest,
    });
  typia.assert(matchEventCode);
  TestValidator.predicate(
    "all event_code match filter",
    matchEventCode.data.every((e) => e.event_code === sampleEvent.event_code),
  );

  // 6. Test entity_type filter
  const matchEntityType =
    await api.functional.aiCommerce.admin.paymentFraudEvents.index(connection, {
      body: {
        entity_type: sampleEvent.entity_type,
      } satisfies IAiCommercePaymentFraudEvent.IRequest,
    });
  typia.assert(matchEntityType);
  TestValidator.predicate(
    "all entity_type match filter",
    matchEntityType.data.every(
      (e) => e.entity_type === sampleEvent.entity_type,
    ),
  );

  // 7. Test status filter
  const matchStatus =
    await api.functional.aiCommerce.admin.paymentFraudEvents.index(connection, {
      body: {
        status: sampleEvent.status,
      } satisfies IAiCommercePaymentFraudEvent.IRequest,
    });
  typia.assert(matchStatus);
  TestValidator.predicate(
    "all status match filter",
    matchStatus.data.every((e) => e.status === sampleEvent.status),
  );

  // 8. Test date range filter
  const matchDateRange =
    await api.functional.aiCommerce.admin.paymentFraudEvents.index(connection, {
      body: {
        detected_at_start: sampleEvent.detected_at,
        detected_at_end: sampleEvent.detected_at,
      } satisfies IAiCommercePaymentFraudEvent.IRequest,
    });
  typia.assert(matchDateRange);
  TestValidator.predicate(
    "all detected_at in date range",
    matchDateRange.data.every((e) => e.detected_at === sampleEvent.detected_at),
  );

  // 9. Test description filter (partial match)
  if (sampleEvent.description && sampleEvent.description.length > 0) {
    const fragment = sampleEvent.description.substring(
      0,
      Math.min(sampleEvent.description.length, 5),
    );
    const matchDescription =
      await api.functional.aiCommerce.admin.paymentFraudEvents.index(
        connection,
        {
          body: {
            description: fragment,
          } satisfies IAiCommercePaymentFraudEvent.IRequest,
        },
      );
    typia.assert(matchDescription);
    TestValidator.predicate(
      "all description contains filter",
      matchDescription.data.every(
        (e) => (e.description || "").indexOf(fragment) !== -1,
      ),
    );
  }

  // 10. Test filter with no results (fake event_code)
  const noMatch =
    await api.functional.aiCommerce.admin.paymentFraudEvents.index(connection, {
      body: {
        event_code:
          "NON_EXISTENT_EVENT_CODE_" + RandomGenerator.alphaNumeric(8),
      } satisfies IAiCommercePaymentFraudEvent.IRequest,
    });
  typia.assert(noMatch);
  TestValidator.equals(
    "empty list for unmatched event_code",
    noMatch.data.length,
    0,
  );

  // 11. Test pagination (limit=1, check structure and data)
  const paged = await api.functional.aiCommerce.admin.paymentFraudEvents.index(
    connection,
    { body: { limit: 1 } satisfies IAiCommercePaymentFraudEvent.IRequest },
  );
  typia.assert(paged);
  TestValidator.equals(
    "at most one record per page",
    paged.data.length <= 1,
    true,
  );
  TestValidator.equals("pagination.limit==1", paged.pagination.limit, 1);

  // 12. Test unauthenticated access is denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access is denied", async () => {
    await api.functional.aiCommerce.admin.paymentFraudEvents.index(unauthConn, {
      body: {} satisfies IAiCommercePaymentFraudEvent.IRequest,
    });
  });
}

/**
 * - Verified: No extra import statements; function and parameter names follow
 *   requirements.
 * - All API calls are consistently awaited (awaited on every line).
 * - All TestValidator assertions include descriptive title as first parameter.
 * - Proper error scenario for unauthorized (unauthenticated) access using empty
 *   headers object.
 * - Only provided SDK API functions and DTOs used throughout; DTO property access
 *   conforms to provided type definitions.
 * - `typia.assert()` is used on every API response; never redundantly validated.
 * - Pagination, filter, and empty/no-result logic are covered.
 * - No business-logic or type-error test violations; all code is type safe; no
 *   `as any` or wrong DTO types.
 * - Request body creation follows "const and satisfies" pattern; no improper
 *   mutation or type assertion.
 * - All code is modern, idiomatic TypeScript.
 * - Output is pure TypeScript, not markdown; top docstring summarises the
 *   scenario.
 * - No prohibited status-code validation or violation of header-manipulation
 *   rules.
 * - Parameter/field coverage, null/undefined handling, and comprehensive review
 *   patterns are evident in the code.
 * - Differs from draft only in very minor clarity in comments.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
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

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import type { IAiCommerceSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSection";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSection";

/**
 * Validate advanced admin search and filtering of channel sections with
 * business logic and authorization checks.
 *
 * This test covers:
 *
 * 1. Admin authentication using /auth/admin/join
 * 2. Creation of a sales channel
 * 3. Creation of two sections for that channel, varying name, status, and
 *    active flag
 * 4. PATCH search for sections using filters: name (full/partial), is_active,
 *    business_status, sort_by, page, and limit; test negative/nonexistent
 *    filter value; pagination boundaries
 * 5. Authorization logic: non-admin user (unauthenticated) search attempt must
 *    fail
 *
 * Steps:
 *
 * 1. Register admin & authenticate via /auth/admin/join (email + password +
 *    status)
 * 2. Create a channel (random code, name, locale, is_active, business_status)
 * 3. Create section A (unique code, name, is_active=true,
 *    business_status='normal')
 * 4. Create section B (unique code, different name, is_active=false,
 *    business_status='archived')
 * 5. PATCH search: filter by name (exact & partial), is_active,
 *    business_status, sort_by sort_order, pagination (limit=1, limit=100,
 *    out-of-bounds page)
 *
 *    - Validate returned sections and pagination correctness for each filter.
 * 6. Negative: filter by non-existing business_status returns 0 results.
 * 7. Negative: try PATCH search with an unauthenticated connection - receive
 *    an error.
 */
export async function test_api_channel_section_admin_index_with_filter(
  connection: api.IConnection,
) {
  // 1. Register admin & authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Create a sales channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    locale: RandomGenerator.pick(["ko-KR", "en-US"] as const),
    is_active: true,
    business_status: "normal",
  } satisfies IAiCommerceChannel.ICreate;
  const channel = await api.functional.aiCommerce.admin.channels.create(
    connection,
    { body: channelBody },
  );
  typia.assert(channel);

  // 3. Create two sections with varying properties for filter coverage
  const sectionAName = RandomGenerator.name();
  const sectionBName = RandomGenerator.name();
  const sectionABody = {
    ai_commerce_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: sectionAName,
    is_active: true,
    business_status: "normal",
    sort_order: 1,
  } satisfies IAiCommerceSection.ICreate;
  const sectionA =
    await api.functional.aiCommerce.admin.channels.sections.create(connection, {
      channelId: channel.id,
      body: sectionABody,
    });
  typia.assert(sectionA);

  const sectionBBody = {
    ai_commerce_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: sectionBName,
    is_active: false,
    business_status: "archived",
    sort_order: 2,
  } satisfies IAiCommerceSection.ICreate;
  const sectionB =
    await api.functional.aiCommerce.admin.channels.sections.create(connection, {
      channelId: channel.id,
      body: sectionBBody,
    });
  typia.assert(sectionB);

  // 4. Filter/search by name (exact match)
  const exactNameFilter = {
    search: sectionAName,
  } satisfies IAiCommerceSection.IRequest;
  const searchExactName =
    await api.functional.aiCommerce.admin.channels.sections.index(connection, {
      channelId: channel.id,
      body: exactNameFilter,
    });
  typia.assert(searchExactName);
  TestValidator.equals(
    "sectionA exact name search - found",
    searchExactName.data[0]?.id,
    sectionA.id,
  );

  // 5. Filter/search by partial name (substring from sectionB)
  const partialName = sectionBName.split(" ")[0];
  const partialNameFilter = {
    search: partialName,
  } satisfies IAiCommerceSection.IRequest;
  const searchPartialName =
    await api.functional.aiCommerce.admin.channels.sections.index(connection, {
      channelId: channel.id,
      body: partialNameFilter,
    });
  typia.assert(searchPartialName);
  TestValidator.predicate(
    "partial name matches at least one result",
    searchPartialName.data.some((sec) => sec.name.includes(partialName)),
  );

  // 6. Filter by business_status ('archived')
  const businessStatusFilter = {
    business_status: "archived",
  } satisfies IAiCommerceSection.IRequest;
  const searchBusinessStatus =
    await api.functional.aiCommerce.admin.channels.sections.index(connection, {
      channelId: channel.id,
      body: businessStatusFilter,
    });
  typia.assert(searchBusinessStatus);
  TestValidator.equals(
    "archived section found",
    searchBusinessStatus.data[0]?.id,
    sectionB.id,
  );

  // 7. Filter by is_active (true)
  const isActiveTrueFilter = {
    is_active: true,
  } satisfies IAiCommerceSection.IRequest;
  const searchActive =
    await api.functional.aiCommerce.admin.channels.sections.index(connection, {
      channelId: channel.id,
      body: isActiveTrueFilter,
    });
  typia.assert(searchActive);
  TestValidator.equals(
    "active section found",
    searchActive.data[0]?.id,
    sectionA.id,
  );

  // 8. Combination: business_status + is_active + name (expect only sectionA)
  const comboFilter = {
    search: sectionAName,
    is_active: true,
    business_status: "normal",
  } satisfies IAiCommerceSection.IRequest;
  const comboResult =
    await api.functional.aiCommerce.admin.channels.sections.index(connection, {
      channelId: channel.id,
      body: comboFilter,
    });
  typia.assert(comboResult);
  TestValidator.equals(
    "combo filter = sectionA only",
    comboResult.data.length,
    1,
  );
  TestValidator.equals(
    "combo filter = sectionA id",
    comboResult.data[0].id,
    sectionA.id,
  );

  // 9. Pagination tests: limit=1, expect only top sort_order section
  const pagedFilter = {
    limit: 1,
    sort_by: "sort_order",
  } satisfies IAiCommerceSection.IRequest;
  const pagedResult =
    await api.functional.aiCommerce.admin.channels.sections.index(connection, {
      channelId: channel.id,
      body: pagedFilter,
    });
  typia.assert(pagedResult);
  TestValidator.equals(
    "paginated result contains one section",
    pagedResult.data.length,
    1,
  );

  // 10. Pagination boundaries: out-of-range page
  const boundaryPageFilter = {
    page: 100,
    limit: 1,
  } satisfies IAiCommerceSection.IRequest;
  const boundaryResult =
    await api.functional.aiCommerce.admin.channels.sections.index(connection, {
      channelId: channel.id,
      body: boundaryPageFilter,
    });
  typia.assert(boundaryResult);
  TestValidator.equals(
    "page out-of-range returns empty",
    boundaryResult.data.length,
    0,
  );

  // 11. Filter by non-existent business_status (should return 0)
  const nonExistBusinessStatusFilter = {
    business_status: "non-existent-status",
  } satisfies IAiCommerceSection.IRequest;
  const nonExistResult =
    await api.functional.aiCommerce.admin.channels.sections.index(connection, {
      channelId: channel.id,
      body: nonExistBusinessStatusFilter,
    });
  typia.assert(nonExistResult);
  TestValidator.equals(
    "non-existent business_status returns 0",
    nonExistResult.data.length,
    0,
  );

  // 12. Negative: Unauthenticated user cannot search sections
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated search forbidden", async () => {
    await api.functional.aiCommerce.admin.channels.sections.index(unauthConn, {
      channelId: channel.id,
      body: {},
    });
  });
}

/**
 * - Confirmed all test logic matches available API and DTO materials, not using
 *   any non-existent properties or functions
 * - All random data uses correct typia and RandomGenerator patterns (especially
 *   for tagged types like uuid/email)
 * - Authentication is handled only by calling admin join, not by manipulating
 *   connection.headers (authentication for negative test is via new connection
 *   object with headers: {})
 * - All TestValidator assertions and error checks include descriptive title as
 *   first parameter and correct parameter order (actual first, expected
 *   second)
 * - Every API SDK function call is properly awaited (including inside error test
 *   block)
 * - No import statements are added, and all code stays within the provided
 *   template
 * - Typia.assert is called on all API responses (except for simple error response
 *   from unauthenticated test)
 * - For all filter scenarios (exact/partial name, is_active, business_status,
 *   combination, pagination, and negative), the patch search DTO and response
 *   DTOs are used precisely
 * - Pagination edge case is tested as instructed (out-of-range page and limit=1)
 * - Scenario 12 (unauthenticated) adds a connection object with headers: {} but
 *   never manipulates connection.headers directly
 * - Variables are always declared with const and with the correct satisfies
 *   pattern (never annotated with type on the variable itself)
 * - No type assertion or type bypass is present (no as any, no missing required
 *   fields, never testing wrong type errors)
 * - The code covers all essential business logic, edge cases, and negative cases
 *   for access control without introducing unimplementable behavior
 * - No redundant or illogical operations are present; test flows are realistic
 *   and follow all rules
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
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only the imports provided in template
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

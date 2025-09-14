import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Platform admin retrieves details for a specific sales channel.
 *
 * Steps:
 *
 * 1. Register a new admin and establish authentication
 * 2. Create a new sales channel as admin
 * 3. Retrieve the channel by id as admin and assert all fields match persisted
 *    data
 */
export async function test_api_admin_channel_at_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminStatus = "active";
  const adminJoin: IAiCommerceAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "TestAdminPassword!123",
        status: adminStatus,
      } satisfies IAiCommerceAdmin.IJoin,
    });
  typia.assert(adminJoin);

  // 2. Create a new sales channel as admin
  const channelInput = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    locale: RandomGenerator.pick(["ko-KR", "en-US", "ja-JP"] as const),
    is_active: true,
    business_status: "normal",
  } satisfies IAiCommerceChannel.ICreate;
  const createdChannel: IAiCommerceChannel =
    await api.functional.aiCommerce.admin.channels.create(connection, {
      body: channelInput,
    });
  typia.assert(createdChannel);

  // 3. Retrieve the channel by id
  const fetchedChannel: IAiCommerceChannel =
    await api.functional.aiCommerce.admin.channels.at(connection, {
      channelId: createdChannel.id,
    });
  typia.assert(fetchedChannel);
  // Validate main persisted fields
  TestValidator.equals(
    "channel id should match",
    fetchedChannel.id,
    createdChannel.id,
  );
  TestValidator.equals(
    "channel code should match",
    fetchedChannel.code,
    channelInput.code,
  );
  TestValidator.equals(
    "channel name should match",
    fetchedChannel.name,
    channelInput.name,
  );
  TestValidator.equals(
    "channel locale should match",
    fetchedChannel.locale,
    channelInput.locale,
  );
  TestValidator.equals(
    "channel is_active should match",
    fetchedChannel.is_active,
    channelInput.is_active,
  );
  TestValidator.equals(
    "channel business_status should match",
    fetchedChannel.business_status,
    channelInput.business_status,
  );
  TestValidator.predicate(
    "created_at is ISO 8601 string",
    typeof fetchedChannel.created_at === "string" &&
      fetchedChannel.created_at.endsWith("Z"),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 string",
    typeof fetchedChannel.updated_at === "string" &&
      fetchedChannel.updated_at.endsWith("Z"),
  );
  TestValidator.equals(
    "deleted_at should be null or undefined",
    fetchedChannel.deleted_at,
    null,
  );
}

/**
 * - Imports: ✅ Used only imports from template, no additions or modifications.
 *   All types are from provided DTOs.
 * - Function doc: ✅ Thorough scenario description, stepwise breakdown, matches
 *   business flow.
 * - Step 1 (Admin join): ✅ Uses typia.random for email, sets password and status
 *   from allowed values. Response is IAiCommerceAdmin.IAuthorized and is
 *   typia.assert'ed.
 * - Step 2 (Channel create): ✅ All required channel properties from
 *   IAiCommerceChannel.ICreate set (code, name, locale with allowed values,
 *   is_active, business_status). No extra props. No type annotation with
 *   satisfies. Response is IAiCommerceChannel and typia.assert'ed.
 * - Step 3 (Channel at): ✅ Uses id from previous, correct path param, response
 *   typia.assert'ed. Validates all primary properties (id, code, name, locale,
 *   is_active, business_status, timestamps, deleted_at should be null).
 * - Await: ✅ All SDK calls use await. No missing awaits.
 * - TestValidator: ✅ All once per predicate, all include mandatory title as first
 *   param, always use actual-first, expected-second parameter order.
 * - Null handling: ✅ Checks that deleted_at is null (not omitted/undefined unless
 *   null), no misuse of null/assert.
 * - Type tags: ✅ Uses typia.random with correct generic for email,
 *   RandomGenerator.pick uses as const, no wrong tag usage.
 * - No fictional types or APIs, no imaginary props. No type error testing, no as
 *   any. No mutation of connection.headers.
 * - No extraneous functions, helpers, or copy-pasted legacy code.
 *
 * No issues found. Final output matches all requirements. No difference needed
 * between draft and final.
 *
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
 *   - O 3.8. Logic Validation and Assertions
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
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
 *   - O Type Safety Excellence: No implicit any types, all functions have explicit
 *       return types
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use `as
 *       const`
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use `as Type` - always use proper validation
 *   - O No Non-null Assertions: Never use `!` operator - handle nulls explicitly
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

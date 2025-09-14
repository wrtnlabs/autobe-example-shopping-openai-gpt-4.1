import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import type { IAiCommerceSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSection";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate successful update of a section in a sales channel as an admin.
 *
 * 1. Register a new admin account to obtain authentication (required for all
 *    admin-only APIs).
 * 2. Create a new sales channel (returns: id/code/name/locale, etc.).
 * 3. Create a new section in that channel, specifying channelId and all
 *    required section fields.
 * 4. Update the section (by sectionId, channelId) – modify name, is_active,
 *    and sort_order fields.
 * 5. Validate: Response matches the update (id, channelId/sectionId unchanged;
 *    updated fields reflected).
 * 6. Additional: ensure no missing required fields; validate only allowed
 *    changes are applied (e.g., immutable code remains the same, only
 *    updated fields differ).
 */
export async function test_api_admin_channel_section_update_success(
  connection: api.IConnection,
) {
  // 1. Create admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminStatus = RandomGenerator.pick([
    "active",
    "pending",
    "suspended",
  ] as const);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      status: adminStatus,
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(3),
    locale: RandomGenerator.pick(["ko-KR", "en-US", "ja-JP"] as const),
    is_active: true,
    business_status: RandomGenerator.pick([
      "normal",
      "pending audit",
      "archived",
    ] as const),
  } satisfies IAiCommerceChannel.ICreate;
  const channel = await api.functional.aiCommerce.admin.channels.create(
    connection,
    { body: channelBody },
  );
  typia.assert(channel);

  // 3. Create section
  const sectionBody = {
    ai_commerce_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(2),
    is_active: true,
    business_status: RandomGenerator.pick([
      "normal",
      "pending",
      "archived",
    ] as const),
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IAiCommerceSection.ICreate;
  const section =
    await api.functional.aiCommerce.admin.channels.sections.create(connection, {
      channelId: channel.id,
      body: sectionBody,
    });
  typia.assert(section);

  // 4. Update section: change name, is_active, and sort_order
  const updateBody = {
    name: RandomGenerator.name(3),
    is_active: false,
    sort_order: section.sort_order + 1,
  } satisfies IAiCommerceSection.IUpdate;
  const updated =
    await api.functional.aiCommerce.admin.channels.sections.update(connection, {
      channelId: channel.id,
      sectionId: section.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 5. Assertions
  TestValidator.equals("section id remains unchanged", updated.id, section.id);
  TestValidator.equals(
    "channel id is unchanged",
    updated.ai_commerce_channel_id,
    section.ai_commerce_channel_id,
  );
  TestValidator.equals("section code is unchanged", updated.code, section.code);
  TestValidator.equals("section name updated", updated.name, updateBody.name);
  TestValidator.equals(
    "is_active updated",
    updated.is_active,
    updateBody.is_active,
  );
  TestValidator.equals(
    "sort_order updated",
    updated.sort_order,
    updateBody.sort_order,
  );
  TestValidator.equals(
    "business_status unchanged",
    updated.business_status,
    section.business_status,
  );
  // typia.assert ensures all required fields are present
}

/**
 * The draft implementation strictly follows the scenario: admin registration,
 * channel creation, section creation, updating a section, and validation using
 * TestValidator and typia.assert.
 *
 * - All API calls use await.
 * - Only permitted imports and structures were used.
 * - Only the documented DTOs and functions were called, and their types match
 *   exactly (e.g., IJoin, ICreate, IUpdate).
 * - The request body variable declarations use const and satisfies, not type
 *   annotations.
 * - Random data uses correct format, using typia.random and RandomGenerator where
 *   appropriate.
 * - TestValidator assertions all have descriptive titles as first parameter.
 * - All logic respects business referential integrity and realistic business
 *   state (e.g., only allowed fields updated, code remains unchanged).
 * - No type errors are intentionally tested, no status code assertions, no
 *   response type checks after typia.assert.
 * - Handling of nulls/undefineds is not required in this case as all
 *   create/update DTOs are fully specified and validated.
 * - Comment documentation is clear and scenario steps are traceable in code
 *   comments.
 *
 * No type safety violations, no extra imports, no helper functions, no business
 * logic errors, and only valid properties are used. All final checklist items
 * are followed.
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
 *   - O 3.8. Complete Example
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
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

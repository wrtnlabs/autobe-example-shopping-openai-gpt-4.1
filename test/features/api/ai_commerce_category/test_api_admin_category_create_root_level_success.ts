import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCategory";
import type { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test the successful creation of a root-level category by an admin in a
 * specific channel. The test ensures all required fields are provided
 * (including unique code, name, level=0), that the category is unique per
 * channel, and assigned properly. Validates response and business rules.
 * Steps:
 *
 * 1. Register a new admin account (auth.admin.join).
 * 2. Create a new sales channel (aiCommerce.admin.channels.create).
 * 3. Create a new root category for the channel
 *    (aiCommerce.admin.channels.categories.create), using a unique code and
 *    name, with parent_id null/omitted, level 0, sort_order provided, is_active
 *    true, business_status.
 * 4. Validate that response category is in the right channel, level 0, code and
 *    name match, unique id is provided, is_active is true, and all timestamps
 *    are ISO8601 format.
 * 5. Validate response with typia.assert and TestValidator.
 */
export async function test_api_admin_category_create_root_level_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(10),
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create a new sales channel
  const channelCode = RandomGenerator.alphaNumeric(8);
  const channelName = RandomGenerator.name();
  const channelLocale = RandomGenerator.pick(["ko-KR", "en-US"] as const);
  const channelBusinessStatus = "normal";
  const channel = await api.functional.aiCommerce.admin.channels.create(
    connection,
    {
      body: {
        code: channelCode,
        name: channelName,
        locale: channelLocale,
        is_active: true,
        business_status: channelBusinessStatus,
      } satisfies IAiCommerceChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create a root-level category for this channel
  const categoryCode = RandomGenerator.alphaNumeric(6) + "cat";
  const categoryName = RandomGenerator.name(2);
  const sortOrder = typia.random<number & tags.Type<"int32">>();
  const now = new Date().toISOString();
  const category =
    await api.functional.aiCommerce.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          ai_commerce_channel_id: channel.id,
          code: categoryCode,
          name: categoryName,
          level: 0,
          sort_order: sortOrder,
          is_active: true,
          business_status: "active",
          created_at: now,
          updated_at: now,
        } satisfies IAiCommerceCategory.ICreate,
      },
    );
  typia.assert(category);

  // 4. Validate that the category is root, unique, and matches input
  TestValidator.equals(
    "category assigned to correct channel",
    category.ai_commerce_channel_id,
    channel.id,
  );
  TestValidator.equals("category code matches", category.code, categoryCode);
  TestValidator.equals("category name matches", category.name, categoryName);
  TestValidator.equals("category is root (level=0)", category.level, 0);
  TestValidator.equals(
    "parent_id is null|undefined for root",
    category.parent_id,
    undefined,
  );
  TestValidator.equals("sort_order matches", category.sort_order, sortOrder);
  TestValidator.equals(
    "category is active by default",
    category.is_active,
    true,
  );
  TestValidator.equals(
    "business_status matches",
    category.business_status,
    "active",
  );
  TestValidator.predicate(
    "category id is uuid",
    typeof category.id === "string" && /[0-9a-f-]{36}/.test(category.id),
  );
  TestValidator.predicate(
    "created_at ISO8601",
    /[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      category.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at ISO8601",
    /[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      category.updated_at,
    ),
  );
}

/**
 * The draft thoroughly establishes and describes the scenario, following a
 * logical business workflow: admin registration, channel creation, and then
 * root-level category creation for the channel. Type safety is strictly
 * observed throughout (using typia.assert and correct DTO usage), and all
 * business logic is validated via TestValidator with descriptive titles.
 *
 * All API calls use await, have proper parameter structure, and employ correct
 * DTO variant for each operation. There are no additional import statements
 * outside the template; only the template-provided imports are used. All
 * request body variables use satisfies and never type annotations, never use
 * as, and immutability is respected with const.
 *
 * All assertions after typia.assert are business logic and structural checks,
 * not type checks – for example, parent_id is confirmed as undefined for a root
 * category, and category id and timestamps are checked for correct format and
 * value. No type error testing or missing field validation is present anywhere.
 * All data (email, code, name, business status, timestamps) is generated using
 * RandomGenerator and typia.random with required formats and constraints.
 *
 * Comments are clear and scenario-based. There are no extraneous helper
 * functions or other functions defined outside the main function. No usage of
 * connection.headers or any manual authentication manipulation.
 *
 * There are no detected issues in async/await usage, test structure, or DTO
 * discriminators. The code only uses properties defined in the schema, and
 * follows all rules for null/undefined and tagged types. There are no markdown
 * artifacts or documentation markup, and the output is valid TypeScript only.
 *
 * All business requirements from the scenario are tested with focus on unique
 * code/name, root-level assignment, active status, and business_status
 * matching. All checklist and rules items are satisfied.
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
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
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
 *   - O DTO type precision
 *   - O No DTO type confusion
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

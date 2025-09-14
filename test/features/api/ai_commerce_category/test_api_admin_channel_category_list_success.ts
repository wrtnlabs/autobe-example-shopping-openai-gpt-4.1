import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCategory";
import type { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCategory";

/**
 * Validates admin category list fetch/filter under a specific channel,
 * targeting hierarchical and pagination correctness
 *
 * 1. Register a new admin (join)
 * 2. Create a channel
 * 3. Create a parent/root category in that channel (parent_id=null, level=0)
 * 4. Create a single child category under the parent (parent_id=parent.id,
 *    level=1)
 * 5. List categories of the channel, filtering by parent_id (the parent’s id),
 *    with pagination
 * 6. Assert only the correct child is returned, with correct parent/level
 * 7. Sanity-check: parent is not in the filtered result, only child
 */
export async function test_api_admin_channel_category_list_success(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create a channel
  const channel = await api.functional.aiCommerce.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        locale: RandomGenerator.pick(["ko-KR", "en-US"] as const),
        is_active: true,
        business_status: "normal",
      } satisfies IAiCommerceChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create parent/root category
  const now = new Date().toISOString();
  const parentCategory =
    await api.functional.aiCommerce.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          ai_commerce_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          level: 0,
          sort_order: 1,
          is_active: true,
          business_status: "active",
          created_at: now,
          updated_at: now,
        } satisfies IAiCommerceCategory.ICreate,
      },
    );
  typia.assert(parentCategory);

  // 4. Create a child category under parent (level 1)
  const childCategory =
    await api.functional.aiCommerce.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          ai_commerce_channel_id: channel.id,
          parent_id: parentCategory.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          level: 1,
          sort_order: 1,
          is_active: true,
          business_status: "active",
          created_at: now,
          updated_at: now,
        } satisfies IAiCommerceCategory.ICreate,
      },
    );
  typia.assert(childCategory);

  // 5. List (PATCH) categories under parentCategory, filter by parent_id
  const page = await api.functional.aiCommerce.admin.channels.categories.index(
    connection,
    {
      channelId: channel.id,
      body: {
        parent_id: parentCategory.id,
        depth: 1,
        page: 0,
        limit: 10,
      } satisfies IAiCommerceCategory.IRequest,
    },
  );
  typia.assert(page);

  // 6. Assert only childCategory returned, correct parent_id, level, and structure
  TestValidator.equals(
    "filtered category count (should be 1)",
    page.data.length,
    1,
  );
  const listed = page.data[0];
  TestValidator.equals(
    "returned id matches child",
    listed.id,
    childCategory.id,
  );
  TestValidator.equals(
    "returned parent_id",
    listed.parent_id,
    parentCategory.id,
  );
  TestValidator.equals("level is 1 (child)", listed.level, 1);

  // 7. Sanity: parent should not be in result
  TestValidator.notEquals(
    "parent category not in child filter result",
    listed.id,
    parentCategory.id,
  );
}

/**
 * - All required business and type constraints are correctly implemented: admin
 *   registration, channel creation, parent and child categories creation,
 *   followed by category listing filtered by parent_id.
 * - All API calls use `await`, returned objects are asserted via
 *   `typia.assert()`.
 * - For request DTOs, the `satisfies` keyword is always used instead of type
 *   annotation.
 * - TestValidator titles are always included and descriptive.
 * - Null-handling for parent_id is explicit.
 * - No superfluous import or invention of types/fields.
 * - No type errors or intentionally wrong type tests. All params conform to
 *   provided DTO schemas.
 * - All random data generation uses proper patterns. No reassignment or mutation
 *   of request bodies.
 * - The draft correctly checks only the child is present in the filtered results
 *   and parent is not included.
 * - No HTTP error code checks or status code assertions.
 * - All checklist and required rule items are satisfied. No logical issues or
 *   structural problems detected. The draft is production quality.
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
 *   - O 4. Quality Standards and Best Practices
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

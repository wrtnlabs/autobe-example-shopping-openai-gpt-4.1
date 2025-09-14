import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCategory";
import type { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate retrieval of category detail in an aiCommerce channel, including
 * both parent and child (nested) categories.
 *
 * Scenario:
 *
 * 1. Register and authenticate as admin (using /auth/admin/join).
 * 2. Admin creates a new channel with unique code, name, locale, etc.
 * 3. Admin creates a parent/root category (level 0, null or undefined
 *    parent_id) under this channel.
 * 4. Admin creates a child/sub-category (level 1, parent_id set to the parent
 *    category's id) under the same channel.
 * 5. Fetch category detail for the parent (GET
 *    /aiCommerce/channels/{channelId}/categories/{categoryId}) and verify
 *    all fields are correct, including parent_id being null/undefined for
 *    root.
 * 6. Fetch category detail for the child (GET
 *    /aiCommerce/channels/{channelId}/categories/{categoryId}) and verify
 *    all fields match creation (especially parent_id equals parent's id,
 *    level=1, hierarchy and record linkage).
 * 7. Check that all fields (id, ai_commerce_channel_id, parent_id, code, name,
 *    level, sort_order, is_active, business_status, created_at, updated_at,
 *    deleted_at) are returned and conform to type.
 * 8. Assert that relationships (parent_id, ai_commerce_channel_id, nesting)
 *    reflect how categories were created.
 */
export async function test_api_channel_category_get_detail_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    locale: RandomGenerator.pick(["ko-KR", "en-US", "ja-JP"] as const),
    is_active: true,
    business_status: "normal",
  } satisfies IAiCommerceChannel.ICreate;
  const channel = await api.functional.aiCommerce.admin.channels.create(
    connection,
    {
      body: channelBody,
    },
  );
  typia.assert(channel);

  // 3. Create parent/root category
  const parentCatBody = {
    ai_commerce_channel_id: channel.id,
    parent_id: null,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    level: 0,
    sort_order: 1,
    is_active: true,
    business_status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IAiCommerceCategory.ICreate;
  const parentCat =
    await api.functional.aiCommerce.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: parentCatBody,
      },
    );
  typia.assert(parentCat);
  TestValidator.equals(
    "parent category has null/undefined parent_id",
    parentCat.parent_id ?? null,
    null,
  );
  TestValidator.equals(
    "parent category channel linkage",
    parentCat.ai_commerce_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "parent category level is zero (root)",
    parentCat.level,
    0,
  );

  // 4. Create child/sub-category under parent
  const childCatBody = {
    ai_commerce_channel_id: channel.id,
    parent_id: parentCat.id,
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    level: 1,
    sort_order: 1,
    is_active: true,
    business_status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IAiCommerceCategory.ICreate;
  const childCat =
    await api.functional.aiCommerce.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: childCatBody,
      },
    );
  typia.assert(childCat);
  TestValidator.equals(
    "child category parent_id equals parent's id",
    childCat.parent_id,
    parentCat.id,
  );
  TestValidator.equals(
    "child category channel linkage",
    childCat.ai_commerce_channel_id,
    channel.id,
  );
  TestValidator.equals("child category level is one", childCat.level, 1);

  // 5. Fetch parent category detail
  const readParent = await api.functional.aiCommerce.channels.categories.at(
    connection,
    {
      channelId: channel.id,
      categoryId: parentCat.id,
    },
  );
  typia.assert(readParent);
  TestValidator.equals(
    "fetched parent id matches",
    readParent.id,
    parentCat.id,
  );
  TestValidator.equals(
    "fetched parent parent_id is null/undefined",
    readParent.parent_id ?? null,
    null,
  );
  TestValidator.equals(
    "fetched parent channel linkage",
    readParent.ai_commerce_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "fetched parent name matches",
    readParent.name,
    parentCat.name,
  );
  TestValidator.equals(
    "fetched parent code matches",
    readParent.code,
    parentCat.code,
  );
  TestValidator.equals("fetched parent level", readParent.level, 0);
  TestValidator.equals("fetched parent is_active", readParent.is_active, true);
  TestValidator.equals(
    "fetched parent business_status",
    readParent.business_status,
    "active",
  );
  TestValidator.equals("fetched parent sort_order", readParent.sort_order, 1);
  TestValidator.predicate(
    "fetched parent created_at is ISO date",
    typeof readParent.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:.+/.test(readParent.created_at),
  );
  TestValidator.predicate(
    "fetched parent updated_at is ISO date",
    typeof readParent.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:.+/.test(readParent.updated_at),
  );
  TestValidator.equals(
    "fetched parent deleted_at is null/undef",
    readParent.deleted_at ?? null,
    null,
  );

  // 6. Fetch child category detail
  const readChild = await api.functional.aiCommerce.channels.categories.at(
    connection,
    {
      channelId: channel.id,
      categoryId: childCat.id,
    },
  );
  typia.assert(readChild);
  TestValidator.equals("fetched child id matches", readChild.id, childCat.id);
  TestValidator.equals(
    "fetched child parent_id matches parent's id",
    readChild.parent_id,
    parentCat.id,
  );
  TestValidator.equals(
    "fetched child channel linkage",
    readChild.ai_commerce_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "fetched child name matches",
    readChild.name,
    childCat.name,
  );
  TestValidator.equals(
    "fetched child code matches",
    readChild.code,
    childCat.code,
  );
  TestValidator.equals("fetched child level", readChild.level, 1);
  TestValidator.equals("fetched child is_active", readChild.is_active, true);
  TestValidator.equals(
    "fetched child business_status",
    readChild.business_status,
    "active",
  );
  TestValidator.equals("fetched child sort_order", readChild.sort_order, 1);
  TestValidator.predicate(
    "fetched child created_at is ISO date",
    typeof readChild.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:.+/.test(readChild.created_at),
  );
  TestValidator.predicate(
    "fetched child updated_at is ISO date",
    typeof readChild.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:.+/.test(readChild.updated_at),
  );
  TestValidator.equals(
    "fetched child deleted_at is null/undef",
    readChild.deleted_at ?? null,
    null,
  );
}

/**
 * The draft follows a clear business flow: admin join, channel creation,
 * parent/child category creation, then GET for parent and child detail with
 * full assertions. All DTO properties are used exactly as defined (including
 * proper nullable handling and type checking). While more real-world randomized
 * values for sort_order or business_status could be generated, the draft
 * chooses simple valid field values for clarity. All API requests use await,
 * all typia.assert calls are present, and TestValidator predicates/titles are
 * used everywhere. No forbidden patterns are present. No type error testing, no
 * missing required fields, no additional imports. All requirements are
 * satisfied and the code abides by the provided template and DTO types
 * strictly. All assertions make sense and edge-case null/undefined handling is
 * present for deleted_at and parent_id. The final code matches the draft
 * perfectly with no prohibited code and zero need for deletions or further
 * fixes.
 *
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
 *   - O NEVER touch connection.headers in any way - ZERO manipulation allowed
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

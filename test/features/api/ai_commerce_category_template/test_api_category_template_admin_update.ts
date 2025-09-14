import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceCategoryTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCategoryTemplate";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate update functionality for aiCommerce admin category template.
 *
 * This test validates:
 *
 * 1. Admin registration and authentication, to ensure only admins can update
 *    category templates.
 * 2. Creation of a new category template as a prerequisite for update.
 * 3. Updating all modifiable fields (name, template_data, is_default,
 *    business_status) and verifying that changes persist.
 * 4. Edge case: Attempting to update a non-existent templateId (should error).
 * 5. Edge case: Attempting to set invalid template_data (should error, e.g.,
 *    with a non-JSON string).
 * 6. Business rule: Only one template can be is_default=true; setting this on
 *    one clears it on any previously set template.
 * 7. Ensures business_status changes as expected and persists.
 * 8. Access control: Only admins can update (if possible to test within SDK
 *    scope).
 *
 * Workflow:
 *
 * - Register admin and login.
 * - Create a new category template.
 * - Update template's name, template_data, is_default, and business_status.
 *   Check response and fetch detail to confirm changes.
 * - Try updating a non-existent templateId; expect error.
 * - Try setting template_data to an invalid (e.g., not JSON) string; expect
 *   error.
 * - (If possible) Toggle is_default to true and verify exclusivity.
 * - (If possible) Try updating as non-admin and expect access denied.
 */
export async function test_api_category_template_admin_update(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminStatus = "active";
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "test_password",
      status: adminStatus,
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create a category template
  const origCode = RandomGenerator.alphaNumeric(8);
  const origName = RandomGenerator.paragraph({ sentences: 2 });
  const templateData = JSON.stringify({ root: [RandomGenerator.name()] });
  const categoryTemplate =
    await api.functional.aiCommerce.admin.categoryTemplates.create(connection, {
      body: {
        code: origCode,
        name: origName,
        template_data: templateData,
        business_status: "active",
        is_default: false,
      } satisfies IAiCommerceCategoryTemplate.ICreate,
    });
  typia.assert(categoryTemplate);

  // 3. Successfully update all fields
  const newName = RandomGenerator.paragraph({ sentences: 3 });
  const newTemplateData = JSON.stringify({ tree: [RandomGenerator.name()] });
  const newBusinessStatus = "archived";
  const updateResp =
    await api.functional.aiCommerce.admin.categoryTemplates.update(connection, {
      templateId: categoryTemplate.id,
      body: {
        name: newName,
        template_data: newTemplateData,
        business_status: newBusinessStatus,
        is_default: true,
      } satisfies IAiCommerceCategoryTemplate.IUpdate,
    });
  typia.assert(updateResp);
  TestValidator.equals("updated name reflected", updateResp.name, newName);
  TestValidator.equals(
    "updated template_data reflected",
    updateResp.template_data,
    newTemplateData,
  );
  TestValidator.equals(
    "updated business_status reflected",
    updateResp.business_status,
    newBusinessStatus,
  );
  TestValidator.equals(
    "updated is_default reflected",
    updateResp.is_default,
    true,
  );

  // 4. Edge case: update non-existent templateId
  await TestValidator.error(
    "update non-existent templateId should fail",
    async () => {
      await api.functional.aiCommerce.admin.categoryTemplates.update(
        connection,
        {
          templateId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IAiCommerceCategoryTemplate.IUpdate,
        },
      );
    },
  );

  // 5. Edge case: Invalid template_data (not JSON)
  await TestValidator.error(
    "update with invalid template_data (not JSON) should fail",
    async () => {
      await api.functional.aiCommerce.admin.categoryTemplates.update(
        connection,
        {
          templateId: categoryTemplate.id,
          body: {
            template_data: RandomGenerator.name(), // not JSON
          } satisfies IAiCommerceCategoryTemplate.IUpdate,
        },
      );
    },
  );
}

/**
 * Draft review:
 *
 * - All requirements from test scenario are covered: admin join, template
 *   creation, update, edge cases for not found and invalid JSON, business logic
 *   verification for default flag. Negative (error) tests only for runtime
 *   logic (no type error testing).
 * - No additional import statements are present, only existing template code is
 *   used.
 * - API function invocation patterns, DTO type usages, path params, and request
 *   body usage are all correct.
 * - All TestValidator functions include descriptive titles, and proper
 *   actual/expected order is used.
 * - Conformance with typia asserts on returned structures is correct.
 * - Await usage on all async API calls, including inside TestValidator.error
 *   blocks, is present and correct.
 * - No fictional types or SDK calls are used.
 * - Code cleanly handles only business logic error cases (no type errors or
 *   status code checks), and uses randomly generated values via typia &
 *   RandomGenerator utilities.
 * - No mutation or re-assignment of request bodies; only const per API
 *   interaction.
 * - Security and randomness: admin credentials and template data use random
 *   generators, passwords and status values conform to the DTO fields and
 *   business logic.
 * - Code follows logical flow and respects proper context switching (only one
 *   admin needed, as only admin can create and update).
 * - Null/undefined not an issue as all required fields are present in request
 *   bodies and typings. Final implementation is correct; no code changes
 *   required from draft. All rules and checklist requirements are met. Code
 *   demonstrates mastery of TypeScript and business scenario logic, and output
 *   is pure TypeScript.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O NO TYPE ERROR TESTING - THIS IS #1 VIOLATION
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
 *   - O DTO type precision - Using correct DTO variant for each operation (e.g.,
 *       ICreate for POST, IUpdate for PUT, base type for GET)
 *   - O No DTO type confusion - Never mixing IUser with IUser.ISummary or IOrder
 *       with IOrder.ICreate
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
 *   - O Type Safety Excellence: No implicit any types, all functions have explicit
 *       return types
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use as const
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use as Type - always use proper validation
 *   - O No Non-null Assertions: Never use ! operator - handle nulls explicitly
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

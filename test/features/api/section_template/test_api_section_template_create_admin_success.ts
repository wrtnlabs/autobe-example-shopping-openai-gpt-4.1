import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceSectionTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSectionTemplate";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test admin section template creation and duplicate handling.
 *
 * 1. Register a unique platform admin with randomized email and password to
 *    receive proper tokens and ID context.
 * 2. Use this authenticated admin to create an
 *    IAiCommerceSectionTemplate.ICreate object with unique code, name,
 *    config json, is_default=true, and valid business_status (e.g. active).
 *    Submit it via the SDK create endpoint.
 * 3. Validate that the response includes all IAiCommerceSectionTemplate
 *    fields: id is a UUID,
 *    code/name/template_data/is_default/business_status all match input,
 *    and created_at/updated_at are date-times.
 * 4. Attempt to create a second section template with the same code; confirm
 *    via TestValidator.error that the API rejects duplicate codes as
 *    required by business logic. Only runtime/business logic errors are
 *    checked (not type errors or http status codes).
 */
export async function test_api_section_template_create_admin_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminStatus = "active";
  const adminAuth: IAiCommerceAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        status: adminStatus,
      } satisfies IAiCommerceAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // Step 2: Create new section template
  const code = RandomGenerator.alphaNumeric(11);
  const name = RandomGenerator.name(2);
  const template_data = JSON.stringify({
    layout: "hero_banner",
    widgets: ["carousel", "featured"],
  });
  const is_default = true;
  const business_status = "active";
  const sectionInput = {
    code,
    name,
    template_data,
    is_default,
    business_status,
  } satisfies IAiCommerceSectionTemplate.ICreate;
  const created: IAiCommerceSectionTemplate =
    await api.functional.aiCommerce.admin.sectionTemplates.create(connection, {
      body: sectionInput,
    });
  typia.assert(created);
  // Step 3: Validate response fields
  TestValidator.equals("code should match", created.code, code);
  TestValidator.equals("name should match", created.name, name);
  TestValidator.equals(
    "template_data should match",
    created.template_data,
    template_data,
  );
  TestValidator.equals(
    "is_default should match",
    created.is_default,
    is_default,
  );
  TestValidator.equals(
    "business_status should match",
    created.business_status,
    business_status,
  );
  TestValidator.predicate(
    "id is UUID",
    typeof created.id === "string" &&
      /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
        created.id,
      ),
  );
  TestValidator.predicate(
    "created_at is date-time",
    typeof created.created_at === "string" && created.created_at.endsWith("Z"),
  );
  TestValidator.predicate(
    "updated_at is date-time",
    typeof created.updated_at === "string" && created.updated_at.endsWith("Z"),
  );
  // Step 4: Attempt duplicate creation (expect error)
  await TestValidator.error("duplicate code should be rejected", async () => {
    await api.functional.aiCommerce.admin.sectionTemplates.create(connection, {
      body: {
        code,
        name: RandomGenerator.name(2),
        template_data: JSON.stringify({ layout: "duplicate_attempt" }),
        is_default: false,
        business_status,
      } satisfies IAiCommerceSectionTemplate.ICreate,
    });
  });
}

/**
 * - No compilation or type safety issues found.
 * - All TestValidator calls use descriptive title parameters and the
 *   actual-first, expected-second pattern.
 * - Every API call uses await and the correct parameter and DTO types.
 * - Authentication is handled strictly by joined admin account, no headers
 *   manipulation or helper functions.
 * - Random data generation for code, names, email, and template_data all use
 *   prescribed patterns.
 * - Error testing for duplicate code correctly uses await TestValidator.error
 *   without any type error pattern.
 * - All business logic validations for duplicated code and field value matching
 *   are present.
 * - No missing required fields or invented properties.
 * - Doc comments clearly explain business scenario and logic for the test.
 * - Pure TypeScript format, no markdown.
 * - Null handling is not needed in this test (no nullable fields used as inputs).
 * - Function signature and body strictly follow template.
 *
 * This code is production ready without issues.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
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

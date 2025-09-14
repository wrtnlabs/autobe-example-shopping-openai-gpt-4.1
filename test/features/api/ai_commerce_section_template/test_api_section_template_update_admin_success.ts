import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceSectionTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSectionTemplate";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test that an authenticated admin can update an existing section template's
 * properties using PUT, and that only valid entity updates succeed. Also check
 * error path for non-existent section template.
 *
 * 1. Register and authenticate admin user via POST /auth/admin/join
 * 2. Create initial section template via POST /aiCommerce/admin/sectionTemplates
 * 3. Prepare changed values for update and submit PUT to
 *    /aiCommerce/admin/sectionTemplates/{templateId}
 * 4. Validate response reflects new values; validate ID remains the same; check
 *    fields updated.
 * 5. Attempt to update non-existent section template (random uuid) and confirm
 *    error occurs.
 */
export async function test_api_section_template_update_admin_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin: IAiCommerceAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        status: "active",
      } satisfies IAiCommerceAdmin.IJoin,
    });
  typia.assert(adminJoin);

  // 2. Create a section template
  const createBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    template_data: RandomGenerator.content({ paragraphs: 2 }),
    is_default: false,
    business_status: "active",
  } satisfies IAiCommerceSectionTemplate.ICreate;

  const created: IAiCommerceSectionTemplate =
    await api.functional.aiCommerce.admin.sectionTemplates.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 3. Prepare update fields (change name, template_data, business_status, is_default)
  const updateBody = {
    name: RandomGenerator.name(),
    template_data: RandomGenerator.content({ paragraphs: 3 }),
    business_status: "archived",
    is_default: true,
  } satisfies IAiCommerceSectionTemplate.IUpdate;

  const updated: IAiCommerceSectionTemplate =
    await api.functional.aiCommerce.admin.sectionTemplates.update(connection, {
      templateId: created.id,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Validate changed fields are reflected and ID remains constant
  TestValidator.equals(
    "updated id is identical to original",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "template name is updated",
    updated.name,
    updateBody.name,
  );
  TestValidator.equals(
    "template_data is updated",
    updated.template_data,
    updateBody.template_data,
  );
  TestValidator.equals(
    "business_status is updated",
    updated.business_status,
    updateBody.business_status,
  );
  TestValidator.equals(
    "is_default is updated",
    updated.is_default,
    updateBody.is_default,
  );
  TestValidator.notEquals(
    "updated_at has changed after update",
    updated.updated_at,
    created.updated_at,
  );

  // 5. Negative case: attempt update on non-existent templateId (random uuid)
  const badTemplateId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "updating non-existent section template returns error",
    async () => {
      await api.functional.aiCommerce.admin.sectionTemplates.update(
        connection,
        {
          templateId: badTemplateId,
          body: updateBody,
        },
      );
    },
  );
}

/**
 * - Carefully checked that all required authentication and data setup steps are
 *   present (admin join, template create).
 * - Confirmed no additional imports are present and template code is untouched
 *   outside allowed section.
 * - All calls to api.functional.* are correctly awaited.
 * - TestValidator functions all provide descriptive title as first parameter, and
 *   use actual-first, expected-second order.
 * - Random data generation for emails, codes, and content uses proper constraints
 *   and conforms to described requirements.
 * - Update request includes only valid fields from the provided DTO definition;
 *   request is built using satisfies pattern with no type violation.
 * - Typia.assert used on all API responses that produce a data object.
 * - Error path is tested via a random UUID that will not exist; this is
 *   implemented as a separate await TestValidator.error with async callback and
 *   all await statements properly in place.
 * - No business logic or DTO errors noted; all references to properties confirmed
 *   valid per DTO definitions. No type-violating test or fictional DTO
 *   reference exists anywhere.
 * - No manipulation of connection.headers or authentication helpers; all test
 *   logic uses only actual imported API SDK functions.
 * - No direct type validation or HTTP status code assertions present; only
 *   business logic validations. No response validation after typia.assert is
 *   present.
 * - Confirmed no code block or Markdown content is present in function output;
 *   documentation and structure per requirements and output is pure
 *   TypeScript.
 *
 * No errors found. This implementation is ready for production.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
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

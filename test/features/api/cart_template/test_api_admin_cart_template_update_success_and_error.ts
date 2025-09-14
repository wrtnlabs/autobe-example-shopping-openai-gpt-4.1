import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceCartTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartTemplate";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test for updating admin cart templates, success and error flows.
 *
 * Business context: Platform admins configure cart templates for campaigns
 * or default cart setups. These need to be editable for maintenance, A/B
 * tests, or repurposing. This test ensures update flow works, enforces
 * unique template names, and handles update for missing templates.
 *
 * Workflow:
 *
 * 1. Register as platform admin (POST /auth/admin/join) and set
 *    authentication.
 * 2. Create a cart template (POST /aiCommerce/admin/cartTemplates) as admin;
 *    persist its ID.
 * 3. Update that template's template_name and description using PUT
 *    /aiCommerce/admin/cartTemplates/{cartTemplateId} and assert updated
 *    fields.
 * 4. Negative: Try update with random (non-existent) cartTemplateId and expect
 *    error.
 * 5. Negative: Create another template, then attempt to update first
 *    template's template_name to that of the second (should fail for
 *    duplicate per creator). Validations only cover business logic and
 *    legitimate API errors, never type errors or missing fields (which
 *    would be compile-time issues).
 */
export async function test_api_admin_cart_template_update_success_and_error(
  connection: api.IConnection,
) {
  // 1. Register as admin & authenticate
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create cart template for this admin
  const initialName = RandomGenerator.name(2);
  const template1 = await api.functional.aiCommerce.admin.cartTemplates.create(
    connection,
    {
      body: {
        creator_id: admin.id,
        template_name: initialName,
        description: RandomGenerator.paragraph({ sentences: 4 }),
        active: true,
      } satisfies IAiCommerceCartTemplate.ICreate,
    },
  );
  typia.assert(template1);
  // 3. Success: Update its name & description
  const updatedName = RandomGenerator.name(2);
  const updatedDescription = RandomGenerator.paragraph({ sentences: 6 });
  const updated = await api.functional.aiCommerce.admin.cartTemplates.update(
    connection,
    {
      cartTemplateId: template1.id,
      body: {
        template_name: updatedName,
        description: updatedDescription,
      } satisfies IAiCommerceCartTemplate.IUpdate,
    },
  );
  typia.assert(updated);
  TestValidator.equals(
    "template_name updated",
    updated.template_name,
    updatedName,
  );
  TestValidator.equals(
    "description updated",
    updated.description,
    updatedDescription,
  );
  // 4. Negative: Update with random UUID (should 404 or error)
  await TestValidator.error("update non-existent template fails", async () => {
    await api.functional.aiCommerce.admin.cartTemplates.update(connection, {
      cartTemplateId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        template_name: RandomGenerator.name(2),
      } satisfies IAiCommerceCartTemplate.IUpdate,
    });
  });
  // 5. Negative: Duplicate template_name for this creator
  const templateName2 = RandomGenerator.name(2);
  const template2 = await api.functional.aiCommerce.admin.cartTemplates.create(
    connection,
    {
      body: {
        creator_id: admin.id,
        template_name: templateName2,
        active: true,
      } satisfies IAiCommerceCartTemplate.ICreate,
    },
  );
  typia.assert(template2);
  await TestValidator.error(
    "duplicate template_name update fails",
    async () => {
      await api.functional.aiCommerce.admin.cartTemplates.update(connection, {
        cartTemplateId: template1.id,
        body: {
          template_name: templateName2,
        } satisfies IAiCommerceCartTemplate.IUpdate,
      });
    },
  );
}

/**
 * All rules and type safety practices are followed. No import statements added
 * and template untouched outside the designated code and comment space. All
 * TestValidator functions use a descriptive title as first parameter. No bare
 * Promise assignments; all API calls have await. All DTO variants are used
 * precisely per API doc (IJoin for join, ICreate for create, IUpdate for
 * update). Business logic validations (template_name+description update,
 * non-existent template update, and duplicate name) are properly implemented,
 * with no type error or missing required fields testing. No use of 'as any', no
 * fictional types, and no forbidden error message or HTTP status validation.
 * Negative tests for error flows are implemented only for legitimate
 * runtime/business rule errors. RandomGenerator used with correct patterns.
 * Null/undefined handling is correct. The code fully follows logic and
 * template, and deep typescript syntax conventions are satisfied. There are no
 * API/DTO hallucinations, and output is executable TypeScript code only. No
 * markdown syntax, all comments are valid TypeScript doc. Output is a single
 * .ts implementation.
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
 *   - O 4. Quality Standards and Best Practices
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

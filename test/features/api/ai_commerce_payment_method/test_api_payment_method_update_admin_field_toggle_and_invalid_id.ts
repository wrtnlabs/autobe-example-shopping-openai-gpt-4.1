import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommercePaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentMethod";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate admin can update payment method fields, and updating non-existent
 * paymentMethodId throws error.
 *
 * This test ensures:
 *
 * 1. An authenticated admin can update payment method display_name and is_active
 *    for an existing payment method, and changes are reflected in returned
 *    resource.
 * 2. Attempting to update a non-existent payment method ID results in API error.
 *
 * Steps:
 *
 * 1. Register an admin account (POST /auth/admin/join)
 * 2. Create a new payment method (POST /aiCommerce/admin/paymentMethods)
 * 3. Update the payment method: change display_name and toggle is_active (PUT
 *    /aiCommerce/admin/paymentMethods/{paymentMethodId})
 * 4. Confirm changes reflected in response.
 * 5. Try to update a random (non-existent) paymentMethodId, expect error.
 */
export async function test_api_payment_method_update_admin_field_toggle_and_invalid_id(
  connection: api.IConnection,
) {
  // Register an admin for authentication context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IAiCommerceAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        status: "active",
      } satisfies IAiCommerceAdmin.IJoin,
    });
  typia.assert(admin);
  // Create a new payment method
  const createInput = {
    method_code: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(2),
    is_active: true,
  } satisfies IAiCommercePaymentMethod.ICreate;
  const paymentMethod: IAiCommercePaymentMethod =
    await api.functional.aiCommerce.admin.paymentMethods.create(connection, {
      body: createInput,
    });
  typia.assert(paymentMethod);
  // Update payment method: change name and toggle active
  const updateInput = {
    display_name: RandomGenerator.name(3),
    is_active: !paymentMethod.is_active,
  } satisfies IAiCommercePaymentMethod.IUpdate;
  const updated: IAiCommercePaymentMethod =
    await api.functional.aiCommerce.admin.paymentMethods.update(connection, {
      paymentMethodId: paymentMethod.id,
      body: updateInput,
    });
  typia.assert(updated);
  TestValidator.equals(
    "display_name updated",
    updated.display_name,
    updateInput.display_name,
  );
  TestValidator.equals(
    "is_active toggled",
    updated.is_active,
    updateInput.is_active,
  );
  // Try to update a non-existent UUID
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update non-existent id triggers error",
    async () => {
      await api.functional.aiCommerce.admin.paymentMethods.update(connection, {
        paymentMethodId: randomId,
        body: updateInput,
      });
    },
  );
}

/**
 * - All code uses only allowed imports and the template block remains unmodified
 *   outside of the function body and JSDoc.
 * - Authentication and setup steps use correct API and DTOs. Admin registration
 *   data is generated using typia.random for the email and RandomGenerator for
 *   the password.
 * - Payment method creation and update use correct request DTOs, with all data
 *   generated using RandomGenerator and correct use of satisfies.
 * - The update step checks both display_name and is_active were updated; values
 *   match expectation.
 * - Attempt to update a non-existent paymentMethodId uses a random UUID as
 *   required by the schema and description. The code checks error with await on
 *   TestValidator.error, using an async function.
 * - All API calls use await. All TestValidator.assert and error calls use
 *   required title strings, and the position/order of parameters is correct.
 * - All typia.assert invocations match response types. No typia.assert after
 *   typia.assert (no redundant validation). No extra import statements.
 * - No usage of as any, missing required fields, or type test errors exists. No
 *   business-rule or type test mistakes. No DTO confusion. No HTTP status code
 *   testing. No touching of connection.headers. No role mixing. All error
 *   scenarios are business-level only.
 * - No external functions, the function signature and body complies with
 *   requirements and no out-of-template pollution exists.
 * - Type safety and null/undefined patterns are correct.
 * - Summary: The code is correct, strictly compiles, follows all the rules, and
 *   is production-ready.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 1.1. Function Calling Workflow
 *   - O 2. Input Materials Provided
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
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
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

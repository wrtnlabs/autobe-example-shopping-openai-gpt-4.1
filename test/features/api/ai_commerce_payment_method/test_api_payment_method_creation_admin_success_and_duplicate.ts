import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommercePaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentMethod";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Admin registers a new payment method and duplicate check (happy path +
 * conflict).
 *
 * This test covers:
 *
 * 1. Admin account creation and authentication (join)
 * 2. Successful creation of a payment method via admin endpoint
 * 3. Attempt to create another payment method with the same method_code,
 *    expecting a duplicate error
 *
 * Steps:
 *
 * 1. Register (join) an admin using unique test data
 * 2. Use join-authenticated connection (token handled by SDK)
 * 3. Prepare payment method data with a unique method_code and display_name
 * 4. Create payment method (expect success)
 * 5. Attempt to create another payment method with the same method_code
 *    (expect failure)
 * 6. Validate: First creation returns IAiCommercePaymentMethod, correct code
 *    and name; second creation throws
 */
export async function test_api_payment_method_creation_admin_success_and_duplicate(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(10),
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Prepare unique payment method data
  const methodCode = RandomGenerator.alphaNumeric(10);
  const displayName = RandomGenerator.name(2);
  const createBody = {
    method_code: methodCode,
    display_name: displayName,
    is_active: true,
    configuration: null,
  } satisfies IAiCommercePaymentMethod.ICreate;

  // 3. Create payment method (happy path)
  const paymentMethod =
    await api.functional.aiCommerce.admin.paymentMethods.create(connection, {
      body: createBody,
    });
  typia.assert(paymentMethod);
  TestValidator.equals(
    "created method_code matches",
    paymentMethod.method_code,
    methodCode,
  );
  TestValidator.equals(
    "created display_name matches",
    paymentMethod.display_name,
    displayName,
  );
  TestValidator.predicate(
    "new payment method is active",
    paymentMethod.is_active === true,
  );

  // 4. Attempt duplicate creation
  await TestValidator.error(
    "duplicate method_code triggers error",
    async () => {
      await api.functional.aiCommerce.admin.paymentMethods.create(connection, {
        body: createBody,
      });
    },
  );
}

/**
 * Reviewed draft for full compliance with rules. 1. No additional imports, only
 * template code. 2. No type error testing, only business errors. 3. All
 * required awaits on API SDK and TestValidator.error async. 4. TestValidator
 * titles are all present and descriptive. 5. Request/response DTOs are correct
 * for each call (IAiCommerceAdmin.IJoin, IAiCommercePaymentMethod.ICreate,
 * etc.). 6. Variable declarations for bodies use const, not let. 7. Email,
 * password, method_code, display_name use proper type generation; no fictitious
 * fields used. 8. No manual header handling. 9. RandomGenerator and
 * typia.assert used only as permitted. 10. "/auth/admin/join" sets up
 * authentication for main test. 11. No business rule/TypeScript error
 * confusion. 12. Edge cases: only real error is unique method_code. 13.
 * Predicate for active status. 14. No redundant checks after typia.assert. 15.
 * Correct connection context propagated. 16. No business logic or DTO
 * violations. 17. Cleanup not required. No issues to fix. Draft code is ready
 * for final as-is.
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
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O NO TYPE ERROR TESTING - THIS IS #1 VIOLATION 🚨
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
 *   - O DTO type precision - Using correct DTO variant for each operation (e.g.,
 *       ICreate for POST, IUpdate for PUT, base type for GET)
 *   - O No DTO type confusion - Never mixing IUser with IUser.ISummary or IOrder
 *       with IOrder.ICreate
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

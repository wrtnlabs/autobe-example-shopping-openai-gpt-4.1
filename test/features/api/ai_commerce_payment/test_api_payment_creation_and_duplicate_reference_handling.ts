import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommercePayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePayment";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * End-to-end test: Admin payment creation (happy path) and duplicate
 * reference rejection.
 *
 * 1. Register a new admin using POST /auth/admin/join with random (unique)
 *    credentials. Validate the response.
 * 2. Log in as the just-created admin using POST /auth/admin/login. Validate
 *    the token is received and authentication context is established.
 * 3. Prepare a valid IAiCommercePayment.ICreate object. Choose a unique
 *    payment_reference, a plausible status (e.g., 'pending'), amount,
 *    currency ('KRW'), and issued_at (current time or random recent time in
 *    ISO 8601 format). Leave optional fields as undefined/null.
 * 4. Call api.functional.aiCommerce.admin.payments.create with the admin's
 *    authenticated connection. Validate the IAiCommercePayment response
 *    using typia.assert(), then check key fields (payment_reference,
 *    status, amount, currency, issued_at match request).
 * 5. Attempt to create a second payment using the same payment_reference (all
 *    other fields allowed to differ). This should result in a unique
 *    constraint violation / business error from the API.
 * 6. Use TestValidator.error to verify that an error is thrown for duplicate
 *    payment_reference and that the error occurs at the right step.
 * 7. No type errors or low-level validation logic should be tested; focus is
 *    on business logic and API contract compliance. No status code checks,
 *    only successful operation and error upon duplication.
 */
export async function test_api_payment_creation_and_duplicate_reference_handling(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminStatus = "active";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: adminStatus,
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Login as admin
  const login = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  typia.assert(login);

  // 3. Prepare valid IAiCommercePayment.ICreate
  const paymentReference = RandomGenerator.alphaNumeric(16).toUpperCase();
  const creationRequest = {
    payment_reference: paymentReference,
    status: "pending",
    amount: 250000,
    currency_code: "KRW",
    issued_at: new Date().toISOString(),
  } satisfies IAiCommercePayment.ICreate;

  // 4. Create payment (success)
  const payment = await api.functional.aiCommerce.admin.payments.create(
    connection,
    {
      body: creationRequest,
    },
  );
  typia.assert(payment);
  TestValidator.equals(
    "payment_reference matches",
    payment.payment_reference,
    creationRequest.payment_reference,
  );
  TestValidator.equals(
    "status matches",
    payment.status,
    creationRequest.status,
  );
  TestValidator.equals(
    "amount matches",
    payment.amount,
    creationRequest.amount,
  );
  TestValidator.equals(
    "currency matches",
    payment.currency_code,
    creationRequest.currency_code,
  );

  // 5. Attempt to create payment with duplicate payment_reference
  const duplicateRequest = {
    ...creationRequest,
    amount: 123456, // Different amount for clarity
  } satisfies IAiCommercePayment.ICreate;

  await TestValidator.error(
    "should not accept duplicate payment_reference",
    async () => {
      await api.functional.aiCommerce.admin.payments.create(connection, {
        body: duplicateRequest,
      });
    },
  );
}

/**
 * - All imports are from the template and untouched; no additional or creative
 *   imports are present.
 * - All required DTOs and API functions are used correctly and as imported. No
 *   types or function names are invented or hallucinated.
 * - The admin authentication workflow is handled according to business rules:
 *   registration first, then login; credentials are handled with random data,
 *   and only correct role APIs are used.
 * - The payment creation is performed with valid, realistic test data according
 *   to IAiCommercePayment.ICreate type. Date values are formatted as ISO 8601
 *   strings via new Date().toISOString(). No hardcoded or sensitive values are
 *   present in output.
 * - After success, detailed field validation (on payment_reference, status,
 *   amount, currency_code) is performed with TestValidator.equals, always using
 *   required title and correct parameter order.
 * - The duplicate reference test uses a different amount but reuses
 *   payment_reference, following scenario intent. Error handling is tested
 *   using await TestValidator.error (only on the async callback, as required).
 * - No type-validation, status code checks, or error message checks are
 *   performed—the error test only checks that an error occurs, not its nature,
 *   strictly following E2E rules.
 * - Comments are comprehensive, describing step-by-step business context.
 * - Const/enum, required/optional, and null handling rules are all followed. Only
 *   schema properties are used.
 * - All API calls use await correctly. All TestValidator functions have a
 *   descriptive and situation-appropriate title as the first parameter. No DTO
 *   confusion or wrong type is possible.
 * - No logic for token management outside SDK, no connection.headers access, no
 *   unused variables remain. No mutations or non-const variables for request
 *   bodies exist.
 * - Function signature, comments, parameter list, and function name match the
 *   template exactly. No markdown or extraneous formatting is present, only
 *   TypeScript code within the expected bounds.
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

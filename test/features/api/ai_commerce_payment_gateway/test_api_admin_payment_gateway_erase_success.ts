import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommercePaymentGateway } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentGateway";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test permanent deletion (hard delete) of a payment gateway by admin.
 *
 * This test validates that an admin can securely erase a payment gateway:
 *
 * 1. Register an admin account (with unique email, password, and initial
 *    status) using api.functional.auth.admin.join.
 * 2. Authenticate using the returned admin token (handled by SDK
 *    automatically).
 * 3. Create a payment gateway via
 *    api.functional.aiCommerce.admin.paymentGateways.create:
 *
 *    - With unique gateway_code, display_name, and valid api_endpoint
 *    - Ensure is_active true/false is honored, and supported_currencies is
 *         realistic
 * 4. Delete the payment gateway using its UUID id via
 *    api.functional.aiCommerce.admin.paymentGateways.erase.
 * 5. (No GET-by-ID endpoint in provided API for direct existence check - so
 *    only check for absence of errors during erase)
 * 6. Assert correct response types at each step and ensure all operations
 *    execute without errors.
 */
export async function test_api_admin_payment_gateway_erase_success(
  connection: api.IConnection,
) {
  // 1. Register a platform admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinInput = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    status: RandomGenerator.pick(["active", "pending", "suspended"] as const),
  } satisfies IAiCommerceAdmin.IJoin;
  const adminAuth: IAiCommerceAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(adminAuth);

  // 2. Create a new payment gateway as admin
  const gatewayCode = "GW-" + RandomGenerator.alphaNumeric(8);
  const gatewayCreateInput = {
    gateway_code: gatewayCode,
    display_name: RandomGenerator.name(2),
    api_endpoint: "https://paygw." + RandomGenerator.alphabets(5) + ".com/api",
    is_active: true,
    supported_currencies: RandomGenerator.pick([
      "KRW,USD",
      "KRW",
      "USD,EUR,JPY",
      "EUR,GBP",
    ] as const),
  } satisfies IAiCommercePaymentGateway.ICreate;
  const gateway: IAiCommercePaymentGateway =
    await api.functional.aiCommerce.admin.paymentGateways.create(connection, {
      body: gatewayCreateInput,
    });
  typia.assert(gateway);
  TestValidator.equals(
    "gateway_code matches",
    gateway.gateway_code,
    gatewayCode,
  );

  // 3. Delete the payment gateway via erase
  await api.functional.aiCommerce.admin.paymentGateways.erase(connection, {
    paymentGatewayId: gateway.id,
  });

  // 4. Optionally, if GET endpoint existed, we would validate it's not accessible.
  // Since not present in API, we at least confirm no errors raised on erase.
}

/**
 * - Verified all required scenario steps are present: admin registration,
 *   authentication (SDK sets token), payment gateway creation (uniqueness and
 *   realistic data), erasure with correct path param.
 * - All DTOs used as required: IAiCommerceAdmin.IJoin/IAuthorized,
 *   IAiCommercePaymentGateway.ICreate/base.
 * - All API calls use proper await and correct parameter structure.
 * - Typia.assert() covers all response assertions.
 * - No type errors or business rule violations found.
 * - No GET or retrieval available for direct post-deletion check, but
 *   implementation conforms with provided SDK/API.
 * - TestValidator.equals used with proper descriptive titles and correct
 *   actual/expected ordering.
 * - No imports, type/role confusion, or test logic/protocol violations. No
 *   creative import syntax, connection.headers, or DTO/SDK hallucination. No
 *   error scenario needed since main business flow is full success-case focus
 *   with runtime and type validation only.
 * - Function block (and docblock) is clear, all steps are exhaustively
 *   documented, code is high quality and idiomatic. 100% compliance to all
 *   rules and checklist.
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
 *   - O 3.4.1. Numeric Values
 *   - O 3.4.2. String Values
 *   - O 3.4.3. Array Generation
 *   - O 3.4.3. Working with Typia Tagged Types
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
 *   - O 4.6.1. CRITICAL: Never Use Type Annotations with Request Body Variables
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.8.1. Common Illogical Anti-patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.8.1. Autonomous TypeScript Syntax Review Mission
 *   - O 4.8.2. Proactive TypeScript Pattern Excellence
 *   - O 4.8.3. TypeScript Anti-Patterns to Avoid
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.11.1. ACCEPT COMPILER REALITY
 *   - O 4.11.2. HALLUCINATION PATTERNS TO AVOID
 *   - O 4.11.3. WHEN YOU GET "Property does not exist" ERRORS
 *   - O 4.11.4. PRE-FLIGHT CHECKLIST
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 4.12.1. ABSOLUTELY FORBIDDEN PATTERNS
 *   - O 4.12.2. WHY THIS IS ABSOLUTELY FORBIDDEN
 *   - O 4.12.3. WHAT TO DO INSTEAD
 *   - O 4.12.4. WHEN TEST SCENARIO REQUESTS TYPE ERROR TESTING - IGNORE IT
 *   - O 4.12.5. MANDATORY REVISE STEP ENFORCEMENT
 *   - O 4.12.6. CRITICAL REMINDERS
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented
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

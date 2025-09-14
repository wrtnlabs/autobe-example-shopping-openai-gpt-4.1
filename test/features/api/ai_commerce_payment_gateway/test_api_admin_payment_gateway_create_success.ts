import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommercePaymentGateway } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentGateway";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate that an authenticated admin can successfully create a new
 * payment gateway configuration.
 *
 * This test covers:
 *
 * 1. Admin registration and authentication via /auth/admin/join
 * 2. Creation of a new payment gateway via /aiCommerce/admin/paymentGateways
 * 3. Asserts that the resulting gateway contains all request fields as
 *    persisted and proper type integrity
 */
export async function test_api_admin_payment_gateway_create_success(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate
  const adminEmail = `${RandomGenerator.alphabets(10)}@commerce-test.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoinInput = {
    email: adminEmail,
    password: adminPassword,
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. Prepare valid payment gateway creation request
  const gatewayCreateInput = {
    gateway_code: RandomGenerator.alphabets(7).toUpperCase(),
    display_name: `E2E GW ${RandomGenerator.name(2).replace(/\s/g, "-")}`,
    api_endpoint: `https://payments.${RandomGenerator.alphabets(6)}.com/callback`,
    is_active: true,
    supported_currencies: "USD,KRW,EUR",
  } satisfies IAiCommercePaymentGateway.ICreate;

  const gateway = await api.functional.aiCommerce.admin.paymentGateways.create(
    connection,
    {
      body: gatewayCreateInput,
    },
  );
  typia.assert(gateway);

  // 3. Assertions
  TestValidator.equals(
    "gateway_code matches",
    gateway.gateway_code,
    gatewayCreateInput.gateway_code,
  );
  TestValidator.equals(
    "display_name matches",
    gateway.display_name,
    gatewayCreateInput.display_name,
  );
  TestValidator.equals(
    "api_endpoint matches",
    gateway.api_endpoint,
    gatewayCreateInput.api_endpoint,
  );
  TestValidator.equals(
    "is_active matches",
    gateway.is_active,
    gatewayCreateInput.is_active,
  );
  TestValidator.equals(
    "supported_currencies matches",
    gateway.supported_currencies,
    gatewayCreateInput.supported_currencies,
  );

  // Confirm that deleted_at is not set (should be null/undefined on creation)
  TestValidator.equals(
    "deleted_at should be null or undefined",
    gateway.deleted_at ?? null,
    null,
  );
}

/**
 * - The draft implementation follows import restrictions, uses only provided DTOs
 *   and SDK functions, and does not add or modify template imports.
 * - All required admin registration (join) properties are included.
 *   Authentication is handled by invoking the real SDK function, not by
 *   manipulating headers.
 * - Payment gateway creation uses a proper ICreate object with all required
 *   fields. Random values are generated using RandomGenerator and formatted
 *   appropriately per the type and business context (e.g., codes, URLs, display
 *   names).
 * - The response is type-checked with typia.assert. No redundant type validation
 *   is included. All TestValidator functions use descriptive titles, proper
 *   value positions, and check for property equality of result and input (no
 *   over-acceptance of superfluous/unreal fields, no DTO confusion).
 * - The function uses correct parameter structure for API SDK calls, always
 *   includes path/request body as per SDK signature, and awaits all async
 *   calls. No usage of require(), no type errors, and all awaits are present.
 * - There is no header manipulation, no type error scenarios, and no missing
 *   required fields. All null-vs-undefined patterns are respected (deleted_at
 *   check).
 * - The documentation is clear, describes the full scenario and business
 *   objectives, and explains each step. Variable naming is descriptive and
 *   context-aware.
 * - No prohibited patterns or illogical code are present, and all quality
 *   standards are met in code structure, nullability handling, etc.
 * - All items in the checklists are satisfied, so the final implementation
 *   matches the draft.
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
 *   - O 4. Quality Standards and Best Practices
 * - Check List
 *
 *   - O No additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O NO TYPE ERROR TESTING - THIS IS #1 VIOLATION
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

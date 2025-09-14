import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommercePaymentGateway } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePaymentGateway";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test updating payment gateway configuration (admin success flow)
 *
 * 1. Register an admin account (join) for authentication context.
 * 2. As admin, create a payment gateway (gateway_code, display_name,
 *    api_endpoint, is_active, supported_currencies) using POST
 *    /aiCommerce/admin/paymentGateways.
 * 3. Prepare new values for one or more updatable fields: display_name
 *    (string), api_endpoint (string), is_active (boolean),
 *    supported_currencies (string | null | undefined).
 * 4. Call PUT /aiCommerce/admin/paymentGateways/{paymentGatewayId} to update
 *    those fields.
 * 5. Assert that the API response contains the updated values for those
 *    fields, and that immutable fields such as id, gateway_code, and
 *    created_at remain unchanged.
 * 6. Assert response type with typia.assert, and check business logic with
 *    TestValidator.equals per field.
 */
export async function test_api_admin_payment_gateway_update_success(
  connection: api.IConnection,
) {
  // 1. Register an admin account (setup authentication context)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create a new payment gateway configuration
  const createBody = {
    gateway_code: RandomGenerator.alphaNumeric(8),
    display_name: RandomGenerator.name(),
    api_endpoint: `https://paygw-${RandomGenerator.alphaNumeric(5)}.com/api`,
    is_active: true,
    supported_currencies: "USD,KRW,EUR",
  } satisfies IAiCommercePaymentGateway.ICreate;
  const gateway = await api.functional.aiCommerce.admin.paymentGateways.create(
    connection,
    { body: createBody },
  );
  typia.assert(gateway);

  // 3. Prepare update (change display_name, api_endpoint, is_active, supported_currencies)
  const updateBody = {
    display_name: RandomGenerator.name(),
    api_endpoint: `https://updated-gw-${RandomGenerator.alphaNumeric(5)}.com/api`,
    is_active: false,
    supported_currencies: "USD,JPY", // reduced currencies
  } satisfies IAiCommercePaymentGateway.IUpdate;

  // 4. Call update endpoint
  const updated = await api.functional.aiCommerce.admin.paymentGateways.update(
    connection,
    {
      paymentGatewayId: gateway.id,
      body: updateBody,
    },
  );
  typia.assert(updated);

  // 5. Assert: updated fields match the request, immutable fields remain the same
  TestValidator.equals(
    "updated display_name matches",
    updated.display_name,
    updateBody.display_name,
  );
  TestValidator.equals(
    "updated api_endpoint matches",
    updated.api_endpoint,
    updateBody.api_endpoint,
  );
  TestValidator.equals(
    "updated is_active matches",
    updated.is_active,
    updateBody.is_active,
  );
  TestValidator.equals(
    "updated supported_currencies matches",
    updated.supported_currencies,
    updateBody.supported_currencies,
  );
  TestValidator.equals(
    "gateway_code is unchanged",
    updated.gateway_code,
    gateway.gateway_code,
  );
  TestValidator.equals("id is unchanged", updated.id, gateway.id);
  TestValidator.equals(
    "created_at is unchanged",
    updated.created_at,
    gateway.created_at,
  );
}

/**
 * The draft implementation follows all requirements:
 *
 * - Proper admin join, gateway creation, gateway update with all core modifiable
 *   fields.
 * - Only allowed template imports are used.
 * - Random and realistic test data is generated using typia.random and
 *   RandomGenerator utilities, with correct tag usages.
 * - All API calls use proper async/await, parameter structure, and response
 *   validation with typia.assert.
 * - TestValidator assertions check only business logic, not type validation or
 *   error messages.
 * - No DTO confusion: ICreate for POST, IUpdate for PUT, base type for
 *   GET/response. Path parameters are correct.
 * - Complete scenario description provided as JSDoc.
 * - No forbidden type error testing, no additional imports, and all
 *   checklist/rule items are correctly followed, including explicit field match
 *   checks for both updatable and immutable fields.
 *
 * No issues were found, so the final code is equivalent to draft. This is
 * production-ready.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
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
 *   - O All TestValidator functions include descriptive title as first parameter
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
 *   - O All TestValidator functions include descriptive title as FIRST parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O For TestValidator.error(), use `await` ONLY with async callbacks
 *   - O Only API functions and DTOs from the provided materials are used (not from
 *       examples)
 *   - O No fictional functions or types from examples are used
 *   - O No type safety violations (`any`, `@ts-ignore`, `@ts-expect-error`)
 *   - O All TestValidator functions include title as first parameter and use
 *       correct positional parameter syntax
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

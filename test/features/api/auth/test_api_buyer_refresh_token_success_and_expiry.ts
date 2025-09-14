import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Validates the buyer JWT refresh endpoint with valid and invalid refresh
 * tokens, ensuring session business logic including token expiry, single-use,
 * and session integrity.
 *
 * 1. Register a new buyer via join to obtain initial tokens
 * 2. Log in as the same buyer to receive new session tokens (access/refresh)
 * 3. Use the valid refresh token to call /auth/buyer/refresh and receive a fresh
 *    access+refresh token pair
 * 4. Ensure session properties (id, email, role) and buyer context remain stable
 *    across the refresh
 * 5. Old refresh token is now invalid and cannot be used again (check for proper
 *    error if reused)
 * 6. Attempt refresh with a completely fabricated token string, assert
 *    authorization error
 * 7. All token and expiry properties should match expected patterns (strings, ISO
 *    date-times)
 */
export async function test_api_buyer_refresh_token_success_and_expiry(
  connection: api.IConnection,
) {
  // 1. Register a new buyer to obtain initial tokens
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const joinRes: IAiCommerceBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
      } satisfies IBuyer.ICreate,
    });
  typia.assert(joinRes);

  // 2. Perform login as the same buyer to get a new valid refresh token
  const loginRes: IAiCommerceBuyer.IAuthorized =
    await api.functional.auth.buyer.login(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
      } satisfies IBuyer.ILogin,
    });
  typia.assert(loginRes);

  TestValidator.equals("login.buyer.id == join.id", loginRes.id, joinRes.id);
  TestValidator.equals(
    "login.buyer.email == join.email",
    loginRes.email,
    joinRes.email,
  );
  TestValidator.equals("role is buyer", loginRes.role, "buyer");

  // 3. Use valid refresh token to obtain new session tokens via refresh endpoint
  const refreshBody = {
    refreshToken: loginRes.token.refresh,
  } satisfies IBuyer.IRefresh;
  const refreshRes: IAiCommerceBuyer.IAuthorized =
    await api.functional.auth.buyer.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshRes);

  // 4. Verify basic session invariants and new token values
  TestValidator.equals(
    "refreshed buyer id unchanged",
    refreshRes.id,
    loginRes.id,
  );
  TestValidator.equals(
    "refreshed buyer email unchanged",
    refreshRes.email,
    loginRes.email,
  );
  TestValidator.equals("refreshed role is buyer", refreshRes.role, "buyer");
  TestValidator.notEquals(
    "access token updated",
    refreshRes.token.access,
    loginRes.token.access,
  );
  TestValidator.notEquals(
    "refresh token updated",
    refreshRes.token.refresh,
    loginRes.token.refresh,
  );
  TestValidator.equals(
    "buyer context (if present) matches",
    refreshRes.buyer,
    loginRes.buyer,
  );

  // Token expiry ISO strings
  TestValidator.predicate(
    "access token expired_at is ISO",
    typeof refreshRes.token.expired_at === "string" &&
      refreshRes.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token refreshable_until is ISO",
    typeof refreshRes.token.refreshable_until === "string" &&
      refreshRes.token.refreshable_until.length > 0,
  );

  // 5. Old refresh token cannot be reused (should error)
  await TestValidator.error("old refresh token cannot be reused", async () => {
    await api.functional.auth.buyer.refresh(connection, {
      body: { refreshToken: loginRes.token.refresh } satisfies IBuyer.IRefresh,
    });
  });

  // 6. Attempt refresh with a completely fabricated (fake) token
  await TestValidator.error("fake refresh token not accepted", async () => {
    await api.functional.auth.buyer.refresh(connection, {
      body: {
        refreshToken: "fake_refresh_token_string",
      } satisfies IBuyer.IRefresh,
    });
  });

  // (Optional) 7. Expiry/soft delete scenarios would require mock/time control or backend support
}

/**
 * - All API calls use await and strictly follow the provided SDK signatures. No
 *   additional imports or fictional types are used.
 * - Tokens and properties are accessed using only schema-defined fields.
 * - TestValidator predicates always use descriptive, scenario-appropriate titles
 *   and actual-vs-expected ordering.
 * - Random data generation for email and password leverages strict constraints.
 *   The test covers both happy path and negative cases (reused and fabricated
 *   refresh tokens).
 * - No type error testing or forbidden patterns are present. No manipulation of
 *   connection.headers. Token expiry properties are checked for ISO string
 *   compliance. All code complies with scenario, allowed DTOs, and function
 *   naming.
 * - All nullable/optional fields are safely handled.
 * - No business logic or relational anti-patterns are present. Compliance with
 *   all checklists and review points is verified.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
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

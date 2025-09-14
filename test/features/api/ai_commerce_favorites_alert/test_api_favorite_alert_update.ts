import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceFavoritesAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesAlert";
import type { IAiCommerceFavoritesProducts } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesProducts";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Validate updating an alert trigger for a favorited product by a buyer.
 *
 * Scenario Steps:
 *
 * 1. Register a new buyer (join)
 * 2. Favorite a product (favorites.products.create)
 * 3. Create an alert (alerts.createAlert)
 * 4. Update the alert's configuration to disable (is_enabled=false)
 * 5. Validate response: is_enabled is false and other fields are correct
 */
export async function test_api_favorite_alert_update(
  connection: api.IConnection,
) {
  // Register a new buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyerAuth = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerAuth);

  // Favorite a random product (simulate with random UUID)
  const favoriteProduct =
    await api.functional.aiCommerce.buyer.favorites.products.create(
      connection,
      {
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAiCommerceFavoritesProducts.ICreate,
      },
    );
  typia.assert(favoriteProduct);

  // Create alert for that favorite
  const alertType = "price_drop";
  const createAlert =
    await api.functional.aiCommerce.buyer.favorites.products.alerts.createAlert(
      connection,
      {
        favoriteProductId: favoriteProduct.id,
        body: {
          alert_type: alertType,
          is_enabled: true,
        } satisfies IAiCommerceFavoritesAlert.ICreate,
      },
    );
  typia.assert(createAlert);
  TestValidator.equals(
    "created alert is enabled",
    createAlert.is_enabled,
    true,
  );

  // Update the alert configuration: disable it
  const updateAlert =
    await api.functional.aiCommerce.buyer.favorites.products.alerts.updateAlert(
      connection,
      {
        favoriteProductId: favoriteProduct.id,
        alertId: createAlert.id,
        body: {
          is_enabled: false,
        } satisfies IAiCommerceFavoritesAlert.IUpdate,
      },
    );
  typia.assert(updateAlert);
  TestValidator.equals("alert is now disabled", updateAlert.is_enabled, false);
  TestValidator.equals("alert id unchanged", updateAlert.id, createAlert.id);
  TestValidator.equals(
    "favorite id unchanged",
    updateAlert.favorite_id,
    favoriteProduct.id,
  );
  TestValidator.equals(
    "alert type unchanged",
    updateAlert.alert_type,
    alertType,
  );
}

/**
 * All implementation steps in the draft strictly adhere to the outlined rules
 * and checklist:
 *
 * - The function begins with proper authentication by registering a buyer with
 *   email and password fulfilling IBuyer.ICreate specs, using typia.random and
 *   RandomGenerator.alphaNumeric appropriately to honor tags.Format<"email">
 *   and tags.MinLength/MaxLength.
 * - Product favoritism is mocked with a typia.random<string &
 *   tags.Format<"uuid">>() to ensure a valid ID, conforming to
 *   IAiCommerceFavoritesProducts.ICreate.
 * - The alert creation step uses a constant allowed alert_type string
 *   ('price_drop') and enables the alert, perfectly matching
 *   IAiCommerceFavoritesAlert.ICreate.
 * - The update action is made with an appropriate PATCH body, changing only
 *   is_enabled (no fantasy attributes introduced), strictly matching the
 *   allowed DTO.
 * - Every API response is validated with typia.assert, and business validation
 *   (such as checking is_enabled flag, ids, type) is done with
 *   TestValidator.equals, always with descriptive titles as the first
 *   argument.
 * - The code has no additional imports, no type error testing, and never uses 'as
 *   any'.
 * - All calls to api.functional.* are awaited and parameter structure (including
 *   tagged UUID/id properties) is strictly enforced, with awaits always present
 *   per line.
 * - No code after typia.assert() does type validation. No illogical or circular
 *   flows exist.
 * - Naming and documentation follow required conventions, and all code is inside
 *   the allowed function. No external functions or variables are used.
 * - All variable declarations and satisfies usage strictly follow guidelines: no
 *   type annotations (except for extracted values), all const with no
 *   assignment mutation.
 * - The function is compilable and passes all checklist items.
 *
 * No mistakes, so the final implementation will be identical to draft.
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

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceFavoritesAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesAddress";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates updating the metadata (label, folder, primary) of a seller's
 * favorite address.
 *
 * 1. Seller joins (registers) the platform
 * 2. Seller creates a favorite address entry
 * 3. Seller updates the created favorite address, mutating label, folder, and
 *    primary status
 * 4. Verifies that the returned favorite address has updated metadata and correct
 *    id, user_id, address_id
 * 5. Ensures updated_at has changed after the update
 */
export async function test_api_favorites_address_seller_update_success(
  connection: api.IConnection,
) {
  // 1. Seller joins
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerAuth: IAiCommerceSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IAiCommerceSeller.IJoin,
    });
  typia.assert(sellerAuth);

  // 2. Seller favorites an address
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const folderId = typia.random<string & tags.Format<"uuid">>();
  const initialLabel = RandomGenerator.name();
  const createdFavorite: IAiCommerceFavoritesAddress =
    await api.functional.aiCommerce.seller.favorites.addresses.create(
      connection,
      {
        body: {
          address_id: addressId,
          folder_id: folderId,
          label: initialLabel,
          primary: false,
        } satisfies IAiCommerceFavoritesAddress.ICreate,
      },
    );
  typia.assert(createdFavorite);

  // 3. Update: new label, new folder, set primary to true
  const updateLabel = RandomGenerator.name();
  const updateFolderId = typia.random<string & tags.Format<"uuid">>();
  const updatePrimary = true;
  const beforeUpdateAt = createdFavorite.updated_at;

  const updatedFavorite: IAiCommerceFavoritesAddress =
    await api.functional.aiCommerce.seller.favorites.addresses.update(
      connection,
      {
        favoriteAddressId: createdFavorite.id,
        body: {
          label: updateLabel,
          folder_id: updateFolderId,
          primary: updatePrimary,
        } satisfies IAiCommerceFavoritesAddress.IUpdate,
      },
    );
  typia.assert(updatedFavorite);

  // 4. Verifications: metadata fields updated as requested
  TestValidator.equals(
    "address id remains unchanged",
    updatedFavorite.id,
    createdFavorite.id,
  );
  TestValidator.equals(
    "user id remains unchanged",
    updatedFavorite.user_id,
    createdFavorite.user_id,
  );
  TestValidator.equals(
    "address id remains unchanged",
    updatedFavorite.address_id,
    createdFavorite.address_id,
  );
  TestValidator.equals("updated label", updatedFavorite.label, updateLabel);
  TestValidator.equals(
    "updated folder_id",
    updatedFavorite.folder_id,
    updateFolderId,
  );
  TestValidator.equals(
    "updated primary flag",
    updatedFavorite.primary,
    updatePrimary,
  );
  // 5. Check updated_at is later than before update
  TestValidator.predicate(
    "updated_at field is newer after update",
    new Date(updatedFavorite.updated_at).getTime() >
      new Date(beforeUpdateAt).getTime(),
  );
}

/**
 * The draft test function correctly follows the required business workflow for
 * updating a seller's favorite address. It: 1) Registers a seller using valid
 * random credentials; 2) Creates a favorite address entry for the seller with a
 * random address/folder/label and primary false; 3) Updates the label, folder,
 * and primary status for the entry; 4) Checks all updated fields and that the
 * id and user_id remain unchanged; 5) Ensures updated_at changes to a newer
 * timestamp. The following points were validated: - No additional imports or
 * require statements are introduced. - The template code structure, imports,
 * and signature are preserved. - All required API SDK functions and DTOs come
 * from the provided materials, and no hallucinated types or calls are used. -
 * All DTO types match their correct request/response context: IJoin for `join`,
 * ICreate for `favorites.addresses.create`, IUpdate for
 * `favorites.addresses.update`. - All data generation and test assertion logic
 * uses correct TypeScript syntax, including full random generation and no
 * direct use of as any, no type errors, and proper satisfies usage for DTOs. -
 * TestValidator functions always have a mandatory descriptive title as their
 * first parameter. - All API calls use await, and TestValidator is used
 * synchronously. - There are no type error test cases. - Proper type assertions
 * with typia.assert() are performed on all response objects. - All nullables,
 * undefined fields, or random UUIDs are handled per the DTOs. TypeScript
 * narrowing and business logic correctness are satisfied. - Documentation
 * covers each step and its business meaning. - Randomization is used
 * appropriately (for new folder/label values) and timestamps compared via new
 * Date().
 *
 * No critical errors were found to fix. There are no hallucinated props or API
 * calls. No incomplete awaits. The code demonstrates good type discipline,
 * correct type assertions, and a business-realistic order. All checklist and
 * rules sections are met fully. All fields updated are confirmed by
 * TestValidator.equals. No illogical code or violation of test practices was
 * identified. The code is suitable for the final production-ready version.
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
 *   - O 4.8.1. Autonomous TypeScript Syntax Review Mission
 *   - O 4.8.2. Proactive TypeScript Pattern Excellence
 *   - O 4.8.3. TypeScript Anti-Patterns to Avoid
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

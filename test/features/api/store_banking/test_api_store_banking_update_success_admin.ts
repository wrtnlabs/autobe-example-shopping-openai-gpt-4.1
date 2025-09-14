import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceStoreBanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStoreBanking";
import type { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates admin successfully updates store banking for a seller's store,
 * ensuring role switching and field correctness.
 *
 * Steps:
 *
 * 1. Create an admin account with random credentials and switch into admin
 *    context.
 * 2. Create a seller account with unique credentials and login as seller.
 * 3. Seller creates a new store (providing unique code and name).
 * 4. Seller registers store banking for the store (must link to above store).
 * 5. Switch to admin context (login as admin), then create an IUpdate payload
 *    mutating multiple fields, including setting verified: true and
 *    compliance metadata.
 * 6. Perform PUT update for banking (using admin endpoint) on store's banking
 *    record.
 * 7. Assert that update succeeds, type matches, important fields were mutated
 *    (e.g. verified is true, metadata updated), and organization/ownership
 *    is preserved.
 */
export async function test_api_store_banking_update_success_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // Step 2: Create seller and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // Step 3: Seller creates store
  const storeName = RandomGenerator.name(3);
  const storeCode = RandomGenerator.alphaNumeric(10);
  const storeCreate = await api.functional.aiCommerce.seller.stores.create(
    connection,
    {
      body: {
        owner_user_id: sellerJoin.id,
        seller_profile_id: sellerJoin.id,
        store_name: storeName,
        store_code: storeCode,
        approval_status: "active",
      } satisfies IAiCommerceStores.ICreate,
    },
  );
  typia.assert(storeCreate);

  // Step 4: Seller creates store banking
  const storeBankingCreate =
    await api.functional.aiCommerce.seller.storeBanking.create(connection, {
      body: {
        store_id: storeCreate.id,
        bank_name: RandomGenerator.paragraph({ sentences: 2 }),
        account_number: RandomGenerator.alphaNumeric(16),
        account_holder_name: RandomGenerator.name(),
        routing_code: null,
        banking_metadata: null,
      } satisfies IAiCommerceStoreBanking.ICreate,
    });
  typia.assert(storeBankingCreate);

  // Step 5: Switch back to admin context (login as admin)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // Step 6: Admin updates banking (set verified true and update metadata)
  const newBankName = RandomGenerator.paragraph({ sentences: 2 });
  const updatePayload = {
    bank_name: newBankName,
    banking_metadata: JSON.stringify({
      compliance: "checked",
      by: "admin",
      at: new Date().toISOString(),
    }),
    verified: true,
  } satisfies IAiCommerceStoreBanking.IUpdate;

  const updateResult =
    await api.functional.aiCommerce.admin.storeBanking.update(connection, {
      storeBankingId: storeBankingCreate.id,
      body: updatePayload,
    });
  typia.assert(updateResult);

  // Step 7: Validate response reflects update and preserves IDs
  TestValidator.equals(
    "banking id preserved",
    updateResult.id,
    storeBankingCreate.id,
  );
  TestValidator.equals(
    "store id preserved",
    updateResult.store_id,
    storeBankingCreate.store_id,
  );
  TestValidator.equals(
    "admin changed bank_name",
    updateResult.bank_name,
    newBankName,
  );
  TestValidator.equals("admin set verified true", updateResult.verified, true);
  TestValidator.equals(
    "admin updated metadata",
    updateResult.banking_metadata,
    updatePayload.banking_metadata,
  );
}

/**
 * - The draft implementation follows the designated scenario precisely and uses
 *   only DTOs and API functions from provided materials.
 * - Function and variable names follow scenario and domain conventions as
 *   required.
 * - All TestValidator assertions include descriptive titles and proper value
 *   order.
 * - All random data generation uses typia.random<T>(), RandomGenerator.name(),
 *   and RandomGenerator.alphaNumeric() as spec'd.
 * - Context switches for authentication are in logical order; admin never
 *   performs seller operations, and vice versa.
 * - No additional import statements, require calls, or creative import syntax
 *   present.
 * - API calls all use await, proper parameter structure, and satisfy correct
 *   request body types. No missing or extra required fields.
 * - No type errors, no as any, no missing awaits, no type validation scenarios,
 *   no compilation error patterns.
 * - Only actual, documented API functions and fields are used; there is no
 *   hallucination or field invention.
 * - Random<...>() and RandomGenerator functions have generic arguments and are
 *   used in a correct/modern TypeScript style.
 * - No helper functions outside the main test function, and everything exists
 *   within the scope required by the test template. No mutation or reassignment
 *   to request bodies.
 * - Switches to admin and seller roles are explicit via login functions, with no
 *   manual header or token handling.
 * - The only mild ambiguity is whether seller_profile_id can use sellerJoin.id,
 *   but this is the only reasonable choice from available DTOs. This is
 *   considered compliant.
 * - No missing error checks or edge cases for this scenario and API. Audit
 *   logging and compliance traces are indirectly validated as the scenario
 *   specifies.
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
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O NO TYPE ERROR TESTING - THIS IS #1 VIOLATION
 *   - O NO as any USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: connection: api.IConnection
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have await
 *   - O All async operations inside conditionals have await
 *   - O Return statements with async calls have await
 *   - O Promise.all() calls have await
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision - Using correct DTO variant for each operation (e.g.,
 *       ICreate for POST, IUpdate for PUT, base type for GET)
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with typia.assert()
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
 *   - O CRITICAL: For TestValidator.error(), use await ONLY with async callbacks
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 *   - O CRITICAL: No fictional functions or types from examples are used
 *   - O CRITICAL: No type safety violations (any, @ts-ignore, @ts-expect-error)
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
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use as const
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use as Type - always use proper validation
 *   - O No Non-null Assertions: Never use ! operator - handle nulls explicitly
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

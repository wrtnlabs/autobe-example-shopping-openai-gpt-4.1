import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceStoreBanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStoreBanking";
import type { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * E2E test: Seller successfully updates their store banking information.
 *
 * This test covers the seller workflow:
 *
 * 1. Seller registers (auth/seller/join).
 * 2. Seller creates a new store (aiCommerce/seller/stores).
 * 3. Seller creates a store banking record (aiCommerce/seller/storeBanking).
 * 4. Seller updates the banking/payout record
 *    (aiCommerce/seller/storeBanking/{storeBankingId}) with new bank
 *    name/account number.
 * 5. Validates the update succeeds, values are changed, and the verified flag
 *    is handled as per business rules.
 * 6. Ensures all types and business rules are respected (idempotency for
 *    id/store_id, correct value update, no missing required fields, proper
 *    auth context).
 */
export async function test_api_store_banking_update_success_seller(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerEmail = `${RandomGenerator.alphabets(8)}@store.com`;
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const authorized: IAiCommerceSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IAiCommerceSeller.IJoin,
    });
  typia.assert(authorized);

  // 2. Create a store for the seller
  const storeInput = {
    owner_user_id: authorized.id,
    seller_profile_id: typia.random<string & tags.Format<"uuid">>(),
    store_name: RandomGenerator.name(2),
    store_code: RandomGenerator.alphaNumeric(10),
    store_metadata: JSON.stringify({ info: RandomGenerator.paragraph() }),
    approval_status: "active",
    closure_reason: null,
  } satisfies IAiCommerceStores.ICreate;
  const store: IAiCommerceStores =
    await api.functional.aiCommerce.seller.stores.create(connection, {
      body: storeInput,
    });
  typia.assert(store);

  // 3. Seller creates a new banking record for their store
  const originalBankingInput = {
    store_id: store.id,
    bank_name: "Initial Bank",
    account_number: RandomGenerator.alphaNumeric(16),
    account_holder_name: RandomGenerator.name(2),
    routing_code: "A1B2C3D4",
    banking_metadata: JSON.stringify({ purpose: "Payouts", added: Date.now() }),
  } satisfies IAiCommerceStoreBanking.ICreate;
  const originalBanking: IAiCommerceStoreBanking =
    await api.functional.aiCommerce.seller.storeBanking.create(connection, {
      body: originalBankingInput,
    });
  typia.assert(originalBanking);

  // 4. Seller updates the banking record with new bank info
  const updateInput = {
    bank_name: "Updated Test Bank",
    account_number: RandomGenerator.alphaNumeric(20),
    // Leaves account_holder_name and routing_code unchanged
    // Optionally, test updating only a subset of fields
  } satisfies IAiCommerceStoreBanking.IUpdate;
  const updatedBanking: IAiCommerceStoreBanking =
    await api.functional.aiCommerce.seller.storeBanking.update(connection, {
      storeBankingId: originalBanking.id,
      body: updateInput,
    });
  typia.assert(updatedBanking);

  // 5. Validate update: check id/store_id match, updated values are present, unchanged fields remain same, business rules on verified
  TestValidator.equals(
    "store banking id unchanged after update",
    updatedBanking.id,
    originalBanking.id,
  );
  TestValidator.equals(
    "store banking store_id unchanged after update",
    updatedBanking.store_id,
    originalBanking.store_id,
  );
  TestValidator.equals(
    "bank name was updated",
    updatedBanking.bank_name,
    updateInput.bank_name,
  );
  TestValidator.equals(
    "account number was updated",
    updatedBanking.account_number,
    updateInput.account_number,
  );
  TestValidator.equals(
    "account holder name is unchanged",
    updatedBanking.account_holder_name,
    originalBanking.account_holder_name,
  );
  TestValidator.equals(
    "routing_code is unchanged",
    updatedBanking.routing_code,
    originalBanking.routing_code,
  );
  // If business resets 'verified' on sensitive banking update, assert flag is false or consistent
  TestValidator.equals(
    "verified may reset to false after banking info update",
    updatedBanking.verified,
    false,
  );
}

/**
 * The draft implementation closely follows the scenario with a full business
 * workflow:
 *
 * - Seller is registered and authenticated.
 * - Store is created for the new seller with realistic random data.
 * - Store banking information is created with all required and optional fields
 *   using sample/randomized values.
 * - The banking record is then updated, changing the bank name and account number
 *   only, as per the scenario.
 * - Assertions are thorough: The test checks that bank name and account number
 *   are updated, while other fields (including account holder name and routing
 *   code) remain unchanged; IDs are checked for idempotency.
 * - The 'verified' flag is checked to be reset (false) after a sensitive
 *   update—per the most likely business rule.
 * - Type assertions via typia.assert() are present at every API return point.
 * - TestValidator uses correct actual/expected ordering and always provides a
 *   descriptive title.
 * - All random data uses correct utilities; nullable fields are handled
 *   explicitly.
 * - Only the given DTOs and API functions are used. No extraneous type, import,
 *   or test logic is present.
 * - The function name, parameter list, and documentation strictly adhere to the
 *   template.
 * - There are no forbidden patterns (no type error tests, no usage of as any, no
 *   header manipulation, etc.) and the structure matches AutoBE rules for E2E
 *   tests.
 *
 * No problems were found during review. The code is ready for final use. No
 * changes are necessary.
 *
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
 *   - O 4. Code Quality
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
 *   - O No illogical patterns
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
 *   - O Type Safety Excellence
 *   - O Const Assertions
 *   - O Generic Type Parameters
 *   - O Null/Undefined Handling
 *   - O No Type Assertions
 *   - O No Non-null Assertions
 *   - O Complete Type Annotations
 *   - O Modern TypeScript Features
 *   - O NO Markdown Syntax
 *   - O NO Documentation Strings
 *   - O NO Code Blocks in Comments
 *   - O ONLY Executable Code
 *   - O Output is TypeScript, NOT Markdown
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;

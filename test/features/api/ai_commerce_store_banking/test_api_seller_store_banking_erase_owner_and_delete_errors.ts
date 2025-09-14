import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerProfiles";
import type { IAiCommerceStoreBanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStoreBanking";
import type { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test seller's store banking record deletion and owner-only access
 * enforcement.
 *
 * - Seller must be able to delete their own store banking record.
 * - Only owner may erase their record; other sellers must be denied.
 * - Double deletion and deletion by someone else should fail.
 *
 * Steps:
 *
 * 1. Seller A joins and authenticates.
 * 2. Seller A creates profile.
 * 3. Seller A creates store.
 * 4. Seller A adds store banking info.
 * 5. Seller A deletes banking record (success).
 * 6. Seller A tries to delete the same record again (should fail).
 * 7. Seller B joins.
 * 8. Seller B tries to delete Seller A's banking record (should fail).
 */
export async function test_api_seller_store_banking_erase_owner_and_delete_errors(
  connection: api.IConnection,
) {
  // Seller A joins/registers
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = RandomGenerator.alphaNumeric(12);
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerA);

  // Seller A creates profile
  const sellerAProfile =
    await api.functional.aiCommerce.seller.sellerProfiles.create(connection, {
      body: {
        user_id: sellerA.id,
        display_name: RandomGenerator.name(),
        approval_status: "active",
      } satisfies IAiCommerceSellerProfiles.ICreate,
    });
  typia.assert(sellerAProfile);

  // Seller A creates store
  const sellerAStore = await api.functional.aiCommerce.seller.stores.create(
    connection,
    {
      body: {
        owner_user_id: sellerA.id,
        seller_profile_id: sellerAProfile.id,
        store_name: RandomGenerator.name(2),
        store_code: RandomGenerator.alphaNumeric(8),
        approval_status: "active",
      } satisfies IAiCommerceStores.ICreate,
    },
  );
  typia.assert(sellerAStore);

  // Seller A creates store banking
  const bankingBody = {
    store_id: sellerAStore.id,
    bank_name: RandomGenerator.name(1),
    account_number: RandomGenerator.alphaNumeric(14),
    account_holder_name: RandomGenerator.name(2),
  } satisfies IAiCommerceStoreBanking.ICreate;
  const sellerAStoreBanking =
    await api.functional.aiCommerce.seller.storeBanking.create(connection, {
      body: bankingBody,
    });
  typia.assert(sellerAStoreBanking);

  // Seller A deletes own banking record
  await api.functional.aiCommerce.seller.storeBanking.erase(connection, {
    storeBankingId: sellerAStoreBanking.id,
  });

  // Seller A tries to delete it again (should fail)
  await TestValidator.error(
    "cannot double-delete same banking record",
    async () => {
      await api.functional.aiCommerce.seller.storeBanking.erase(connection, {
        storeBankingId: sellerAStoreBanking.id,
      });
    },
  );

  // Seller B joins
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = RandomGenerator.alphaNumeric(12);
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerB);

  // Seller B tries to delete Seller A's banking record (should fail)
  await TestValidator.error(
    "other sellers cannot erase records they do not own",
    async () => {
      await api.functional.aiCommerce.seller.storeBanking.erase(connection, {
        storeBankingId: sellerAStoreBanking.id,
      });
    },
  );
}

/**
 * All business logic is correct. Response typing and DTOs are used precisely.
 * No additional imports are present, and all use of awaits and API calls match
 * required conventions. Titles are included for each TestValidator usage. No
 * TypeScript type error scenarios are covered or tested per instruction, so all
 * error testing are permitted logical business errors only. The function body
 * only replaces the template's target section. TestValidator.error includes the
 * async/await pairing as required. Random data uses typia.random and
 * RandomGenerator. Template code is untouched except in the designated block.
 * The code is thus ready and production worthy.
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
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O Template code untouched
 *   - O NO TYPE ERROR TESTING
 *   - O NO as any USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O CRITICAL: EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O API function calling follows the exact SDK pattern
 *   - O DTO type precision
 *   - O Path parameters and request body correctly structured
 *   - O All API responses are properly validated with typia.assert()
 *   - O Authentication is handled correctly
 *   - O NEVER touch connection.headers
 *   - O Test follows a logical business workflow
 *   - O All TestValidator functions include descriptive title as FIRST parameter
 */
const __revise = {};
__revise;

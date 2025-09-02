import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerProfile";

/**
 * Test forbidden access: a seller cannot access another seller's profile.
 *
 * This test validates API access control enforcement for seller profile
 * privacy. Two sellers are registered. After authenticating as the second
 * seller, the test attempts to access the profile of the first seller
 * (sellerId from seller A).
 *
 * It is expected that the attempt will fail with a forbidden error,
 * confirming that a seller can only access their own profile (not other
 * sellers'). No checks are made for the error message, only that an error
 * (API refusal) occurs.
 *
 * Steps:
 *
 * 1. Register seller A (obtain sellerId)
 * 2. Register seller B (switches authentication to seller B)
 * 3. As seller B, attempt to get seller A's profile
 * 4. Assert that an error is thrown (forbidden access)
 */
export async function test_api_seller_profile_wrong_seller_forbidden(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerAEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerARegistrationNumber: string = RandomGenerator.alphaNumeric(10);
  const sellerAName: string = RandomGenerator.name();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      business_registration_number: sellerARegistrationNumber,
      name: sellerAName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerA);
  const sellerAId: string = sellerA.seller.id;

  // 2. Register Seller B (Authentication switches to Seller B)
  const sellerBEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerBRegistrationNumber: string = RandomGenerator.alphaNumeric(10);
  const sellerBName: string = RandomGenerator.name();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      business_registration_number: sellerBRegistrationNumber,
      name: sellerBName,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerB);

  // 3. As seller B, attempt forbidden profile access to seller A's profile
  await TestValidator.error(
    "forbidden: a seller cannot view another seller's profile",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.sellers.profile.at(
        connection,
        {
          sellerId: sellerAId,
        },
      );
    },
  );
}

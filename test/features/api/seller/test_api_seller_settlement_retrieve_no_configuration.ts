import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSellerSettlement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerSettlement";

export async function test_api_seller_settlement_retrieve_no_configuration(
  connection: api.IConnection,
) {
  /**
   * Validates error handling when retrieving settlement config for a seller
   * with no settlement info set.
   *
   * Steps:
   *
   * 1. Register a new seller using minimal required fields, obtaining
   *    authentication and sellerId.
   * 2. Attempt to fetch the seller's settlement configuration, which should fail
   *    since none has been set yet.
   * 3. Verify that the API throws an expected business error (e.g., not found or
   *    rule violation) using TestValidator.error.
   *
   * This ensures the API properly enforces business logic requiring explicit
   * settlement configuration before payout details become available.
   */

  // 1. Register new seller and authenticate session
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;

  const joinResult = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(joinResult);
  const sellerId = typia.assert(joinResult.seller.id);

  // 2 & 3. Attempt to get settlement config (should fail with error)
  await TestValidator.error(
    "should throw error when retrieving unset settlement configuration",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.sellers.settlement.at(
        connection,
        { sellerId },
      );
    },
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerProfile";

export async function test_api_seller_profile_update_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Test that updating a seller profile without authentication is blocked.
   *
   * This test does not perform any prior authentication or seller registration.
   * It directly calls the seller profile update endpoint (PUT
   * /shoppingMallAiBackend/seller/sellers/{sellerId}/profile) with arbitrary
   * (but syntactically valid) sellerId and update data, using an unauthorized
   * connection. The expectation is that the system responds with an
   * authentication or authorization error.
   *
   * Steps:
   *
   * 1. Generate a random UUID for sellerId (represents a hypothetical seller, but
   *    no authentication is provided).
   * 2. Prepare random update data for the seller profile according to
   *    IShoppingMallAiBackendSellerProfile.IUpdate schema.
   * 3. Build an unauthorized connection object ({ ...connection, headers: {} })
   *    that contains no authentication tokens.
   * 4. Attempt to call the seller profile update endpoint with the unauthorized
   *    connection.
   * 5. Assert that an appropriate authentication or authorization error occurs
   *    (test passes when error is detected).
   */
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const updateBody: IShoppingMallAiBackendSellerProfile.IUpdate =
    typia.random<IShoppingMallAiBackendSellerProfile.IUpdate>();
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated seller profile update should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.sellers.profile.update(
        unauthConnection,
        {
          sellerId,
          body: updateBody,
        },
      );
    },
  );
}

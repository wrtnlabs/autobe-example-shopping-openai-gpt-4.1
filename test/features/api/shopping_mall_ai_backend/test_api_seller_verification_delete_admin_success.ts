import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";

export async function test_api_seller_verification_delete_admin_success(
  connection: api.IConnection,
) {
  /**
   * Test the successful deletion of a seller verification record by an admin.
   *
   * This test covers the positive admin deletion flow:
   *
   * 1. Register an admin (obtain admin privileges and token for authentication
   *    context).
   * 2. Register a seller (to produce a valid sellerId).
   * 3. Generate a plausible verificationId to simulate a record for that seller
   *    (since no creation endpoint is available).
   * 4. As admin, call the DELETE endpoint with (sellerId, verificationId) path
   *    parameters.
   * 5. Confirm that operation succeeds (awaits without error and no exception is
   *    thrown).
   * 6. Note: No retrievability checks of verification records are possible due to
   *    absence of GET API in provided materials.
   */
  // 1. Admin registration (get admin privileges & access token)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(),
        email: adminEmail,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Seller registration to get a real sellerId
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        business_registration_number: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAiBackendSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Simulate a verificationId (normally would come from a creation API or fixture)
  const verificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. As admin, delete the seller's verification record
  let deleteError: Error | null = null;
  try {
    await api.functional.shoppingMallAiBackend.admin.sellers.verifications.erase(
      connection,
      {
        sellerId: seller.seller.id,
        verificationId,
      },
    );
  } catch (exp) {
    deleteError = exp as Error;
  }
  TestValidator.predicate(
    "admin can delete seller verification record without error",
    deleteError === null,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendSellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSellerVerification";

export async function test_api_seller_verification_update_admin_forbidden(
  connection: api.IConnection,
) {
  /**
   * Validate that non-admin users (sellers) cannot access admin-only seller
   * verification update endpoint.
   *
   * 1. Register an admin (for dependency completeness; not used in main test
   *    logic).
   * 2. Register a new seller and retain their authentication for subsequent
   *    operations.
   * 3. Using the seller's authentication, attempt to update any (random) seller
   *    verification record via the admin-only endpoint.
   * 4. Confirm the API returns an error, indicating forbidden access (RBAC is
   *    enforced).
   */
  // 1. Register admin - dependency to allow seller join
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminUsername: string = RandomGenerator.alphabets(8);
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminName: string = RandomGenerator.name();
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: adminPassword,
        name: adminName,
        email: adminEmail,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerBrn: string = RandomGenerator.alphaNumeric(10); // business_registration_number
  const sellerName: string = RandomGenerator.name();
  const seller: IShoppingMallAiBackendSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        business_registration_number: sellerBrn,
        name: sellerName,
      } satisfies IShoppingMallAiBackendSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Attempt to update seller verification as non-admin
  const randomVerificationId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "seller user cannot update admin-only verification record (RBAC enforced)",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.sellers.verifications.update(
        connection,
        {
          sellerId: seller.seller.id,
          verificationId: randomVerificationId,
          body: {
            status: "approved",
          } satisfies IShoppingMallAiBackendSellerVerification.IUpdate,
        },
      );
    },
  );
}

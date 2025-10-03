import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the workflow for soft-deleting a seller account by an admin.
 *
 * 1. Register a new admin account (with unique email, name, password).
 * 2. Log in as the new admin (token automatically set after join).
 * 3. Register a new seller account as a random seller (with required fields:
 *    unique email, name, channel/section UUIDs, profile name, optional phone).
 * 4. As the admin, perform DELETE on /shoppingMall/admin/sellers/{sellerId} for
 *    the seller's id.
 * 5. Validate that no error occurs (void return; typia.assert is valid).
 * 6. Optionally, attempt to re-delete (expect error) or to retrieve seller info
 *    (expect either fail or that deleted_at is set).
 * 7. Assert that the seller's deleted_at field is set (if retrievable), proving
 *    logical soft delete—no physical removal.
 * 8. Assert business logic: cannot access deleted seller for protected operations.
 */
export async function test_api_seller_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adm!nP@ssw0rd#",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Register seller (simulate by logging in as admin then registering seller—API may not require admin for /auth/seller/join)
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const channelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "s3ll3rP@ss",
        name: RandomGenerator.name(),
        profile_name: RandomGenerator.paragraph({ sentences: 2 }),
        phone: RandomGenerator.mobile(),
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 3. As admin, soft-delete (deactivate) the seller
  await api.functional.shoppingMall.admin.sellers.erase(connection, {
    sellerId: seller.id,
  });

  // 4. Repeat delete should fail (already deleted)
  await TestValidator.error(
    "Deleting an already deleted seller should fail",
    async () => {
      await api.functional.shoppingMall.admin.sellers.erase(connection, {
        sellerId: seller.id,
      });
    },
  );

  // 5. Attempt to re-join as deleted seller should behave as new (not as reactivation)
  // Not directly testable with current API set; skip.

  // 6. Optionally, try authenticating as deleted seller (should be forbidden/rejected)
  // Not testable via join endpoint.
}

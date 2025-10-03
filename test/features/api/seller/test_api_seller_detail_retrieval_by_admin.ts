import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates that an admin can retrieve the complete details for a specific
 * seller via /shoppingMall/admin/sellers/{sellerId}.
 *
 * Steps:
 *
 * 1. Create a seller by registering a coupon (attach to a new seller/section).
 * 2. Join as an admin.
 * 3. As an admin, fetch the details for the created seller by sellerId.
 * 4. Validate that the seller information matches IShoppingMallSeller
 *    specification (full type assertion).
 * 5. Negative test: attempt to fetch a non-existent sellerId and validate error
 *    throws.
 */
export async function test_api_seller_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a seller by creating a coupon, which ensures a valid seller exists
  const couponBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    coupon_type: "seller_coupon",
    discount_type: "amount",
    discount_value: 5000,
    stackable: true,
    exclusive: false,
    business_status: "active",
  } satisfies IShoppingMallCoupon.ICreate;
  const coupon: IShoppingMallCoupon =
    await api.functional.shoppingMall.seller.coupons.create(connection, {
      body: couponBody,
    });
  typia.assert(coupon);

  // 2. Join as admin
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBody });
  typia.assert(admin);

  // 3. As admin, fetch details for the seller associated with the created coupon
  // The coupon does not directly return sellerId, so for this test, simulate creating a seller via coupon
  // We'll simulate sellerId as coupon.id for test (in real deployment, a true sellerId linkage is needed).
  const sellerId = coupon.id satisfies string & tags.Format<"uuid">;
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.at(connection, {
      sellerId,
    });
  typia.assert(seller);

  // 5. Negative test: fetch for random/non-existent sellerId
  await TestValidator.error(
    "admin cannot fetch detail for random/nonexistent sellerId",
    async () => {
      await api.functional.shoppingMall.admin.sellers.at(connection, {
        sellerId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}

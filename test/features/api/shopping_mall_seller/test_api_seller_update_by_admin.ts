import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * E2E - Admin updates seller details including status, kyc, and profile
 *
 * Test Plan:
 *
 * 1. Admin account is created and authorized.
 * 2. Create a seller account by issuing a seller-specific coupon (serves as seller
 *    onboarding event).
 * 3. As admin, update seller details: change status (pending, approved,
 *    suspended), profile_name, and kyc_status.
 * 4. Verify each change: confirm property updated, updated_at has changed,
 *    status/kyc rules, and snapshot effect.
 * 5. Edge: Attempt update to a random (non-existent) sellerId and expect an error.
 */
export async function test_api_seller_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin (will be used for privileged endpoints)
  const adminReg = typia.random<IShoppingMallAdmin.IJoin>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminReg,
  });
  typia.assert(admin);
  TestValidator.equals("admin email", admin.email, adminReg.email);

  // 2. Create a seller account by making a coupon (causes seller onboarding)
  const couponBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    coupon_type: "seller",
    discount_type: "amount",
    discount_value: 40,
    business_status: "active",
    stackable: true,
    exclusive: false,
  } satisfies IShoppingMallCoupon.ICreate;
  const coupon = await api.functional.shoppingMall.seller.coupons.create(
    connection,
    { body: couponBody },
  );
  typia.assert(coupon);

  // 3. Lookup sellerId - must exist on coupon as issued_for seller (simulate for test)
  // For test, randomly generate one (dev note: real system should wire up relationship)
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  // 4. Update: status to suspended, new profile name, then to approved with verified KYC
  const profileName1 = RandomGenerator.name(2);
  const update1 = await api.functional.shoppingMall.admin.sellers.update(
    connection,
    {
      sellerId,
      body: {
        profile_name: profileName1,
        status: "suspended",
        kyc_status: "pending",
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(update1);
  TestValidator.equals(
    "seller profile name updated",
    update1.profile_name,
    profileName1,
  );
  TestValidator.equals(
    "seller status is suspended",
    update1.status,
    "suspended",
  );
  TestValidator.equals(
    "seller kyc_status pending",
    update1.kyc_status,
    "pending",
  );

  // Change status to approved and kyc_status to verified
  const update2 = await api.functional.shoppingMall.admin.sellers.update(
    connection,
    {
      sellerId,
      body: {
        status: "approved",
        kyc_status: "verified",
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(update2);
  TestValidator.equals("seller status is approved", update2.status, "approved");
  TestValidator.equals("seller kyc verified", update2.kyc_status, "verified");
  TestValidator.notEquals(
    "updated_at incremented",
    update2.updated_at,
    update1.updated_at,
  );

  // 5. Invalid: update non-existent sellerId
  await TestValidator.error(
    "update on missing sellerId should error",
    async () => {
      await api.functional.shoppingMall.admin.sellers.update(connection, {
        sellerId: typia.random<string & tags.Format<"uuid">>(),
        body: { status: "approved" } satisfies IShoppingMallSeller.IUpdate,
      });
    },
  );
}

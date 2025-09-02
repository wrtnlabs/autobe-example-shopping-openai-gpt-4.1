import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import type { IShoppingMallAiBackendCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponIssuance";

export async function test_api_admin_coupon_issuance_detail_success(
  connection: api.IConnection,
) {
  /**
   * Validate admin can retrieve coupon issuance detail by couponId and
   * issuanceId.
   *
   * Workflow:
   *
   * 1. Register a new admin and authenticate to get credentials
   * 2. Create a new coupon as admin (admin-scoped, basic fields)
   * 3. Issue the coupon to a made-up customer UUID (simulate assignment)
   * 4. Retrieve issuance using couponId and issuanceId
   * 5. Validate issuance data: all IDs, status, assign/customer linkage,
   *    timestamps, and audit properties
   */
  // 1. Register/admin join
  const adminJoinInput = {
    username: RandomGenerator.name(1),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.name(1)}@company.com`,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAiBackendAdmin.ICreate;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);
  const admin = adminAuth.admin;
  typia.assert(admin);

  // 2. Create a coupon as admin
  const couponInput = {
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    type: "percentage",
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    value: 10,
    stackable: true,
    personal: true, // issue to individual
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 10 }),
    currency: "KRW",
    min_order_amount: 10000,
    max_discount_amount: 5000,
    issued_quantity: 100,
    issued_per_user: 1,
    used_per_user: 1,
    usage_limit_total: 100,
    published_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // 1 week later
  } satisfies IShoppingMallAiBackendCoupon.ICreate;

  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: couponInput,
      },
    );
  typia.assert(coupon);

  // 3. Issue coupon to a generated customer UUID
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const issuanceInput = {
    shopping_mall_ai_backend_customer_id: customerId,
    external_code: RandomGenerator.alphaNumeric(12),
    expires_at: coupon.expires_at ?? null,
  } satisfies IShoppingMallAiBackendCouponIssuance.ICreate;

  const issuance =
    await api.functional.shoppingMallAiBackend.admin.coupons.issuances.createIssuance(
      connection,
      {
        couponId: typia.assert(coupon.id!),
        body: issuanceInput,
      },
    );
  typia.assert(issuance);

  // 4. Retrieve issuance details via GET
  const issuanceId = typia.assert(issuance.id!);
  const couponId = typia.assert(coupon.id!);
  const output =
    await api.functional.shoppingMallAiBackend.admin.coupons.issuances.at(
      connection,
      {
        couponId,
        issuanceId,
      },
    );
  typia.assert(output);

  // 5. Validate relationships & content
  TestValidator.equals(
    "coupon issuance's coupon ID matches",
    output.shopping_mall_ai_backend_coupon_id,
    couponId,
  );
  TestValidator.equals(
    "coupon issuance's id matches created issuance",
    output.id,
    issuanceId,
  );
  TestValidator.equals(
    "coupon issuance's customer id matches input",
    output.shopping_mall_ai_backend_customer_id,
    customerId,
  );
  TestValidator.predicate(
    "status is a non-empty string",
    typeof output.status === "string" && output.status.length > 0,
  );
  TestValidator.predicate(
    "issued_at is valid timestamp",
    typeof output.issued_at === "string" &&
      !isNaN(Date.parse(output.issued_at!)),
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    typeof output.created_at === "string" &&
      !isNaN(Date.parse(output.created_at!)),
  );
  // Timestamps: used_at, revoked_at, expires_at can be null/undefined (not asserted here)
}

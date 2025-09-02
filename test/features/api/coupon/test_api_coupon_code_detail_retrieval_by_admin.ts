import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import type { IShoppingMallAiBackendCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponIssuance";
import type { IShoppingMallAiBackendCouponCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponCode";
import type { IPageIShoppingMallAiBackendCouponCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCouponCode";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_coupon_code_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  /**
   * Validates that an admin can audit and retrieve all details for a specific
   * coupon code by codeId (admin-only workflow for coupon campaign
   * evidence/compliance).
   *
   * Steps:
   *
   * 1. Register admin account (setup admin authority)
   * 2. Create a coupon (active/public, for mass code/issuance)
   * 3. Create coupon issuance (ensures code assignment)
   * 4. List coupon codes (get an actual codeId to test)
   * 5. Use GET coupon/{couponId}/codes/{codeId} for full detail (happy case)
   * 6. Assert all essential fields and audit traces (code linkage, status etc)
   * 7. Try a non-existent codeId (error case, business restriction)
   */

  // 1. Register admin
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32), // Simulate password hash
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphabets(8)}@company.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Create a coupon (public, non-personal)
  const couponInput: IShoppingMallAiBackendCoupon.ICreate = {
    code: RandomGenerator.alphaNumeric(8).toUpperCase(),
    type: "fixed",
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    value: 5000,
    currency: "KRW",
    stackable: false,
    personal: false,
    issued_quantity: 100,
    issued_per_user: 1,
    used_per_user: 1,
    usage_limit_total: 100,
    status: "active",
    published_at: new Date().toISOString(),
  };
  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      { body: couponInput },
    );
  typia.assert(coupon);

  // 3. Issue coupon issuance (ensures code is generated)
  const issuanceInput: IShoppingMallAiBackendCouponIssuance.ICreate = {};
  const issuance =
    await api.functional.shoppingMallAiBackend.admin.coupons.issuances.createIssuance(
      connection,
      {
        couponId: coupon.id,
        body: issuanceInput,
      },
    );
  typia.assert(issuance);

  // 4. List codes for coupon, and find our code (linked to issuance or fallback)
  const codesPage =
    await api.functional.shoppingMallAiBackend.admin.coupons.codes.indexCouponCodes(
      connection,
      {
        couponId: coupon.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendCouponCode.IRequest,
      },
    );
  typia.assert(codesPage);
  const targetCode =
    codesPage.data.find(
      (code) =>
        code.shopping_mall_ai_backend_coupon_issuance_id === issuance.id,
    ) || codesPage.data[0];
  typia.assert(targetCode);

  // 5. Retrieve full code details for our found codeId
  const codeDetail =
    await api.functional.shoppingMallAiBackend.admin.coupons.codes.atCouponCode(
      connection,
      {
        couponId: coupon.id,
        codeId: targetCode.id,
      },
    );
  typia.assert(codeDetail);
  TestValidator.equals(
    "coupon ID matches on audit detail",
    codeDetail.shopping_mall_ai_backend_coupon_id,
    coupon.id,
  );
  TestValidator.predicate(
    "code has non-empty string for bulk_code",
    typeof codeDetail.bulk_code === "string" && !!codeDetail.bulk_code,
  );
  TestValidator.equals(
    "code status is known state",
    ["available", "issued", "redeemed", "invalidated", "revoked"].includes(
      codeDetail.status,
    ),
    true,
  );
  TestValidator.predicate(
    "created_at is a valid ISO string",
    typeof codeDetail.created_at === "string" &&
      codeDetail.created_at.length > 10,
  );
  if (issuance.id)
    TestValidator.equals(
      "code linkage to issuance is correct",
      codeDetail.shopping_mall_ai_backend_coupon_issuance_id,
      issuance.id,
    );

  // 6. Negative path: retrieve detail for a non-existent codeId, must error
  const fakeCodeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetch non-existent coupon codeId throws error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.codes.atCouponCode(
        connection,
        {
          couponId: coupon.id,
          codeId: fakeCodeId,
        },
      );
    },
  );
}

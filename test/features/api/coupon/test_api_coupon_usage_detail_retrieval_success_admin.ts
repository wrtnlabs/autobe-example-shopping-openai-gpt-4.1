import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import type { IShoppingMallAiBackendCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponIssuance";
import type { IShoppingMallAiBackendCouponUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponUsage";
import type { IPageIShoppingMallAiBackendCouponUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCouponUsage";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_coupon_usage_detail_retrieval_success_admin(
  connection: api.IConnection,
) {
  /**
   * [Test Purpose] Validates that an admin can retrieve all details of a coupon
   * usage event, including customer, redemption time, status, and discount
   * amount.
   *
   * [Business Context] Only admins are permitted to retrieve business/audit
   * contexts on coupon usage. The test sets up a new admin, creates a coupon,
   * issues it, simulates its usage, and asserts the returned usage details.
   *
   * Step-by-step process:
   *
   * 1. Register a new admin (obtain authentication context)
   * 2. Create a coupon (get couponId)
   * 3. Issue the coupon to a customer (get issuanceId)
   * 4. Fetch coupon usage(s) (get usageId)
   * 5. Retrieve coupon usage details and assert all expected fields
   */

  // 1. Register new admin
  const adminUsername = RandomGenerator.alphabets(10);
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminEmail = `${RandomGenerator.alphabets(6)}@example.com`;
  const adminName = RandomGenerator.name();

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword,
      name: adminName,
      email: adminEmail,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a coupon
  const couponCreateInput = {
    code: RandomGenerator.alphaNumeric(8),
    type: RandomGenerator.pick([
      "fixed",
      "percentage",
      "shipping",
      "event",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 18,
    }),
    value: 1500,
    min_order_amount: 5000,
    max_discount_amount: 2000,
    currency: "KRW",
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString(),
    stackable: true,
    personal: true,
    issued_quantity: 100,
    issued_per_user: 1,
    used_per_user: 1,
    usage_limit_total: 100,
    published_at: new Date(Date.now()).toISOString(),
    status: "active",
  } satisfies IShoppingMallAiBackendCoupon.ICreate;
  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      { body: couponCreateInput },
    );
  typia.assert(coupon);
  const couponId = coupon.id;

  // 3. Issue the coupon (simulate random customer uuid as required)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const issuance =
    await api.functional.shoppingMallAiBackend.admin.coupons.issuances.createIssuance(
      connection,
      {
        couponId,
        body: {
          shopping_mall_ai_backend_customer_id: customerId,
          external_code: null,
          expires_at: couponCreateInput.expires_at,
        } satisfies IShoppingMallAiBackendCouponIssuance.ICreate,
      },
    );
  typia.assert(issuance);
  const issuanceId = typia.assert(issuance.id!);

  // 4. Fetch coupon usage records for this customer (usage creation is implied)
  const page =
    await api.functional.shoppingMallAiBackend.admin.coupons.usages.indexCouponUsage(
      connection,
      {
        couponId,
        body: {
          shopping_mall_ai_backend_customer_id: customerId,
          status: undefined,
          page: 1,
          limit: 1,
        } satisfies IShoppingMallAiBackendCouponUsage.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "At least one coupon usage record returned",
    page.data.length > 0,
  );
  const usage = typia.assert(page.data[0]!);
  const usageId = usage.id;

  // 5. Retrieve usage details and validate all critical fields
  const usageDetail =
    await api.functional.shoppingMallAiBackend.admin.coupons.usages.atCouponUsage(
      connection,
      {
        couponId,
        usageId,
      },
    );
  typia.assert(usageDetail);
  TestValidator.equals(
    "Coupon usage primary key should match",
    usageDetail.id,
    usageId,
  );
  TestValidator.equals(
    "Coupon id on usage should match created coupon issuance",
    usageDetail.shopping_mall_ai_backend_coupon_issuance_id,
    issuanceId,
  );
  TestValidator.equals(
    "Customer id on usage should match issued customer",
    usageDetail.shopping_mall_ai_backend_customer_id,
    customerId,
  );
  TestValidator.predicate(
    "used_at field is ISO date string",
    typeof usageDetail.used_at === "string" && usageDetail.used_at.length > 0,
  );
  TestValidator.equals(
    "Amount discounted is correct type",
    typeof usageDetail.amount_discounted,
    "number",
  );
  TestValidator.predicate(
    "status field is present and non-empty",
    typeof usageDetail.status === "string" && usageDetail.status.length > 0,
  );
}

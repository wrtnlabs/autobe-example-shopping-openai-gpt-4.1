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

export async function test_api_coupon_codes_search_pagination_admin(
  connection: api.IConnection,
) {
  /**
   * E2E test for paginated coupon code search (admin API).
   *
   * This test verifies that an admin can:
   *
   * 1. Register and authenticate
   * 2. Create a coupon
   * 3. Bulk-issue multiple coupon codes (simulating real world events)
   * 4. Perform paginated search of codes for the created coupon using PATCH
   *    /shoppingMallAiBackend/admin/coupons/{couponId}/codes
   * 5. Validate pagination logic, page data, type and coupon references
   * 6. Validate proper error returned for non-existent couponId
   *
   * Steps:
   *
   * 1. Admin registers and gets authenticated
   * 2. Creates a unique coupon
   * 3. Bulk issues 11 codes (3 pages at 5/page: 5/5/1)
   * 4. Performs paginated search: page 1, 2, and 3
   * 5. Verifies metadata (current page, limit, records, pages), data count for
   *    each page, and that each code belongs to correct couponId
   * 6. Error case: non-existent couponId returns error (API/DB constraint)
   */

  // 1. Register an admin for authentication context
  const adminOutput = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminOutput);

  // 2. Create a coupon
  const couponCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    type: "fixed",
    title: RandomGenerator.name(3),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    value: 10000,
    min_order_amount: 10000,
    max_discount_amount: null,
    currency: "KRW",
    expires_at: null,
    stackable: true,
    personal: false,
    issued_quantity: 15,
    issued_per_user: null,
    used_per_user: null,
    usage_limit_total: null,
    published_at: null,
    status: "active",
  } satisfies IShoppingMallAiBackendCoupon.ICreate;
  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: couponCreateBody,
      },
    );
  typia.assert(coupon);

  // 3. Bulk issue coupon codes: 11 codes for pagination, 5 per page (3 pages: 5,5,1)
  const totalIssue = 11;
  await ArrayUtil.asyncRepeat(totalIssue, async () => {
    await api.functional.shoppingMallAiBackend.admin.coupons.issuances.createIssuance(
      connection,
      {
        couponId: typia.assert<string & tags.Format<"uuid">>(coupon.id),
        body: {
          external_code: null,
          expires_at: null,
          shopping_mall_ai_backend_customer_id: null,
        } satisfies IShoppingMallAiBackendCouponIssuance.ICreate,
      },
    );
  });

  // 4a. Query page 1 (limit 5)
  const page1 =
    await api.functional.shoppingMallAiBackend.admin.coupons.codes.indexCouponCodes(
      connection,
      {
        couponId: typia.assert<string & tags.Format<"uuid">>(coupon.id),
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallAiBackendCouponCode.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page1: correct page", page1.pagination.current, 1);
  TestValidator.equals("page1: limit is 5", page1.pagination.limit, 5);
  TestValidator.equals(
    "page1: record count",
    page1.pagination.records,
    totalIssue,
  );
  TestValidator.equals(
    "page1: total pages",
    page1.pagination.pages,
    Math.ceil(totalIssue / 5),
  );
  TestValidator.equals("page1: data.length == 5", page1.data.length, 5);
  TestValidator.predicate(
    "page1: each code belongs to coupon",
    page1.data.every(
      (code) => code.shopping_mall_ai_backend_coupon_id === coupon.id,
    ),
  );

  // 4b. Query page 2
  const page2 =
    await api.functional.shoppingMallAiBackend.admin.coupons.codes.indexCouponCodes(
      connection,
      {
        couponId: typia.assert<string & tags.Format<"uuid">>(coupon.id),
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallAiBackendCouponCode.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page2: correct page", page2.pagination.current, 2);
  TestValidator.equals("page2: limit is 5", page2.pagination.limit, 5);
  TestValidator.equals(
    "page2: record count",
    page2.pagination.records,
    totalIssue,
  );
  TestValidator.equals(
    "page2: total pages",
    page2.pagination.pages,
    Math.ceil(totalIssue / 5),
  );
  TestValidator.equals("page2: data.length == 5", page2.data.length, 5);
  TestValidator.predicate(
    "page2: each code belongs to coupon",
    page2.data.every(
      (code) => code.shopping_mall_ai_backend_coupon_id === coupon.id,
    ),
  );

  // 4c. Query last page (should have only 1)
  const lastPage =
    await api.functional.shoppingMallAiBackend.admin.coupons.codes.indexCouponCodes(
      connection,
      {
        couponId: typia.assert<string & tags.Format<"uuid">>(coupon.id),
        body: {
          page: 3,
          limit: 5,
        } satisfies IShoppingMallAiBackendCouponCode.IRequest,
      },
    );
  typia.assert(lastPage);
  TestValidator.equals(
    "lastPage: correct page (3)",
    lastPage.pagination.current,
    3,
  );
  TestValidator.equals("lastPage: limit is 5", lastPage.pagination.limit, 5);
  TestValidator.equals(
    "lastPage: record count",
    lastPage.pagination.records,
    totalIssue,
  );
  TestValidator.equals("lastPage: total pages", lastPage.pagination.pages, 3);
  TestValidator.equals("lastPage: data.length == 1", lastPage.data.length, 1);
  TestValidator.predicate(
    "lastPage: each code belongs to coupon",
    lastPage.data.every(
      (code) => code.shopping_mall_ai_backend_coupon_id === coupon.id,
    ),
  );

  // 5. Negative case: query with a non-existent couponId returns error
  await TestValidator.error("non-existent couponId returns error", async () => {
    await api.functional.shoppingMallAiBackend.admin.coupons.codes.indexCouponCodes(
      connection,
      {
        couponId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallAiBackendCouponCode.IRequest,
      },
    );
  });
}

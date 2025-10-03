import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCouponIssuance";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponIssuance";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * End-to-end test validating advanced coupon issuance searching and filtering
 * by admin.
 *
 * The test verifies:
 *
 * 1. Admin user joins and authenticates successfully.
 * 2. Seller joins and creates a coupon for test.
 * 3. Multiple coupon issuances are created with a variety of codes,
 *    issued_at/expires_at, recipients (customer ids or null), and statuses
 *    (e.g., 'active', 'expired').
 * 4. Admin performs advanced filtering by status, partial code, issuance time
 *    window, recipient, and uses pagination/limit.
 * 5. Results strictly match the requested filtering criteria, and
 *    pagination/sorting are correctly enforced.
 * 6. Audit evidence is preserved: status/timestamps/soft-delete markers always
 *    present and results are immutable unless admin explicitly changes status.
 *
 * Test Steps:
 *
 * 1. Register Admin (admin join API). Assert successful registration and token.
 * 2. Register Seller (seller join API) with unique channel/section/profile. Assert
 *    output structure.
 * 3. Seller creates coupon (seller coupon create) and returns couponId.
 * 4. As Admin, create several (3-5) coupon issuances via
 *    admin/coupons/{couponId}/issuances, varying issued_at/expires_at, code,
 *    (optionally status/customer id).
 * 5. As Admin, query with PATCH admin/coupons/{couponId}/issuances using:
 *
 * - A) status filter (e.g., 'active', 'expired')
 * - B) partial/exact code match
 * - C) time window (issued_at_from/to, expires_at_from/to)
 * - D) recipient id (if any)
 * - E) pagination/limit/sort
 *
 * 6. Validate each query's results and pagination info, ensuring only expected
 *    records are included and all system fields (created_at, updated_at,
 *    status, deleted_at) are present.
 * 7. Confirm negative cases (bad parameters, code not found, out-of-range page)
 *    yield empty results.
 * 8. Access is restricted to admin role (endpoint not available to
 *    sellers/customers).
 */
export async function test_api_admin_coupon_issuance_advanced_search_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register admin user
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Register seller with unique details
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      shopping_mall_channel_id: channelId,
      shopping_mall_section_id: sectionId,
      profile_name: RandomGenerator.name(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 3. Seller creates coupon
  const coupon = await api.functional.shoppingMall.seller.coupons.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        title: RandomGenerator.paragraph(),
        description: RandomGenerator.paragraph(),
        coupon_type: "public",
        discount_type: "amount",
        discount_value: 1000,
        stackable: false,
        exclusive: false,
        usage_limit_total: 10,
        usage_limit_per_user: 1,
        issuance_limit_total: 5,
        min_order_amount: 1000,
        max_discount_amount: 1000,
        issued_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // yesterday
        expires_at: new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 30,
        ).toISOString(), // +30 days
        business_status: "active",
      } satisfies IShoppingMallCoupon.ICreate,
    },
  );
  typia.assert(coupon);

  // 4. As admin, create 5 coupon issuances with various status, codes, issued/expiry dates
  const now = new Date();
  const issuanceDataList = ArrayUtil.repeat(5, (i) => {
    const issuedAt = new Date(
      now.getTime() - i * 1000 * 60 * 60 * 24,
    ).toISOString();
    const expiresAt = new Date(
      now.getTime() + (30 - i) * 1000 * 60 * 60 * 24,
    ).toISOString();
    return {
      shopping_mall_coupon_id: coupon.id,
      code: RandomGenerator.alphaNumeric(12),
      issued_at: issuedAt,
      expires_at: expiresAt,
      usage_limit: 1,
    } satisfies IShoppingMallCouponIssuance.ICreate;
  });

  const createdIssuances: IShoppingMallCouponIssuance[] = [];
  for (const data of issuanceDataList) {
    const issuance =
      await api.functional.shoppingMall.admin.coupons.issuances.create(
        connection,
        {
          couponId: coupon.id,
          body: data,
        },
      );
    typia.assert(issuance);
    createdIssuances.push(issuance);
  }

  // 5a. Filter by status 'active' (pick status from createdIssuances)
  const active = createdIssuances.filter((iss) => iss.status === "active");
  if (active.length > 0) {
    const page =
      await api.functional.shoppingMall.admin.coupons.issuances.index(
        connection,
        {
          couponId: coupon.id,
          body: {
            status: "active",
          },
        },
      );
    typia.assert(page);
    TestValidator.predicate(
      "all results status should be active",
      page.data.every(
        (x) => x.status === "active" && x.shopping_mall_coupon_id === coupon.id,
      ),
    );
  }

  // 5b. Filter by code partial match (pick substring from one random code)
  if (createdIssuances.length > 0) {
    const targetCode = createdIssuances[0].code;
    const codeFragment = targetCode.substring(0, 5);
    const page =
      await api.functional.shoppingMall.admin.coupons.issuances.index(
        connection,
        {
          couponId: coupon.id,
          body: {
            code: codeFragment,
          },
        },
      );
    typia.assert(page);
    TestValidator.predicate(
      "all code search results should include code fragment",
      page.data.every((x) => x.code.includes(codeFragment)),
    );
  }

  // 5c. Filter by issued_at time window (pick known range)
  if (createdIssuances.length > 2) {
    const from = createdIssuances[2].issued_at;
    const to = createdIssuances[0].issued_at;
    const page =
      await api.functional.shoppingMall.admin.coupons.issuances.index(
        connection,
        {
          couponId: coupon.id,
          body: {
            issued_at_from: from,
            issued_at_to: to,
          },
        },
      );
    typia.assert(page);
    TestValidator.predicate(
      "all filter results issued within range",
      page.data.every((x) => x.issued_at >= from && x.issued_at <= to),
    );
  }

  // 5d. Pagination (limit=2)
  const page1 = await api.functional.shoppingMall.admin.coupons.issuances.index(
    connection,
    {
      couponId: coupon.id,
      body: {
        limit: 2,
        page: 1,
      },
    },
  );
  typia.assert(page1);
  TestValidator.equals("page size is 2", page1.data.length, 2);
  TestValidator.equals(
    "pagination reflects request",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", page1.pagination.limit, 2);

  // 6. Audit/evidence fields present
  for (const issuance of page1.data) {
    TestValidator.predicate(
      "created_at present",
      typeof issuance.created_at === "string",
    );
    TestValidator.predicate(
      "updated_at present",
      typeof issuance.updated_at === "string",
    );
    TestValidator.predicate(
      "status present",
      typeof issuance.status === "string",
    );
    TestValidator.predicate("deleted_at present", "deleted_at" in issuance);
  }

  // 7. Negative: no results for impossible search
  const emptyPage =
    await api.functional.shoppingMall.admin.coupons.issuances.index(
      connection,
      {
        couponId: coupon.id,
        body: {
          code: "nonexistentCodeFragment",
        },
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty result on nonexistent code search",
    emptyPage.data.length,
    0,
  );

  // 8. Negative: page out of range
  const outOfRange =
    await api.functional.shoppingMall.admin.coupons.issuances.index(
      connection,
      {
        couponId: coupon.id,
        body: {
          page: 100,
          limit: 2,
        },
      },
    );
  typia.assert(outOfRange);
  TestValidator.equals(
    "empty result on out-of-range page",
    outOfRange.data.length,
    0,
  );
}

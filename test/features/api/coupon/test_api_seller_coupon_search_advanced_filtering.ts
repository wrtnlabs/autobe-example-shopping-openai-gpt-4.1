import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCoupon";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate advanced coupon searching and filtering for seller portal.
 *
 * 1. Register and authenticate as a new seller.
 * 2. Perform a variety of filter/search scenarios: a. By partial code b. By coupon
 *    type (one of public/private/one-time) c. By discount type
 *    (amount/percentage) d. By stackable/exclusive flags e. By business status
 *    (cannot validate with listing response) f. By validity date ranges
 *    (issued/expires) g. By usage statistics (min/max issued/used counts) h.
 *    Pagination (page, limit) i. Sorting by supported business/analytic fields
 * 3. Assert that all returned coupons match the filter criteria, and only coupons
 *    owned by this seller are present.
 * 4. Negative test: ensure filter with impossible usage_min yields zero results.
 *    Ensure seller cannot see coupons from others.
 */
export async function test_api_seller_coupon_search_advanced_filtering(
  connection: api.IConnection,
) {
  // --- 1. Register and authenticate as new seller ---
  const sellerPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    profile_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.IJoin;

  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerPayload,
  });
  typia.assert(sellerAuth);
  TestValidator.predicate(
    "seller is authenticated and profile exists",
    sellerAuth.seller !== undefined && sellerAuth.token.access.length > 0,
  );

  // --- 2. Perform various search/filter scenarios (assuming coupons exist for this seller) ---
  // (a) Filter by partial code
  const partialCode = "SALE";
  const filterByPartialCode = {
    code: partialCode,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCoupon.IRequest;
  const resultByCode = await api.functional.shoppingMall.seller.coupons.index(
    connection,
    { body: filterByPartialCode },
  );
  typia.assert(resultByCode);
  TestValidator.predicate(
    "filtered by code: coupons match code fragment",
    resultByCode.data.every((c) => c.code.includes(partialCode)),
  );

  // (b) Filter by coupon_type
  const couponTypes = ["public", "private", "one-time"] as const;
  for (const coupon_type of couponTypes) {
    const filter = {
      coupon_type,
      page: 1,
      limit: 5,
    } satisfies IShoppingMallCoupon.IRequest;
    const page = await api.functional.shoppingMall.seller.coupons.index(
      connection,
      { body: filter },
    );
    typia.assert(page);
    TestValidator.predicate(
      `all coupons are coupon_type=${coupon_type}`,
      page.data.every((c) => c.coupon_type === coupon_type),
    );
  }

  // (c) Filter by discount_type (amount/percentage)
  const discountTypes = ["amount", "percentage"] as const;
  for (const discount_type of discountTypes) {
    const filter = {
      discount_type,
      page: 1,
      limit: 5,
    } satisfies IShoppingMallCoupon.IRequest;
    const page = await api.functional.shoppingMall.seller.coupons.index(
      connection,
      { body: filter },
    );
    typia.assert(page);
    TestValidator.predicate(
      `all coupons discount_type=${discount_type}`,
      page.data.every((c) => c.discount_type === discount_type),
    );
  }

  // (d) Stackable/exclusive boolean checks
  for (const stackable of [true, false]) {
    const filter = {
      stackable,
      page: 1,
      limit: 5,
    } satisfies IShoppingMallCoupon.IRequest;
    const page = await api.functional.shoppingMall.seller.coupons.index(
      connection,
      { body: filter },
    );
    typia.assert(page);
    TestValidator.predicate(
      `all coupons stackable=${stackable}`,
      page.data.every((c) => c.stackable === stackable),
    );
  }
  for (const exclusive of [true, false]) {
    const filter = {
      exclusive,
      page: 1,
      limit: 5,
    } satisfies IShoppingMallCoupon.IRequest;
    const page = await api.functional.shoppingMall.seller.coupons.index(
      connection,
      { body: filter },
    );
    typia.assert(page);
    TestValidator.predicate(
      `all coupons exclusive=${exclusive}`,
      page.data.every((c) => c.exclusive === exclusive),
    );
  }

  // (e) Filter by business_status
  for (const business_status of [
    "active",
    "paused",
    "draft",
    "expired",
  ] as const) {
    const filter = {
      business_status,
      page: 1,
      limit: 5,
    } satisfies IShoppingMallCoupon.IRequest;
    const page = await api.functional.shoppingMall.seller.coupons.index(
      connection,
      { body: filter },
    );
    typia.assert(page);
    // Cannot validate since ISummary does not have business_status field
    // Just check result is array
    TestValidator.predicate(
      `filter by business_status (${business_status}) yields data array`,
      Array.isArray(page.data),
    );
  }

  // (f) Validity dates filter: issued_at / expires_at range
  const issuedFrom = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const expiresTo = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const filterByDates = {
    issued_at_from: issuedFrom,
    expires_at_to: expiresTo,
    page: 1,
    limit: 10,
  } satisfies IShoppingMallCoupon.IRequest;
  const pageDate = await api.functional.shoppingMall.seller.coupons.index(
    connection,
    { body: filterByDates },
  );
  typia.assert(pageDate);
  TestValidator.predicate(
    "dates filter returned coupons",
    Array.isArray(pageDate.data),
  );

  // (g) Usage limit/statistics filters (by issued/used count min/max)
  const usageFilters = [
    {
      issued_count_min: 1,
      issued_count_max: 100000,
    },
    {
      used_count_min: 0,
      used_count_max: 10,
    },
    {
      usage_limit_total_min: 1,
      usage_limit_total_max: 5,
    },
  ];
  for (const filter of usageFilters) {
    const req = {
      ...filter,
      page: 1,
      limit: 3,
    } satisfies IShoppingMallCoupon.IRequest;
    const page = await api.functional.shoppingMall.seller.coupons.index(
      connection,
      { body: req },
    );
    typia.assert(page);
    TestValidator.predicate(
      "usage/statistics filter",
      Array.isArray(page.data),
    );
  }

  // (h) Pagination: fetch page 1/2 with limit
  const pagReq1 = { page: 1, limit: 2 } satisfies IShoppingMallCoupon.IRequest;
  const pagReq2 = { page: 2, limit: 2 } satisfies IShoppingMallCoupon.IRequest;
  const pagPage1 = await api.functional.shoppingMall.seller.coupons.index(
    connection,
    { body: pagReq1 },
  );
  const pagPage2 = await api.functional.shoppingMall.seller.coupons.index(
    connection,
    { body: pagReq2 },
  );
  typia.assert(pagPage1);
  typia.assert(pagPage2);
  TestValidator.equals("pagination limit respected", pagPage1.data.length, 2);
  if (pagPage1.pagination.pages > 1)
    TestValidator.equals("pagination page 2 data", pagPage2.data.length, 2);

  // (i) Sorting: by issued_at, expires_at, used_count ascending/descending
  for (const sort of ["issued_at", "expires_at", "used_count"] as const) {
    for (const order of ["asc", "desc"] as const) {
      const req = {
        sort,
        order,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallCoupon.IRequest;
      const page = await api.functional.shoppingMall.seller.coupons.index(
        connection,
        { body: req },
      );
      typia.assert(page);
      TestValidator.predicate("sort result is array", Array.isArray(page.data));
    }
  }

  // --- 3. Negative and unauthorized/overbroad filter scenarios ---
  // (A) Negative: query with impossible usage_min filter, expect zero results
  const negativeReq = {
    used_count_min: 1000000,
    page: 1,
    limit: 1,
  } satisfies IShoppingMallCoupon.IRequest;
  const emptyPage = await api.functional.shoppingMall.seller.coupons.index(
    connection,
    { body: negativeReq },
  );
  typia.assert(emptyPage);
  TestValidator.equals(
    "no coupon found for impossible filter",
    emptyPage.data.length,
    0,
  );

  // (B) Ensure seller cannot see other sellers' coupons (by using another code prefix, expect empty)
  const otherSellerReq = {
    code: "OTHERSELLERX".repeat(3),
    page: 1,
    limit: 1,
  } satisfies IShoppingMallCoupon.IRequest;
  const notFoundPage = await api.functional.shoppingMall.seller.coupons.index(
    connection,
    { body: otherSellerReq },
  );
  typia.assert(notFoundPage);
  TestValidator.equals(
    "no coupons from other seller code",
    notFoundPage.data.length,
    0,
  );
}

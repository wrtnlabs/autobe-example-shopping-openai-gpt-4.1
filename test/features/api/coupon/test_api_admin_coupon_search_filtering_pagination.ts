import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import type { IPageIShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCoupon";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_coupon_search_filtering_pagination(
  connection: api.IConnection,
) {
  /**
   * Validate admin coupon search, filtering, pagination, and access control.
   *
   * This function performs E2E testing for all major coupon admin
   * search/listing scenarios:
   *
   * 1. It provisions an admin account (via join API) and authenticates.
   * 2. It creates multiple distinct coupons under different business cases:
   *    active, expired, scheduled, fixed/percentage/shipping, etc.
   * 3. It tests unfiltered listing, then filtering by status, code substring,
   *    title substring.
   * 4. It verifies pagination/limits and edge cases (page overflow, restrictive
   *    filter yielding no results).
   * 5. It finally ensures non-admins (unauthenticated requests) are denied access
   *    to this endpoint. The function enforces all API schema rules, validates
   *    response structures and business logic, uses strictly typed data, and
   *    leverages TestValidator with descriptive expectation strings
   *    throughout.
   */
  // 1. Create and authenticate admin
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminEmail = `${adminUsername}@company.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const adminName = RandomGenerator.name();
  const adminPhone = RandomGenerator.mobile();
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: adminName,
      email: adminEmail,
      is_active: true,
      phone_number: adminPhone,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);
  // 2. Create distinct coupons
  const statuses = ["active", "expired", "scheduled"] as const;
  const codes = ArrayUtil.repeat(
    4,
    (i) => `COUPON${RandomGenerator.alphaNumeric(6)}${i}`,
  );
  const titles = ArrayUtil.repeat(
    4,
    (i) => `Promo ${RandomGenerator.name(1)} ${i}`,
  );
  const now = new Date();
  const isoDate = (d: Date) => d.toISOString();
  const farFuture = new Date(
    now.getFullYear() + 1,
    now.getMonth(),
    now.getDate(),
  );
  const farPast = new Date(
    now.getFullYear() - 1,
    now.getMonth(),
    now.getDate(),
  );
  // Diverse business configurations
  const coupons: IShoppingMallAiBackendCoupon[] = [
    // 1. Active coupon with future expiry
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: {
          code: codes[0],
          type: "fixed",
          title: titles[0],
          value: 1000,
          status: "active",
          stackable: true,
          personal: false,
          expires_at: isoDate(farFuture),
          published_at: isoDate(now),
        } satisfies IShoppingMallAiBackendCoupon.ICreate,
      },
    ),
    // 2. Expired coupon (expiry in the past)
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: {
          code: codes[1],
          type: "fixed",
          title: titles[1],
          value: 500,
          status: "expired",
          stackable: false,
          personal: true,
          expires_at: isoDate(farPast),
          published_at: isoDate(farPast),
        } satisfies IShoppingMallAiBackendCoupon.ICreate,
      },
    ),
    // 3. Scheduled coupon (publishing in far future)
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: {
          code: codes[2],
          type: "percentage",
          title: titles[2],
          value: 15,
          status: "scheduled",
          stackable: false,
          personal: false,
          expires_at: isoDate(farFuture),
          published_at: isoDate(farFuture),
        } satisfies IShoppingMallAiBackendCoupon.ICreate,
      },
    ),
    // 4. Another active coupon (no expiry)
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: {
          code: codes[3],
          type: "shipping",
          title: titles[3],
          value: 100,
          status: "active",
          stackable: true,
          personal: false,
          published_at: isoDate(now),
        } satisfies IShoppingMallAiBackendCoupon.ICreate,
      },
    ),
  ];
  coupons.forEach((c) => typia.assert(c));
  // 3. Basic unfiltered listing and overall count
  const pageAll =
    await api.functional.shoppingMallAiBackend.admin.coupons.index(connection, {
      body: { page: 1, limit: 10 },
    });
  typia.assert(pageAll);
  TestValidator.predicate(
    "listing contains all created coupons",
    pageAll.data.length >= coupons.length,
  );
  // 4. Filtering by status
  for (const status of statuses) {
    const pageByStatus =
      await api.functional.shoppingMallAiBackend.admin.coupons.index(
        connection,
        {
          body: { status, page: 1, limit: 10 },
        },
      );
    typia.assert(pageByStatus);
    TestValidator.predicate(
      `all returned coupons match status ${status}`,
      pageByStatus.data.every((c) => c.status === status),
    );
  }
  // 5. Substring search by code/title
  for (const i of [0, 1, 2, 3]) {
    const partialCode = codes[i].slice(0, 5);
    const codeFilter =
      await api.functional.shoppingMallAiBackend.admin.coupons.index(
        connection,
        {
          body: { code: partialCode, page: 1, limit: 10 },
        },
      );
    typia.assert(codeFilter);
    TestValidator.predicate(
      `all returned codes contain unique code fragment ${partialCode}`,
      codeFilter.data.every((c) => c.code.includes(partialCode)),
    );
    const partialTitle = titles[i].split(" ")[1];
    const titleFilter =
      await api.functional.shoppingMallAiBackend.admin.coupons.index(
        connection,
        {
          body: { title: partialTitle, page: 1, limit: 10 },
        },
      );
    typia.assert(titleFilter);
    TestValidator.predicate(
      `all returned titles contain partial title string ${partialTitle}`,
      titleFilter.data.every((c) => c.title.includes(partialTitle)),
    );
  }
  // 6. Pagination test: page 2, limit 2
  const paged = await api.functional.shoppingMallAiBackend.admin.coupons.index(
    connection,
    {
      body: { page: 2, limit: 2 },
    },
  );
  typia.assert(paged);
  TestValidator.equals("pagination current is 2", paged.pagination.current, 2);
  TestValidator.equals("pagination limit is 2", paged.pagination.limit, 2);
  // 7. Non-existent overflow page yields empty results
  const overflowed =
    await api.functional.shoppingMallAiBackend.admin.coupons.index(connection, {
      body: { page: 99, limit: 10 },
    });
  typia.assert(overflowed);
  TestValidator.equals(
    "overflow page returns empty data",
    overflowed.data.length,
    0,
  );
  // 8. Restrictive filter yields empty results
  const restrictive =
    await api.functional.shoppingMallAiBackend.admin.coupons.index(connection, {
      body: { code: "NO_MATCH_CODE" },
    });
  typia.assert(restrictive);
  TestValidator.equals(
    "overly restrictive code filter returns no results",
    restrictive.data.length,
    0,
  );
  // 9. Access control: unauthenticated user denied
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "endpoint must be forbidden for unauthenticated access",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.index(
        unauthConn,
        {
          body: { page: 1, limit: 1 },
        },
      );
    },
  );
}

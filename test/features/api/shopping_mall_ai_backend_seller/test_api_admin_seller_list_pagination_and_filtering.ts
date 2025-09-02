import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IPageIShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_seller_list_pagination_and_filtering(
  connection: api.IConnection,
) {
  /**
   * E2E test: Admin paginated and filtered seller listing (PATCH
   * /shoppingMallAiBackend/admin/sellers)
   *
   * - Verifies that admin can obtain a list of sellers with and without filters.
   * - Checks filtering by name, business registration number, email, is_active,
   *   is_verified, date ranges.
   * - Tests pagination logic (page/limit/records/pages metadata).
   * - Validates access control (endpoint is admin-only).
   * - Asserts with typia and TestValidator that all types and filtering are
   *   correct.
   */

  // 1. Create and authenticate an admin account
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminBody: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.name(2).replace(/\s/g, "_"),
    password_hash: adminPassword,
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(adminAuth);
  const admin = adminAuth.admin;

  // 2. Create several sellers with distinct values
  const sellerCount = 6;
  const sellerInputs: IShoppingMallAiBackendSeller.ICreate[] = ArrayUtil.repeat(
    sellerCount,
    (idx) => ({
      email: typia.random<string & tags.Format<"email">>(),
      business_registration_number: `BRN-${10000 + idx}`,
      name: `Test Seller ${idx + 1}`,
    }),
  );
  const sellers: IShoppingMallAiBackendSeller.ISeller[] = [];

  for (let idx = 0; idx < sellerInputs.length; ++idx) {
    // Join as this seller. Each join auto-switches the token to seller, so we must restore admin afterward.
    const result = await api.functional.auth.seller.join(connection, {
      body: sellerInputs[idx],
    });
    typia.assert(result);
    sellers.push(result.seller);
    // Re-authenticate as admin for subsequent actions
    await api.functional.auth.admin.join(connection, { body: adminBody });
  }

  // Capture creation timestamps for date-range filtering
  const createdAtTimestamps = sellers.map((s) => s.created_at);

  // 3. List all sellers with no filters
  {
    const res = await api.functional.shoppingMallAiBackend.admin.sellers.index(
      connection,
      {
        body: {} satisfies IShoppingMallAiBackendSeller.IRequest,
      },
    );
    typia.assert(res);
    // Must include all newly created sellers
    sellers.forEach((seller) => {
      TestValidator.predicate(
        `all sellers (no filter) should include ${seller.email}`,
        res.data.some(
          (row) =>
            row.email === seller.email &&
            row.business_registration_number ===
              seller.business_registration_number &&
            row.name === seller.name,
        ),
      );
    });
    TestValidator.equals(
      "total records all sellers",
      res.pagination.records,
      sellers.length,
    );
    TestValidator.equals("first page current == 1", res.pagination.current, 1);
  }

  // 4. Filtering by exact name, email, business registration number
  {
    const idx = Math.floor(Math.random() * sellers.length);
    const filterSample = sellers[idx];
    const filterTests: [
      Partial<IShoppingMallAiBackendSeller.IRequest>,
      keyof IShoppingMallAiBackendSeller.ISummary,
      string,
    ][] = [
      [{ name: filterSample.name }, "name", filterSample.name],
      [{ email: filterSample.email }, "email", filterSample.email],
      [
        {
          business_registration_number:
            filterSample.business_registration_number,
        },
        "business_registration_number",
        filterSample.business_registration_number,
      ],
    ];
    for (const [req, key, value] of filterTests) {
      const res =
        await api.functional.shoppingMallAiBackend.admin.sellers.index(
          connection,
          {
            body: req satisfies IShoppingMallAiBackendSeller.IRequest,
          },
        );
      typia.assert(res);
      TestValidator.predicate(
        `filter by ${key}: ${String(value)} - only matching seller included`,
        res.data.length === 1 && res.data[0][key] === value,
      );
    }
  }

  // 5. Filtering by is_active/is_verified (should be all true at creation)
  {
    for (const is_active of [true, false]) {
      const res =
        await api.functional.shoppingMallAiBackend.admin.sellers.index(
          connection,
          {
            body: { is_active } satisfies IShoppingMallAiBackendSeller.IRequest,
          },
        );
      typia.assert(res);
      TestValidator.predicate(
        `filter by is_active=${is_active} only includes matching sellers`,
        res.data.every((row) => row.is_active === is_active),
      );
      if (is_active)
        TestValidator.equals(
          `is_active=true count`,
          res.pagination.records,
          sellers.length,
        );
      else
        TestValidator.equals(
          `is_active=false count`,
          res.pagination.records,
          0,
        );
    }
    // Repeat for is_verified
    for (const is_verified of [true, false]) {
      const res =
        await api.functional.shoppingMallAiBackend.admin.sellers.index(
          connection,
          {
            body: {
              is_verified,
            } satisfies IShoppingMallAiBackendSeller.IRequest,
          },
        );
      typia.assert(res);
      TestValidator.predicate(
        `filter by is_verified=${is_verified} only includes matching sellers`,
        res.data.every((row) => row.is_verified === is_verified),
      );
      if (is_verified)
        TestValidator.equals(
          `is_verified=true count`,
          res.pagination.records,
          sellers.length,
        );
      else
        TestValidator.equals(
          `is_verified=false count`,
          res.pagination.records,
          0,
        );
    }
  }

  // 6. Pagination tests (split into pages, verify no overlap)
  {
    // Use small limit to generate multiple pages
    const limit = 2;
    const seenSellerEmails = new Set<string>();
    let pageNum = 1;
    while (true) {
      const res =
        await api.functional.shoppingMallAiBackend.admin.sellers.index(
          connection,
          {
            body: {
              limit,
              page: pageNum,
            } satisfies IShoppingMallAiBackendSeller.IRequest,
          },
        );
      typia.assert(res);
      res.data.forEach((row) => {
        TestValidator.predicate(
          `pagination: seller in result`,
          sellers.some((s) => s.email === row.email),
        );
        TestValidator.predicate(
          `pagination: no duplicate`,
          !seenSellerEmails.has(row.email),
        );
        seenSellerEmails.add(row.email);
      });
      TestValidator.equals(
        `page ${pageNum}: current matches payload`,
        res.pagination.current,
        pageNum,
      );
      TestValidator.equals(
        `page ${pageNum}: limit matches payload`,
        res.pagination.limit,
        limit,
      );
      if (pageNum === 1)
        TestValidator.equals(
          "total records for paginated listing",
          res.pagination.records,
          sellers.length,
        );
      if (res.data.length < limit) break;
      ++pageNum;
    }
    TestValidator.equals(
      "all paginated sellers seen",
      seenSellerEmails.size,
      sellers.length,
    );
  }

  // 7. Filter by created_at and updated_at date ranges
  {
    // Find the min/max timestamps from sellers
    const allDates = createdAtTimestamps.map((d) => new Date(d));
    const minCreated = new Date(
      Math.min.apply(
        null,
        allDates.map((d) => d.getTime()),
      ),
    );
    const maxCreated = new Date(
      Math.max.apply(
        null,
        allDates.map((d) => d.getTime()),
      ),
    );
    // Make a range that definitely includes all sellers
    const resTotal =
      await api.functional.shoppingMallAiBackend.admin.sellers.index(
        connection,
        {
          body: {
            created_at_from: minCreated.toISOString(),
            created_at_to: maxCreated.toISOString(),
          } satisfies IShoppingMallAiBackendSeller.IRequest,
        },
      );
    typia.assert(resTotal);
    TestValidator.equals(
      "created_at total within full range",
      resTotal.pagination.records,
      sellers.length,
    );
    // Now out-of-bounds future range (should return 0 results)
    const future = new Date(maxCreated.getTime() + 3600 * 1000).toISOString();
    const resFuture =
      await api.functional.shoppingMallAiBackend.admin.sellers.index(
        connection,
        {
          body: {
            created_at_from: future,
            created_at_to: future,
          } satisfies IShoppingMallAiBackendSeller.IRequest,
        },
      );
    typia.assert(resFuture);
    TestValidator.equals(
      "created_at future range returns 0",
      resFuture.pagination.records,
      0,
    );
  }

  // 8. Access control: request as a fresh/unauthenticated connection should fail
  {
    const unauthConn = { ...connection, headers: {} };
    await TestValidator.error(
      "non-admin cannot access admin seller list",
      async () => {
        await api.functional.shoppingMallAiBackend.admin.sellers.index(
          unauthConn,
          {
            body: {} satisfies IShoppingMallAiBackendSeller.IRequest,
          },
        );
      },
    );
  }
}

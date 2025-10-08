import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Admin registration and seller search/filter/compliance test.
 *
 * 1. Register a new admin account
 * 2. Perform seller search: unfiltered - validate structure
 * 3. Perform seller search - filtered by business_name (fuzzy, partial)
 * 4. Perform seller search - filtered by email (full match)
 * 5. Perform seller search - filtered by approval_status
 * 6. Perform seller search - filtered by registration date range
 * 7. Perform seller search - with pagination (page/limit)
 * 8. Perform seller search - sorted by approval_status & business_name
 * 9. Attempt to fetch sellers with unauthenticated/invalid admin (should error)
 * 10. For a selected result set, simulate a compliance/KYC review by asserting all
 *     fields returned are allowed for admin, and sensitive info is not
 *     present.
 */
export async function test_api_admin_seller_search_and_filter_with_compliance_workflow(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name();

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(authorized);
  TestValidator.equals("admin email matches", authorized.email, adminEmail);

  // 2. Unfiltered seller search
  const sellerPage: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {},
    });
  typia.assert(sellerPage);
  TestValidator.predicate(
    "pagination exists",
    typeof sellerPage.pagination.current === "number",
  );
  TestValidator.predicate(
    "all sellers structure is valid",
    sellerPage.data.every(
      (s) => typeof s.id === "string" && typeof s.business_name === "string",
    ),
  );

  // 3. Filter by business_name (fuzzy)
  if (sellerPage.data.length > 0) {
    const seller = RandomGenerator.pick(sellerPage.data);
    const partialBusiness = seller.business_name.substring(
      0,
      Math.floor(seller.business_name.length / 2),
    );
    const filteredByBusiness: IPageIShoppingMallSeller.ISummary =
      await api.functional.shoppingMall.admin.sellers.index(connection, {
        body: { business_name: partialBusiness },
      });
    typia.assert(filteredByBusiness);
    TestValidator.predicate(
      "business_name filter matches",
      filteredByBusiness.data.every((s) =>
        s.business_name.includes(partialBusiness),
      ),
    );
  }

  // 4. Filter by email (full match)
  if (sellerPage.data.length > 0) {
    const seller = RandomGenerator.pick(sellerPage.data);
    const filteredByEmail: IPageIShoppingMallSeller.ISummary =
      await api.functional.shoppingMall.admin.sellers.index(connection, {
        body: { email: seller.email },
      });
    typia.assert(filteredByEmail);
    TestValidator.predicate(
      "email filter matches",
      filteredByEmail.data.every((s) => s.email === seller.email),
    );
  }

  // 5. Filter by approval_status
  const statuses = sellerPage.data.map((s) => s.approval_status);
  if (statuses.length > 0) {
    const statusSample = RandomGenerator.pick(statuses);
    const filteredByStatus: IPageIShoppingMallSeller.ISummary =
      await api.functional.shoppingMall.admin.sellers.index(connection, {
        body: { approval_status: statusSample },
      });
    typia.assert(filteredByStatus);
    TestValidator.predicate(
      "approval_status filter matches",
      filteredByStatus.data.every((s) => s.approval_status === statusSample),
    );
  }

  // 6. Filter by registration date range
  if (sellerPage.data.length > 0) {
    const seller = RandomGenerator.pick(sellerPage.data);
    const createdAt = seller.created_at;
    const dateRangeRes: IPageIShoppingMallSeller.ISummary =
      await api.functional.shoppingMall.admin.sellers.index(connection, {
        body: {
          created_from: createdAt,
          created_to: createdAt,
        },
      });
    typia.assert(dateRangeRes);
    TestValidator.predicate(
      "created_at in date range",
      dateRangeRes.data.every((s) => s.created_at === createdAt),
    );
  }

  // 7. Pagination test
  const paged: IPageIShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: {
        page: 1,
        limit: 1,
      },
    });
  typia.assert(paged);
  TestValidator.equals("page is 1", paged.pagination.current, 1);
  TestValidator.equals("limit is 1", paged.pagination.limit, 1);

  // 8. Sorting test (use approval_status, business_name)
  const sortingFields = ["approval_status", "business_name"] as const;
  for (const field of sortingFields) {
    for (const order of ["asc", "desc"] as const) {
      const sortRes: IPageIShoppingMallSeller.ISummary =
        await api.functional.shoppingMall.admin.sellers.index(connection, {
          body: {
            sort_by: field,
            order,
          },
        });
      typia.assert(sortRes);
      if (sortRes.data.length > 1) {
        const comparator = (
          a: IShoppingMallSeller.ISummary,
          b: IShoppingMallSeller.ISummary,
        ) => {
          const av = a[field];
          const bv = b[field];
          if (av < bv) return order === "asc" ? -1 : 1;
          if (av > bv) return order === "asc" ? 1 : -1;
          return 0;
        };
        const sorted = [...sortRes.data].sort(comparator);
        TestValidator.equals(
          `${field} sorting ${order}`,
          sortRes.data.map((s) => s.id),
          sorted.map((s) => s.id),
        );
      }
    }
  }

  // 9. Test unauthenticated access (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized seller fetch should error",
    async () => {
      await api.functional.shoppingMall.admin.sellers.index(unauthConn, {
        body: {},
      });
    },
  );

  // 10. Compliance/KYC: confirm returned fields match ISummary (no leaks)
  if (sellerPage.data.length > 0) {
    for (const seller of sellerPage.data) {
      // Only allowed fields: id, email, business_name, approval_status, contact_name, created_at
      const keys = Object.keys(seller);
      const allowed = [
        "id",
        "email",
        "business_name",
        "approval_status",
        "contact_name",
        "created_at",
      ];
      TestValidator.equals(
        "seller summary fields compliance",
        keys.sort(),
        allowed.sort(),
      );
    }
  }
}

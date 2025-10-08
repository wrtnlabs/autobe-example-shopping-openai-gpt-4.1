import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";

/**
 * E2E test for admin customer list search and pagination on the shopping mall
 * platform.
 *
 * 1. Admin joins/authenticates via /auth/admin/join for a unique admin context.
 * 2. Register two (or more) customer accounts to ensure sufficient data for
 *    meaningful pagination tests; customers have random
 *    emails/names/phones/addresses.
 * 3. Admin lists all customers via PATCH /shoppingMall/admin/customers with
 *    default pagination. Verify results include both newly registered customers
 *    and that all ISummary properties are present (with correct types), but
 *    nothing more (no phone or address).
 * 4. Test pagination: set limit=1, page=1. Verify only one result returned, with
 *    correct pagination metadata. Fetch page=2, confirm different customer.
 *    Ensure boundaries behave as expected (e.g., page>total pages returns 0
 *    results).
 * 5. Test search: filter by partial or full name/email for each created customer,
 *    verify search results match expectations. Try search with non-existent
 *    string, verify empty result.
 * 6. Test status and email_verified filters: confirm only customers with exact
 *    match included/excluded appropriately.
 * 7. Throughout, check that no sensitive info leaks (phone, address, full profile,
 *    etc.), only fields in ISummary exist.
 */
export async function test_api_admin_customer_list_search_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin registration for context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(2),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Register two customer accounts
  const customers = await ArrayUtil.asyncMap([0, 1], async (idx) => {
    const customerJoinBody = {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.MinLength<8> &
        tags.MaxLength<100>,
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(1),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 6,
        }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        address_line2: null,
        is_default: true,
      },
    } satisfies IShoppingMallCustomer.IJoin;
    const customer = await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
    typia.assert(customer);
    return customer;
  });

  // 3. Admin lists all customers
  const listAll = await api.functional.shoppingMall.admin.customers.index(
    connection,
    {
      body: {} satisfies IShoppingMallCustomer.IRequest,
    },
  );
  typia.assert(listAll);
  TestValidator.predicate(
    "both customer emails present in admin list",
    customers.every((c) => listAll.data.some((d) => d.email === c.email)),
  );

  // Confirm no sensitive fields leak beyond ISummary
  listAll.data.forEach((summary) => {
    TestValidator.equals(
      "no phone leaks in summary",
      (summary as any).phone,
      undefined,
    );
    TestValidator.equals(
      "no address leaks in summary",
      (summary as any).address,
      undefined,
    );
    const allowedKeys = [
      "id",
      "email",
      "full_name",
      "status",
      "email_verified",
      "created_at",
    ];
    TestValidator.equals(
      "only ISummary keys exist",
      Object.keys(summary).sort(),
      allowedKeys.sort(),
    );
  });

  // 4. Test pagination (limit=1, page=1/2)
  const page1 = await api.functional.shoppingMall.admin.customers.index(
    connection,
    {
      body: { limit: 1, page: 1 },
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "pagination returns 1 result for limit=1",
    page1.data.length,
    1,
  );
  TestValidator.equals(
    "pagination meta reflects requested limit",
    page1.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination meta reflects page 1",
    page1.pagination.current,
    1,
  );

  const page2 = await api.functional.shoppingMall.admin.customers.index(
    connection,
    {
      body: { limit: 1, page: 2 },
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "pagination returns 1 result for limit=1 page=2",
    page2.data.length,
    1,
  );
  TestValidator.notEquals(
    "page 1 and page 2 customers differ",
    page1.data[0].id,
    page2.data[0].id,
  );

  const emptyPage = await api.functional.shoppingMall.admin.customers.index(
    connection,
    {
      body: { limit: 1, page: 100 },
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals(
    "overshoot page returns no results",
    emptyPage.data.length,
    0,
  );

  // 5. Search for each customer (by unique email and full_name)
  for (const customer of customers) {
    // By full email
    const searchByEmail =
      await api.functional.shoppingMall.admin.customers.index(connection, {
        body: { search: customer.email },
      });
    typia.assert(searchByEmail);
    TestValidator.predicate(
      `search by email finds customer ${customer.email}`,
      searchByEmail.data.some((c) => c.email === customer.email),
    );

    // By full_name (use substring)
    const nameFragment = customer.full_name.split(" ")[0];
    const searchByName =
      await api.functional.shoppingMall.admin.customers.index(connection, {
        body: { search: nameFragment },
      });
    typia.assert(searchByName);
    TestValidator.predicate(
      `search by name fragment finds at least one matching customer (${nameFragment})`,
      searchByName.data.some((c) => c.full_name.includes(nameFragment)),
    );
  }

  // 6. Search with a non-existent string
  const nonsenseSearch =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: { search: "~no_such_user_targeted~" },
    });
  typia.assert(nonsenseSearch);
  TestValidator.equals(
    "nonsense search yields empty result",
    nonsenseSearch.data.length,
    0,
  );

  // 7. Test status filter for 'active' (all customers just created are active)
  const activeFiltered =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: { status: "active" },
    });
  typia.assert(activeFiltered);
  TestValidator.predicate(
    "all filtered results have status active",
    activeFiltered.data.every((c) => c.status === "active"),
  );

  // 8. Test email_verified true/false filter
  // Just registered customers are not email verified
  const unverifiedFiltered =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: { email_verified: false },
    });
  typia.assert(unverifiedFiltered);
  TestValidator.predicate(
    "all filtered results have email_verified false",
    unverifiedFiltered.data.every((c) => c.email_verified === false),
  );
}

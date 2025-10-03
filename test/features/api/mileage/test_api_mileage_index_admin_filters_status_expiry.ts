import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMileage";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";

/**
 * Test advanced search with filters for status and expiry date in admin mileage
 * index API.
 *
 * 1. Admin joins
 * 2. Multiple customers are created (all on same random channel)
 * 3. Admin creates a mileage account for each customer with one of: 'active' (very
 *    future expiry), 'expired' (recently expired), 'frozen' (far future
 *    expiry)
 * 4. Admin search for status = 'expired' and expired_after = now: only expired
 *    entries should match
 * 5. Admin search for status = 'active' and expired_before = far future: only
 *    active entries
 * 6. Admin search for status = 'frozen': only frozen
 * 7. Admin search for all: returns all
 */
export async function test_api_mileage_index_admin_filters_status_expiry(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPw123!!",
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Create a random channel id for this test (all customers to join)
  const channelId = typia.random<string & tags.Format<"uuid">>();
  // 3. Register three customers
  const customerInputs = [0, 1, 2].map(() => ({
    shopping_mall_channel_id: channelId,
    email: typia.random<string & tags.Format<"email">>(),
    password: "customerTestPw!24",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  }));
  const customers: IShoppingMallCustomer.IAuthorized[] = [];
  for (const input of customerInputs) {
    const cu = await api.functional.auth.customer.join(connection, {
      body: input,
    });
    typia.assert(cu);
    customers.push(cu);
  }
  // 4. For each customer, create one mileage - status 'active', 'expired', 'frozen' with various exp dates
  const now = new Date();
  // active: 1 year in future, expired: 1 day ago, frozen: 3 years in future
  const statusList = ["active", "expired", "frozen"] as const;
  const expiryList = [
    new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 yr future
    new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
    new Date(now.getTime() + 3 * 365 * 24 * 60 * 60 * 1000), // 3 yrs future
  ];
  const mileages: IShoppingMallMileage[] = [];
  for (let i = 0; i < 3; ++i) {
    const out = await api.functional.shoppingMall.admin.mileages.create(
      connection,
      {
        body: {
          shopping_mall_customer_id: customers[i].id,
          balance: 1000 + i * 100,
          status: statusList[i],
          expired_at: expiryList[i].toISOString(),
        },
      },
    );
    typia.assert(out);
    mileages.push(out);
  }
  // 5. Search for status = 'expired' and expired_after = now (should only get expired)
  const resultExpired = await api.functional.shoppingMall.admin.mileages.index(
    connection,
    {
      body: {
        status: "expired",
        expired_after: now.toISOString(),
      },
    },
  );
  typia.assert(resultExpired);
  TestValidator.predicate(
    "all returned mileage have status 'expired' and expired_at after now",
    resultExpired.data.every(
      (m) =>
        m.status === "expired" &&
        !!m.expired_at &&
        new Date(m.expired_at) > now,
    ),
  );
  // 6. Search for status = 'active' and expired_before = 2 years from now
  const activeBefore = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
  const resultActive = await api.functional.shoppingMall.admin.mileages.index(
    connection,
    {
      body: {
        status: "active",
        expired_before: activeBefore.toISOString(),
      },
    },
  );
  typia.assert(resultActive);
  TestValidator.predicate(
    "all returned mileage have status 'active' & expire < 2 years from now",
    resultActive.data.every(
      (m) =>
        m.status === "active" &&
        !!m.expired_at &&
        new Date(m.expired_at) < activeBefore,
    ),
  );
  // 7. Search for status = 'frozen'
  const resultFrozen = await api.functional.shoppingMall.admin.mileages.index(
    connection,
    {
      body: {
        status: "frozen",
      },
    },
  );
  typia.assert(resultFrozen);
  TestValidator.predicate(
    "all returned mileage have status 'frozen'",
    resultFrozen.data.every((m) => m.status === "frozen"),
  );
  // 8. Search for all, no filter - returns at least 3 accounts
  const resultAll = await api.functional.shoppingMall.admin.mileages.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(resultAll);
  TestValidator.predicate(
    "all created mileages exist in the full search",
    mileages.every((m) => resultAll.data.some((x) => x.id === m.id)),
  );
}

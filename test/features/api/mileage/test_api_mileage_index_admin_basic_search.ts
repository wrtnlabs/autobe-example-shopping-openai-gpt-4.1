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
 * Validate that an admin can perform a basic search and pagination of mileage
 * accounts in the shopping mall system.
 *
 * 1. Register an admin.
 * 2. Register several customers, each with a random channel.
 * 3. Create a mileage account for each customer through the admin endpoint.
 * 4. Search mileage accounts with pagination as the admin; validate the response
 *    contains correct number of items, correct shape, and no forbidden PII
 *    fields.
 * 5. Assert proper permission enforcement: search is denied when attempted as a
 *    customer or with no authentication.
 */
export async function test_api_mileage_index_admin_basic_search(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "testtest123",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Register N customers (across possibly different channels)
  const customerCount = 5;
  const customers: IShoppingMallCustomer.IAuthorized[] =
    await ArrayUtil.asyncRepeat(customerCount, async () => {
      const channelId = typia.random<string & tags.Format<"uuid">>();
      const email = typia.random<string & tags.Format<"email">>();
      const customer: IShoppingMallCustomer.IAuthorized =
        await api.functional.auth.customer.join(connection, {
          body: {
            shopping_mall_channel_id: channelId,
            email,
            password: "strongpass123",
            name: RandomGenerator.name(),
            phone: RandomGenerator.mobile(),
          } satisfies IShoppingMallCustomer.IJoin,
        });
      typia.assert(customer);
      return customer;
    });

  // 3. For each customer, create a mileage account via the admin endpoint
  const mileageAccounts: IShoppingMallMileage[] = await ArrayUtil.asyncMap(
    customers,
    async (customer) => {
      const mileage: IShoppingMallMileage =
        await api.functional.shoppingMall.admin.mileages.create(connection, {
          body: {
            shopping_mall_customer_id: customer.id,
            balance: Math.floor(Math.random() * 10000),
            status: RandomGenerator.pick([
              "active",
              "expired",
              "frozen",
            ] as const),
            expired_at: null,
          } satisfies IShoppingMallMileage.ICreate,
        });
      typia.assert(mileage);
      return mileage;
    },
  );

  // 4. As admin, search mileages with pagination
  const searchReq = {
    page: 1,
    limit: 3,
  } satisfies IShoppingMallMileage.IRequest;
  const page: IPageIShoppingMallMileage.ISummary =
    await api.functional.shoppingMall.admin.mileages.index(connection, {
      body: searchReq,
    });
  typia.assert(page);

  // Validate response structure (pagination info and data arrays)
  TestValidator.equals(
    "page number matches request",
    page.pagination.current,
    1,
  );
  TestValidator.equals("page limit matches request", page.pagination.limit, 3);
  TestValidator.equals(
    "records >= number created",
    page.pagination.records >= mileageAccounts.length,
    true,
  );
  TestValidator.predicate("data array length <= limit", page.data.length <= 3);
  TestValidator.predicate(
    "all items are mileage summaries",
    page.data.every(
      (item) =>
        "id" in item &&
        "shopping_mall_customer_id" in item &&
        "balance" in item,
    ),
  );

  // Validate no PII/customer fields leaked (only mileage summary fields)
  for (const item of page.data) {
    typia.assert<IShoppingMallMileage.ISummary>(item);
    // Spot check no extra fields (customer PII like email/name/phone should never leak)
    TestValidator.predicate(
      "no customer PII",
      !("email" in item) && !("name" in item) && !("phone" in item),
    );
  }

  // 5. Permission checks
  // Switch to one customer session
  const customer = customers[0];
  const customerConn: api.IConnection = {
    ...connection,
    headers: { Authorization: customer.token.access },
  };
  // Should fail as customer
  await TestValidator.error(
    "customer forbidden from /admin/mileages search",
    async () => {
      await api.functional.shoppingMall.admin.mileages.index(customerConn, {
        body: searchReq,
      });
    },
  );
  // Should fail with no authentication
  const anonConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated forbidden from /admin/mileages search",
    async () => {
      await api.functional.shoppingMall.admin.mileages.index(anonConn, {
        body: searchReq,
      });
    },
  );
}

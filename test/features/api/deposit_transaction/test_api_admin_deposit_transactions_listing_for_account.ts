import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDepositTransaction";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeposit";
import type { IShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDepositTransaction";

/**
 * Test admin listing & filtering of deposit transactions for arbitrary user
 * accounts.
 *
 * 1. Create admin and login as admin
 * 2. Create two customer accounts and let each create a deposit account
 * 3. Create deposit transactions for both customers (with different
 *    types/status/timestamps)
 * 4. As admin, list/filter transactions for each deposit account (using type,
 *    status, date range)
 * 5. Assert the filtering, pagination, and contents
 * 6. Switch to regular customer account; attempt to access other user's deposit
 *    transaction list and ensure failure.
 */
export async function test_api_admin_deposit_transactions_listing_for_account(
  connection: api.IConnection,
) {
  // Admin and customer registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  const customerEmail1 = typia.random<string & tags.Format<"email">>();
  const customerPassword1 = RandomGenerator.alphaNumeric(10);
  const customer1: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
        email: customerEmail1,
        password: customerPassword1,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer1);

  const customerEmail2 = typia.random<string & tags.Format<"email">>();
  const customerPassword2 = RandomGenerator.alphaNumeric(10);
  const customer2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: customer1.shopping_mall_channel_id,
        email: customerEmail2,
        password: customerPassword2,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer2);

  // Switch to customer1 and create deposit account
  await api.functional.auth.customer.login(connection, {
    body: {
      shopping_mall_channel_id: customer1.shopping_mall_channel_id,
      email: customerEmail1,
      password: customerPassword1,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  const deposit1: IShoppingMallDeposit =
    await api.functional.shoppingMall.customer.deposits.create(connection, {
      body: {
        shopping_mall_customer_id: customer1.id,
        balance: 10000,
        status: "active",
      } satisfies IShoppingMallDeposit.ICreate,
    });
  typia.assert(deposit1);

  // Switch to customer2 and create deposit account
  await api.functional.auth.customer.login(connection, {
    body: {
      shopping_mall_channel_id: customer2.shopping_mall_channel_id,
      email: customerEmail2,
      password: customerPassword2,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  const deposit2: IShoppingMallDeposit =
    await api.functional.shoppingMall.customer.deposits.create(connection, {
      body: {
        shopping_mall_customer_id: customer2.id,
        balance: 5000,
        status: "active",
      } satisfies IShoppingMallDeposit.ICreate,
    });
  typia.assert(deposit2);

  // Add transactions for deposit1 & deposit2
  const types = ["income", "outcome", "refund", "admin_adjustment"] as const;
  const statuses = ["applied", "confirmed", "failed"] as const;
  const now = new Date();

  await ArrayUtil.asyncRepeat(5, async (idx) => {
    await api.functional.shoppingMall.customer.deposits.transactions.create(
      connection,
      {
        depositId: deposit1.id,
        body: {
          type: RandomGenerator.pick(types),
          amount: 1000 + idx * 100,
          shopping_mall_customer_id: customer1.id,
          business_status: RandomGenerator.pick(statuses),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallDepositTransaction.ICreate,
      },
    );
  });

  await ArrayUtil.asyncRepeat(3, async (idx) => {
    await api.functional.shoppingMall.customer.deposits.transactions.create(
      connection,
      {
        depositId: deposit2.id,
        body: {
          type: RandomGenerator.pick(types),
          amount: 500 + idx * 50,
          shopping_mall_customer_id: customer2.id,
          business_status: RandomGenerator.pick(statuses),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallDepositTransaction.ICreate,
      },
    );
  });

  // Switch to admin account for listing/filtering
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // List all transactions for deposit1 (no filter)
  let page: IPageIShoppingMallDepositTransaction =
    await api.functional.shoppingMall.admin.deposits.transactions.index(
      connection,
      {
        depositId: deposit1.id,
        body: {},
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "admin can see all deposit1 transactions",
    page.data.length >= 5,
  );

  // Filtering: by business_status
  const sampleStatus = "applied";
  const pageByStatus: IPageIShoppingMallDepositTransaction =
    await api.functional.shoppingMall.admin.deposits.transactions.index(
      connection,
      {
        depositId: deposit1.id,
        body: { business_status: sampleStatus },
      },
    );
  typia.assert(pageByStatus);
  TestValidator.predicate(
    "filter by business_status applies",
    pageByStatus.data.every((x) => x.business_status === sampleStatus),
  );

  // Filtering: by type
  const sampleType = "income";
  const pageByType: IPageIShoppingMallDepositTransaction =
    await api.functional.shoppingMall.admin.deposits.transactions.index(
      connection,
      {
        depositId: deposit1.id,
        body: { type: sampleType },
      },
    );
  typia.assert(pageByType);
  TestValidator.predicate(
    "filter by type applies",
    pageByType.data.every((x) => x.type === sampleType),
  );

  // Filtering: by date range
  const startDate = new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString();
  const endDate = new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString();
  const pageByDate: IPageIShoppingMallDepositTransaction =
    await api.functional.shoppingMall.admin.deposits.transactions.index(
      connection,
      {
        depositId: deposit1.id,
        body: { start_date: startDate, end_date: endDate },
      },
    );
  typia.assert(pageByDate);
  TestValidator.predicate(
    "date range filter applies",
    pageByDate.data.every(
      (x) => x.created_at >= startDate && x.created_at < endDate,
    ),
  );

  // Pagination: fetch first page with limit=2
  const pageWithLimit: IPageIShoppingMallDepositTransaction =
    await api.functional.shoppingMall.admin.deposits.transactions.index(
      connection,
      {
        depositId: deposit1.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<200>,
        },
      },
    );
  typia.assert(pageWithLimit);
  TestValidator.equals(
    "pagination works (limit == 2)",
    pageWithLimit.data.length,
    2,
  );

  // Admin can also access deposit2 (of another user)
  const page2: IPageIShoppingMallDepositTransaction =
    await api.functional.shoppingMall.admin.deposits.transactions.index(
      connection,
      {
        depositId: deposit2.id,
        body: {},
      },
    );
  typia.assert(page2);
  TestValidator.predicate(
    "admin can access another user's deposit account",
    page2.data.length >= 3,
  );

  // Switch to customer1: should NOT be able to access another user's deposit via admin API
  await api.functional.auth.customer.login(connection, {
    body: {
      shopping_mall_channel_id: customer1.shopping_mall_channel_id,
      email: customerEmail1,
      password: customerPassword1,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  await TestValidator.error(
    "customer cannot use admin transaction listing endpoint",
    async () => {
      await api.functional.shoppingMall.admin.deposits.transactions.index(
        connection,
        {
          depositId: deposit2.id,
          body: {},
        },
      );
    },
  );
}

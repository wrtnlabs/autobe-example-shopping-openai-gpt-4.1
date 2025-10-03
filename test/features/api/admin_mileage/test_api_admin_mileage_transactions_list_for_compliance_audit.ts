import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMileageTransaction";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";
import type { IShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileageTransaction";

/**
 * Validate admin compliance audit on mileage transactions.
 *
 * - Register a new admin (should get a valid token/authorized result)
 * - Admin creates a new mileage account for a synthetic customer (ID random)
 * - Attempt a transaction list for the empty (new) account (should be empty)
 * - (Assuming no transaction creation API, rely on initial 0 state)
 * - Perform transaction list fetches as admin: a) No filters (see all, which may
 *   be empty) b) filter by type = 'accrual' (likely empty) c) pagination:
 *   page=1, limit=2 (should work, regardless of 0 or more rows) d) date range
 *   (created_from/to) e) sort_by=amount, sort_order=desc
 * - Type-validate all responses, validate pagination, check array shape
 * - Confirm no financial info is leaked unless role = admin (cannot test stricter
 *   than this with available SDK)
 */
export async function test_api_admin_mileage_transactions_list_for_compliance_audit(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
      },
    });
  typia.assert(admin);

  // 2. Admin creates a mileage account for a synthetic customer
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const mileage = await api.functional.shoppingMall.admin.mileages.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerId,
        balance: 0,
        status: "active",
        expired_at: null,
      },
    },
  );
  typia.assert(mileage);

  // 3. List transactions (should be empty)
  const basePage =
    await api.functional.shoppingMall.admin.mileages.transactions.index(
      connection,
      {
        mileageId: mileage.id,
        body: {},
      },
    );
  typia.assert(basePage);
  TestValidator.equals(
    "should be empty transaction list on new mileage",
    basePage.data.length,
    0,
  );

  // 4a. List all transactions: no filter
  const allTx =
    await api.functional.shoppingMall.admin.mileages.transactions.index(
      connection,
      {
        mileageId: mileage.id,
        body: {},
      },
    );
  typia.assert(allTx);
  TestValidator.equals("list is array", Array.isArray(allTx.data), true);
  TestValidator.equals(
    "pagination fields exist",
    typeof allTx.pagination.current,
    "number",
  );

  // 4b. Filter by type="accrual"
  const accrualTx =
    await api.functional.shoppingMall.admin.mileages.transactions.index(
      connection,
      {
        mileageId: mileage.id,
        body: { type: "accrual" },
      },
    );
  typia.assert(accrualTx);
  for (const tx of accrualTx.data) {
    TestValidator.equals("is accrual type", tx.type, "accrual");
  }

  // 4c. Pagination: page=1, limit=2
  const pagedTx =
    await api.functional.shoppingMall.admin.mileages.transactions.index(
      connection,
      {
        mileageId: mileage.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingMallMileageTransaction.IRequest,
      },
    );
  typia.assert(pagedTx);
  TestValidator.equals(
    "limit respected or fewer",
    pagedTx.data.length <= 2,
    true,
  );
  TestValidator.equals(
    "pagination current is 1",
    pagedTx.pagination.current,
    1,
  );

  // 4d. Date range (created_from/to: now)
  const nowIso = new Date().toISOString();
  const txByDate =
    await api.functional.shoppingMall.admin.mileages.transactions.index(
      connection,
      {
        mileageId: mileage.id,
        body: { created_from: nowIso, created_to: nowIso },
      },
    );
  typia.assert(txByDate);
  for (const tx of txByDate.data) {
    TestValidator.predicate(`created_at >= from`, tx.created_at >= nowIso);
    TestValidator.predicate(`created_at <= to`, tx.created_at <= nowIso);
  }

  // 4e. Sorting: sort_by=amount, sort_order=desc
  const sortedTx =
    await api.functional.shoppingMall.admin.mileages.transactions.index(
      connection,
      {
        mileageId: mileage.id,
        body: { sort_by: "amount", sort_order: "desc" },
      },
    );
  typia.assert(sortedTx);
  for (let i = 1; i < sortedTx.data.length; ++i) {
    TestValidator.predicate(
      "descending amount order",
      sortedTx.data[i - 1].amount >= sortedTx.data[i].amount,
    );
  }
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import type { IShoppingMallAiBackendCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponIssuance";
import type { IPageIShoppingMallAiBackendCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCouponIssuance";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_coupon_issuance_list_by_coupon_pagination_and_filters(
  connection: api.IConnection,
) {
  /**
   * E2E validation for admin coupon issuance listing (pagination and filters).
   *
   * Business context:
   *
   * - Ensures that administrators can accurately list coupon issuances with
   *   advanced filtering and pagination.
   * - The workflow simulates a real admin issuing the same coupon to multiple
   *   customers, then querying the issuances by customer, status, issued_at
   *   date, and pagination limit.
   * - Tests ensure the results are correct, well-formed, and respond as expected
   *   to business filter criteria and page controls.
   *
   * Steps performed:
   *
   * 1. Admin is registered to obtain authentication (join).
   * 2. Admin creates a coupon policy (all required fields specified with plausible
   *    values).
   * 3. Coupon is issued (personally) to three random customer UUIDs.
   * 4. The issuance list is queried:
   *
   *    - Unfiltered (all records present)
   *    - By customer ID
   *    - By status (e.g., 'issued')
   *    - By pagination limit (eg. only 2 per page)
   *    - By issue date (issued_at range)
   *    - By multiple criteria together ((customerId + status))
   * 5. At each filter step, thorough assertions verify the filtered results
   *    correspond, fields match expectations, and response conforms to summary
   *    structure.
   */
  // 1. Register and authenticate new admin
  const username = RandomGenerator.alphaNumeric(8);
  const email = `${RandomGenerator.alphabets(10)}@example.com`;
  const password_hash = RandomGenerator.alphaNumeric(32);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username,
      password_hash,
      name: RandomGenerator.name(),
      email,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create coupon policy as admin
  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          type: "fixed",
          title: RandomGenerator.paragraph({ sentences: 3 }),
          value: 10000,
          stackable: false,
          personal: true,
          status: "active",
        } satisfies IShoppingMallAiBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);
  const couponId = typia.assert(coupon.id);

  // 3. Issue the coupon to three random customer UUIDs (simulate customers)
  const customerIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const issuanceSummaries: IShoppingMallAiBackendCouponIssuance[] = [];
  for (const customerId of customerIds) {
    const issuance =
      await api.functional.shoppingMallAiBackend.admin.coupons.issuances.createIssuance(
        connection,
        {
          couponId,
          body: {
            shopping_mall_ai_backend_customer_id: customerId,
          } satisfies IShoppingMallAiBackendCouponIssuance.ICreate,
        },
      );
    typia.assert(issuance);
    issuanceSummaries.push(issuance);
  }

  // 4.1. Unfiltered issuance list (all records)
  const allResult =
    await api.functional.shoppingMallAiBackend.admin.coupons.issuances.index(
      connection,
      {
        couponId,
        body: {},
      },
    );
  typia.assert(allResult);
  const allData = typia.assert<IShoppingMallAiBackendCouponIssuance.ISummary[]>(
    allResult.data ?? [],
  );
  TestValidator.equals(
    "Lists all issuer coupon records",
    allData.length,
    issuanceSummaries.length,
  );
  TestValidator.equals(
    "Pagination records equals data count",
    allResult.pagination?.records,
    allData.length,
  );
  TestValidator.equals(
    "Pagination limit default",
    typeof allResult.pagination?.limit,
    "number",
  );

  // 4.2. Filter by customerId (should each return exactly one record, correct customer)
  for (const customer of customerIds) {
    const customerResult =
      await api.functional.shoppingMallAiBackend.admin.coupons.issuances.index(
        connection,
        {
          couponId,
          body: {
            shopping_mall_ai_backend_customer_id: customer,
          },
        },
      );
    typia.assert(customerResult);
    const customerData = typia.assert<
      IShoppingMallAiBackendCouponIssuance.ISummary[]
    >(customerResult.data ?? []);
    TestValidator.equals(
      `Single issuance for customer ${customer}`,
      customerData.length,
      1,
    );
    TestValidator.equals(
      "Issuance customer matches filter",
      customerData[0]?.shopping_mall_ai_backend_customer_id,
      customer,
    );
  }

  // 4.3. Filter by status (using actual status value from first issuance)
  const sampleStatus = typia.assert(issuanceSummaries[0]?.status ?? "issued");
  const statusResult =
    await api.functional.shoppingMallAiBackend.admin.coupons.issuances.index(
      connection,
      {
        couponId,
        body: { status: sampleStatus },
      },
    );
  typia.assert(statusResult);
  const statusData = typia.assert<
    IShoppingMallAiBackendCouponIssuance.ISummary[]
  >(statusResult.data ?? []);
  TestValidator.predicate(
    `All issuances in response must have status = ${sampleStatus}`,
    statusData.every((i) => i.status === sampleStatus),
  );

  // 4.4. Pagination: limit = 2
  const pagedResult =
    await api.functional.shoppingMallAiBackend.admin.coupons.issuances.index(
      connection,
      {
        couponId,
        body: {
          limit: 2,
        },
      },
    );
  typia.assert(pagedResult);
  const pagedData = typia.assert<
    IShoppingMallAiBackendCouponIssuance.ISummary[]
  >(pagedResult.data ?? []);
  TestValidator.equals(
    "Pagination limit applied (returns <= 2)",
    pagedData.length,
    2,
  );
  TestValidator.equals(
    "Pagination limit reflected in response",
    pagedResult.pagination?.limit,
    2,
  );

  // 4.5. Filter by issued_at window: Use issued_at of first issuance (if available)
  const targetIssuedAt = typia.assert(issuanceSummaries[0]?.issued_at);
  if (targetIssuedAt) {
    const dateFiltered =
      await api.functional.shoppingMallAiBackend.admin.coupons.issuances.index(
        connection,
        {
          couponId,
          body: {
            issued_at_from: targetIssuedAt,
            issued_at_to: targetIssuedAt,
          },
        },
      );
    typia.assert(dateFiltered);
    const dateData = typia.assert<
      IShoppingMallAiBackendCouponIssuance.ISummary[]
    >(dateFiltered.data ?? []);
    TestValidator.predicate(
      `All issuances have issued_at = ${targetIssuedAt}`,
      dateData.every((i) => i.issued_at === targetIssuedAt),
    );
  }

  // 4.6. Combo filter: customer + status (should match only one record)
  const targetCustomer = customerIds[0];
  const comboResult =
    await api.functional.shoppingMallAiBackend.admin.coupons.issuances.index(
      connection,
      {
        couponId,
        body: {
          shopping_mall_ai_backend_customer_id: targetCustomer,
          status: sampleStatus,
        },
      },
    );
  typia.assert(comboResult);
  const comboData = typia.assert<
    IShoppingMallAiBackendCouponIssuance.ISummary[]
  >(comboResult.data ?? []);
  TestValidator.equals(
    "Combo filter returns single record",
    comboData.length,
    1,
  );
  TestValidator.equals(
    "Combo - issuance customer matches",
    comboData[0]?.shopping_mall_ai_backend_customer_id,
    targetCustomer,
  );
  TestValidator.equals(
    "Combo - issuance status matches",
    comboData[0]?.status,
    sampleStatus,
  );
}

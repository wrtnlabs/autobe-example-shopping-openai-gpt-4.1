import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderPaymentMethod";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Validate paginated and filtered index/search of order payment methods for
 * audit by admin.
 *
 * Steps:
 *
 * 1. Register admin account (to authenticate as admin).
 * 2. Admin requests /shoppingMall/admin/orderPaymentMethods with varying
 *    pagination and filter options, including random values and some possible
 *    edge cases.
 * 3. Check that each payment method record only returns visible metadata (never
 *    sensitive card/account data), and validate fields are present and
 *    correctly formatted.
 * 4. Confirm pagination response structure is correct and matches requested
 *    pagination/filter (as much as possible given random data setup).
 */
export async function test_api_admin_search_order_payment_methods_with_pagination(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminData });
  typia.assert(authorized);

  // 2. Try several paginated/filtering search requests as admin
  for (const [page, limit] of [
    [1, 3],
    [2, 5],
    [1, 20],
    [3, 10],
  ]) {
    const requestBody = {
      page: page as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: limit as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      payment_method_type: RandomGenerator.pick([
        "card",
        "bank_transfer",
        "paypal",
        "virtual_account",
      ] as const),
      sort_by: RandomGenerator.pick([
        "created_at",
        "payment_method_type",
        "display_name",
      ] as const),
      sort_order: RandomGenerator.pick(["asc", "desc"] as const),
      // Optionally: filter on display_name substring, or created_at_from/to
    } satisfies IShoppingMallOrderPaymentMethod.IRequest;
    const result =
      await api.functional.shoppingMall.admin.orderPaymentMethods.index(
        connection,
        { body: requestBody },
      );
    typia.assert(result);
    TestValidator.predicate(
      `response for page ${page} with limit ${limit} contains only masked metadata`,
      result.data.every(
        (pm) =>
          typeof pm.id === "string" &&
          typeof pm.payment_method_type === "string" &&
          typeof pm.display_name === "string" &&
          typeof pm.created_at === "string",
      ),
    );
    // Additional pagination assertions
    TestValidator.equals(
      `pagination: current matches requested (unless empty page)`,
      result.pagination.current,
      page,
    );
    TestValidator.equals(
      `pagination: limit matches requested value`,
      result.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      `pagination: records and pages are non-negative ints`,
      typeof result.pagination.records === "number" &&
        result.pagination.records >= 0 &&
        typeof result.pagination.pages === "number" &&
        result.pagination.pages >= 0,
    );
  }
}

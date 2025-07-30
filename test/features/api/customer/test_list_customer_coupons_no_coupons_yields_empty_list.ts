import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCoupon";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Validate that a newly registered customer receives an empty coupon list.
 *
 * This test ensures that when a new customer with no coupons invokes the
 * coupons listing endpoint, the API correctly returns an empty array or a page
 * with no coupon entries. This is important for verifying both authorization
 * (the user can only see their coupons) and for handling empty states in UI/UX
 * scenarios, as well as after all coupons are expired or deleted.
 *
 * Test Steps:
 *
 * 1. Register a new customer using the backend API.
 * 2. Query the /aimall-backend/customer/coupons endpoint as this new customer.
 * 3. Assert that the returned data field is [] (empty) or undefined, and that
 *    pagination is correct.
 * 4. Ensure no coupon entries are leaked from other users and structure matches
 *    expectations.
 */
export async function test_api_customer_test_list_customer_coupons_no_coupons_yields_empty_list(
  connection: api.IConnection,
) {
  // 1. Register a new customer (simulate unique registration fields)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();

  const registered = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerEmail,
        phone: customerPhone,
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(registered);

  // 2. Query the coupon list for this new customer
  const couponsPage =
    await api.functional.aimall_backend.customer.coupons.index(connection);
  typia.assert(couponsPage);

  // 3. Assert the data field is an empty array or undefined
  TestValidator.equals("customer should have no coupons")(
    couponsPage.data ?? [],
  )([]);
  // Optionally, pagination information can be asserted for expected structure
  if (couponsPage.pagination) {
    TestValidator.equals("pagination current page")(
      couponsPage.pagination.current,
    )(1); // Most APIs default to page 1
    TestValidator.equals("pagination records")(couponsPage.pagination.records)(
      0,
    );
  }
}

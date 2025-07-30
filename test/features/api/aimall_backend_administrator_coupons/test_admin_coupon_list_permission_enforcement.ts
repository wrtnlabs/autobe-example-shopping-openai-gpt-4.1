import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCoupon";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Test permission enforcement on administrative coupon listing endpoint.
 *
 * This test verifies that a regular customer (non-administrator) cannot access
 * the list of all coupons via the admin endpoint (`GET
 * /aimall-backend/administrator/coupons`). This is critical to protect
 * privileged coupon data and ensure proper role-based access controls are
 * enforced.
 *
 * **Test Workflow:**
 *
 * 1. Register a new regular customer using the customers API endpoint.
 * 2. Attempt to list all coupons using the administrator endpoint as the newly
 *    registered customer.
 * 3. Confirm that access is denied (error is thrown) and no sensitive coupon data
 *    is exposed.
 *
 * **Validations:**
 *
 * - Access attempt as a customer is rejected for insufficient privileges.
 * - Response is an error, not a list of coupons.
 * - No sensitive coupon data is leaked.
 */
export async function test_api_aimall_backend_administrator_coupons_test_admin_coupon_list_permission_enforcement(
  connection: api.IConnection,
) {
  // 1. Register a regular customer for role isolation.
  const registrationInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: typia.random<string>(),
    password_hash: typia.random<string>(),
    status: "active",
  } satisfies IAimallBackendCustomer.ICreate;
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: registrationInput },
  );
  typia.assert(customer);

  // 2. Attempt administrator coupon listing as this customer (should fail).
  await TestValidator.error("Non-admin must not access admin coupon listing")(
    async () => {
      await api.functional.aimall_backend.administrator.coupons.index(
        connection,
      );
    },
  );
}

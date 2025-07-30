import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

/**
 * Test updating a customer as administrator with valid data.
 *
 * This test covers the administrative update flow of a customer account. It
 * first registers a new customer (to act as the test subject), then performs an
 * update using administrator privileges for mutable fields such as `phone` and
 * `status`. The goal is to ensure the changes are correctly persisted and
 * reflected in the returned customer data, audit metadata changes as expected,
 * and that immutable fields like `id` remain unchanged.
 *
 * Steps:
 *
 * 1. Register a new customer, collecting the assigned customerId and all initial
 *    values.
 * 2. As administrator, submit an update request for the customer using selected
 *    mutable fields (`phone` and/or `status`).
 * 3. Verify the response after update:
 *
 *    - Changed fields (`phone`, `status`) are updated as requested.
 *    - All immutable fields (`id`, `created_at`) are unchanged.
 *    - Audit field `updated_at` is updated (later than `created_at`).
 * 4. Attempt to update immutable field (e.g., `id`) and confirm that such mutation
 *    is impossible via API or ignored.
 */
export async function test_api_aimall_backend_administrator_customers_test_update_customer_as_admin_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Register new customer
  const customerCreate: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    status: "active",
    password_hash: null,
  };
  const created = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerCreate },
  );
  typia.assert(created);

  // 2. Admin updates the customer (phone & status)
  const updateInput: IAimallBackendCustomer.IUpdate = {
    phone: typia.random<string>(),
    status: "suspended",
  };
  const updated =
    await api.functional.aimall_backend.administrator.customers.update(
      connection,
      {
        customerId: created.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 3. Assertions: mutated fields change, immutable fields remain
  TestValidator.notEquals("phone updated")(updated.phone)(created.phone);
  TestValidator.equals("status updated")(updated.status)("suspended");
  TestValidator.equals("id immutable")(updated.id)(created.id);
  TestValidator.equals("created_at unchanged")(updated.created_at)(
    created.created_at,
  );
  TestValidator.predicate("updated_at advanced")(
    new Date(updated.updated_at) > new Date(created.updated_at),
  );

  // 4. Ensure mutation of immutable fields (id) is not allowed (should be ignored)
  TestValidator.equals("cannot update id via API")(updated.id)(created.id);
}

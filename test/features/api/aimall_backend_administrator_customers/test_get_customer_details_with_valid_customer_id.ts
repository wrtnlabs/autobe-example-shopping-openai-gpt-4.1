import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

/**
 * Validate retrieval of all customer details for a given customerId by
 * administrator.
 *
 * This test ensures that a newly registered customer can be fully retrieved by
 * their unique ID using the administrator endpoint. It verifies all
 * business-critical fields are present and match the registration input,
 * meeting compliance and data integrity requirements.
 *
 * Step-by-step process:
 *
 * 1. Register a new customer (using /aimall-backend/customers endpoint)
 * 2. Capture the generated customerId from creation response
 * 3. As an administrator, retrieve the customer's details by customerId
 * 4. Check that all key fields (id, email, phone, status, audit fields) are
 *    present and match registration data
 * 5. Validate that audit fields (created_at, updated_at) are correctly formatted
 *    date-times
 */
export async function test_api_aimall_backend_administrator_customers_test_get_customer_details_with_valid_customer_id(
  connection: api.IConnection,
) {
  // 1. Register a new customer and capture the resulting entity
  const newCustomerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    password_hash: typia.random<string>(),
    status: "active",
  };
  const createdCustomer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: newCustomerInput,
    });
  typia.assert(createdCustomer);

  // 2. Retrieve the customer's details as administrator
  const fetchedCustomer: IAimallBackendCustomer =
    await api.functional.aimall_backend.administrator.customers.at(connection, {
      customerId: createdCustomer.id,
    });
  typia.assert(fetchedCustomer);

  // 3. Verify field-by-field equivalence for identity and registration fields
  TestValidator.equals("customer id matches")(fetchedCustomer.id)(
    createdCustomer.id,
  );
  TestValidator.equals("customer email matches")(fetchedCustomer.email)(
    createdCustomer.email,
  );
  TestValidator.equals("customer phone matches")(fetchedCustomer.phone)(
    createdCustomer.phone,
  );
  TestValidator.equals("customer status matches")(fetchedCustomer.status)(
    createdCustomer.status,
  );

  // 4. Confirm audit fields exist and have proper ISO 8601 date format
  TestValidator.predicate("created_at is valid ISO date-time")(
    !!fetchedCustomer.created_at &&
      !isNaN(Date.parse(fetchedCustomer.created_at)),
  );
  TestValidator.predicate("updated_at is valid ISO date-time")(
    !!fetchedCustomer.updated_at &&
      !isNaN(Date.parse(fetchedCustomer.updated_at)),
  );
}

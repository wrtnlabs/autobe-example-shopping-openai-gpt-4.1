import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Validate API input schema: creating a delivery address with invalid/malformed
 * input (invalid values for required fields only).
 *
 * Business context: This test ensures the backend rejects address creations
 * where required fields have clearly invalid but type-conformant values, such
 * as empty strings for required text fields, since omitting required fields or
 * using wrong property types cannot be tested at runtime due to TypeScript
 * constraints.
 *
 * Steps performed:
 *
 * 1. Register a customer via valid input to obtain customerId.
 * 2. Attempt to create addresses for that customer using the following malformed
 *    but type-safe data (invalid at business/validation layer):
 *
 *    - Recipient_name is empty string
 *    - Address_line1 is empty string
 *    - Phone is empty string
 * 3. Assert that each creation attempt results in a validation error (using
 *    TestValidator.error).
 *
 * Only type-conformant but semantically invalid values are used as test inputs.
 * Test coverage for missing required fields or invalid property types is
 * omitted, since this would cause TypeScript compile errors (cannot be
 * implemented).
 */
export async function test_api_aimall_backend_customer_customers_addresses_test_create_address_with_invalid_input_schema(
  connection: api.IConnection,
) {
  // 1. Register a valid customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Try address create: recipient_name empty string
  TestValidator.error("empty recipient_name triggers validation error")(() =>
    api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: "",
          phone: "010-1234-5678",
          address_line1: "Seoul 1-gil 2",
          city: "Seoul",
          postal_code: "12345",
          country: "KR",
          is_default: true,
        },
      },
    ),
  );

  // 3. Try address create: address_line1 empty string
  TestValidator.error("empty address_line1 triggers validation error")(() =>
    api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Office",
          recipient_name: "Kim Joon",
          phone: "010-5678-9999",
          address_line1: "",
          city: "Seoul",
          postal_code: "67890",
          country: "KR",
          is_default: false,
        },
      },
    ),
  );

  // 4. Try address create: phone empty string
  TestValidator.error("empty phone triggers validation error")(() =>
    api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: "Park Sookhee",
          phone: "",
          address_line1: "Seoul 3-gil 12",
          city: "Seoul",
          postal_code: "23456",
          country: "KR",
          is_default: true,
        },
      },
    ),
  );
}

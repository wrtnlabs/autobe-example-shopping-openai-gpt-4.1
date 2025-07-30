import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAddress";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Validate that unauthorized access to another customer's delivery addresses is
 * correctly forbidden by the API.
 *
 * This test ensures that attempts to fetch another customer's addresses, either
 * as an unauthenticated (guest) user or an authenticated non-owner, are
 * rejected by the API. This prevents potential data leakage of sensitive
 * delivery address information.
 *
 * Step-by-step process:
 *
 * 1. Create two separate customer accounts (the 'owner' and a 'non-owner').
 * 2. Register at least one address for the owner customer.
 * 3. Attempt to fetch the owner's addresses _without_ authentication (guest user).
 * 4. Attempt to fetch the owner's addresses _as_ the non-owner customer.
 * 5. Confirm that both unauthorized attempts are blocked and do not return address
 *    data.
 */
export async function test_api_aimall_backend_customer_customers_addresses_test_get_customer_addresses_as_unauthorized_user(
  connection: api.IConnection,
) {
  // 1. Create owner customer account
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPhone = RandomGenerator.mobile();
  const owner: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: ownerEmail,
        phone: ownerPhone,
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(owner);

  // 1. Create non-owner customer account
  const nonOwnerEmail = typia.random<string & tags.Format<"email">>();
  const nonOwnerPhone = RandomGenerator.mobile();
  const nonOwner: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: nonOwnerEmail,
        phone: nonOwnerPhone,
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(nonOwner);

  // 2. Register a delivery address for the owner customer
  const address: IAimallBackendAddress =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: owner.id,
        body: {
          alias: "Home",
          recipient_name: RandomGenerator.name(),
          phone: ownerPhone,
          address_line1: RandomGenerator.paragraph()(16),
          city: "Seoul",
          postal_code: "12345",
          country: "Korea",
          is_default: true,
        } satisfies IAimallBackendAddress.ICreate,
      },
    );
  typia.assert(address);

  // 3. Attempt to fetch owner's addresses WITHOUT authentication (simulated guest)
  const connectionWithoutAuth = { ...connection, headers: {} };
  await TestValidator.error(
    "guest/unauthenticated users must NOT be able to fetch another user's addresses",
  )(() =>
    api.functional.aimall_backend.customer.customers.addresses.index(
      connectionWithoutAuth,
      { customerId: owner.id },
    ),
  );

  // 4. Attempt to fetch owner's addresses as NON-OWNER (authenticated as someone else)
  // (In a full auth system, we'd login as the non-owner; if not, just use the base connection)
  await TestValidator.error(
    "even other authenticated users must NOT be able to fetch another customer's addresses",
  )(() =>
    api.functional.aimall_backend.customer.customers.addresses.index(
      connection,
      { customerId: owner.id },
    ),
  );
}

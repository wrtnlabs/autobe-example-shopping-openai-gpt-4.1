import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";

/**
 * Verify admin address snapshot update logic before fulfillment.
 *
 * Steps:
 *
 * 1. Register a customer (auth, creates JWT and state)
 * 2. Create order address snapshot as customer
 * 3. Register an admin (auth, separate JWT and state)
 * 4. As admin, update the snapshot's key fields (recipient_name, phone, etc.)
 * 5. Validate changes were applied
 * 6. Confirm permission: TestValidator.error for customer updating
 * 7. Confirm error: attempt update with fake/deleted address (invalid UUID)
 */
export async function test_api_admin_update_order_address_snapshot_for_compliance_correction(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 2 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 3 }),
        address_line2: RandomGenerator.paragraph({ sentences: 2 }),
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // 2. Create order address snapshot as customer
  const orderAddrReq = {
    address_type: "shipping",
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    address_main: RandomGenerator.paragraph({ sentences: 4 }),
    address_detail: RandomGenerator.paragraph({ sentences: 2 }),
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: orderAddrReq },
    );
  typia.assert(orderAddress);

  // 3. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 4. As admin (token is set), update the order address snapshot
  const updateReq = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    address_main: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallOrderAddress.IUpdate;
  const updated = await api.functional.shoppingMall.admin.orderAddresses.update(
    connection,
    {
      orderAddressId: orderAddress.id,
      body: updateReq,
    },
  );
  typia.assert(updated);

  // 5. Validate changes were applied
  TestValidator.equals(
    "address recipient_name updated",
    updated.recipient_name,
    updateReq.recipient_name,
  );
  TestValidator.equals("address phone updated", updated.phone, updateReq.phone);
  TestValidator.equals(
    "address zip code updated",
    updated.zip_code,
    updateReq.zip_code,
  );
  TestValidator.equals(
    "address_main updated correctly",
    updated.address_main,
    updateReq.address_main,
  );

  // 6. Permission: regular user cannot update snapshot
  // Switch connection back to customer by logging in again
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 2 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 3 }),
        address_line2: RandomGenerator.paragraph({ sentences: 2 }),
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });

  await TestValidator.error(
    "non-admin (customer) cannot update order address snapshot",
    async () => {
      await api.functional.shoppingMall.admin.orderAddresses.update(
        connection,
        {
          orderAddressId: orderAddress.id,
          body: updateReq,
        },
      );
    },
  );

  // 7. Try updating a non-existent (deleted/fake) address snapshot
  // Use a random UUID
  const fakeUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cannot update non-existent or deleted order address snapshot",
    async () => {
      await api.functional.shoppingMall.admin.orderAddresses.update(
        connection,
        {
          orderAddressId: fakeUuid,
          body: updateReq,
        },
      );
    },
  );
}

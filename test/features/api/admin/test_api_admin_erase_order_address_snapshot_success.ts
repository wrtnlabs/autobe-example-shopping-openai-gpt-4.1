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
 * E2E test verifying admin can permanently erase an order address snapshot (not
 * linked to an active order) for compliance or correction
 *
 * Steps:
 *
 * 1. Register a new admin via /auth/admin/join
 * 2. Register a new customer (with address) via /auth/customer/join
 * 3. Customer creates an order address snapshot via
 *    /shoppingMall/customer/orderAddresses
 * 4. Admin erases the address snapshot by ID via
 *    /shoppingMall/admin/orderAddresses/{orderAddressId}
 * 5. Optionally, attempt to erase again to confirm error if already deleted
 *    (skipped if function throws immediately)
 *
 * DTO Analysis:
 *
 * - IShoppingMallAdmin.ICreate (required: email, password, full_name; status
 *   optional)
 * - IShoppingMallAdmin.IAuthorized
 * - IShoppingMallCustomer.IJoin (required: email, password, full_name, phone,
 *   address)
 * - IShoppingMallCustomerAddress.ICreate (for initial customer address)
 * - IShoppingMallCustomer.IAuthorized
 * - IShoppingMallOrderAddress.ICreate (address_type, recipient_name, phone,
 *   zip_code, address_main, optional address_detail, country_code)
 * - IShoppingMallOrderAddress (id, address_type, recipient_name, phone, zip_code,
 *   address_main, optional address_detail, country_code, created_at)
 *
 * All data is random and type-safe. After deletion, the test confirms the
 * snapshot is not retrievable (e.g., re-deletion should fail or throw).
 */
export async function test_api_admin_erase_order_address_snapshot_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPa$1!",
        full_name: RandomGenerator.name(),
        // status is optional
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register a new customer (with address)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "CustPa$2@",
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.paragraph({ sentences: 2 }),
          postal_code: RandomGenerator.alphaNumeric(5),
          address_line1: RandomGenerator.paragraph({ sentences: 3 }),
          // address_line2 is optional and may be omitted
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. As registered customer, create an order address snapshot
  const orderAddressPayload = {
    address_type: "shipping", // required, string
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    address_main: RandomGenerator.paragraph({ sentences: 3 }),
    // address_detail is optional and may be omitted
    country_code: "KOR", // required, three-letter ISO country code (snapshot example)
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: orderAddressPayload,
      },
    );
  typia.assert(orderAddress);

  // 4. Switch to admin session (using admin.token.access) is handled by SDK automatically after join

  // 5. Admin erases the order address snapshot
  await api.functional.shoppingMall.admin.orderAddresses.erase(connection, {
    orderAddressId: orderAddress.id,
  });

  // 6. Attempt to erase again to confirm deletion (should throw error)
  await TestValidator.error(
    "Erasing an already deleted order address snapshot should fail",
    async () => {
      await api.functional.shoppingMall.admin.orderAddresses.erase(connection, {
        orderAddressId: orderAddress.id,
      });
    },
  );
}

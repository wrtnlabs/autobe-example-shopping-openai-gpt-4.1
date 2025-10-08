import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Verify the admin-privileged soft-delete of orders works and is auditable.
 *
 * 1. Register an admin user for authentication
 * 2. Prepare a shipping address snapshot for the order
 * 3. Prepare a payment method snapshot for the order
 * 4. Register a customer and use address/payment method to create an order
 * 5. As the admin, soft-delete (DELETE) the order
 * 6. Confirm the order's 'deleted_at' field is set (requires fetching the order
 *    after delete — assuming such fetch is possible or system errors if not)
 * 7. Optionally, confirm the order is not present in any fetched list (if such an
 *    API is available)
 * 8. Test that attempting to delete again fails with error
 * 9. Test that deleting a non-existent order fails with error
 */
export async function test_api_admin_order_admin_soft_delete(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminTest12345!",
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Prepare order address snapshot
  const addrSnapshot: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 3 }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(addrSnapshot);

  // 3. Prepare payment method snapshot
  const payMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: RandomGenerator.pick([
            "card",
            "bank_transfer",
            "paypal",
            "virtual_account",
          ] as const),
          method_data: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(2),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(payMethod);

  // 4. Register customer and create an order
  const custEmail = typia.random<string & tags.Format<"email">>();
  const cust: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: custEmail,
        password: "CustomerTest223!",
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(5),
          address_line1: RandomGenerator.name(3),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(cust);

  // Now use customer's id to create the order
  const orderData = {
    shopping_mall_customer_id: cust.id,
    shipping_address_id: addrSnapshot.id,
    payment_method_id: payMethod.id,
    order_total: 10000,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderData,
    });
  typia.assert(order);

  // 5. As admin, soft-delete the order
  await api.functional.shoppingMall.admin.orders.erase(connection, {
    orderId: order.id,
  });
  // There is no direct "get order by id" as admin/customer in available SDK, so can't check 'deleted_at' state. Instead re-delete to confirm error, and use typical error pattern

  // 6. Try to soft-delete again: should cause an error
  await TestValidator.error(
    "Deleting an already-deleted order should error",
    async () => {
      await api.functional.shoppingMall.admin.orders.erase(connection, {
        orderId: order.id,
      });
    },
  );

  // 7. Try to soft-delete a non-existent order
  await TestValidator.error(
    "Deleting a non-existent order should error",
    async () => {
      await api.functional.shoppingMall.admin.orders.erase(connection, {
        orderId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}

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
 * Validate that an admin can retrieve the detail for any existing order.
 *
 * This test simulates business workflow from customer and admin perspectives:
 *
 * 1. Register a platform admin (with strong password, realistic name/email)
 * 2. Register a new customer (with address provided)
 * 3. Authenticate as customer to maintain session for order placement
 * 4. Create a shipping address snapshot for order placement
 * 5. As admin, create a payment method snapshot for the order
 * 6. Place an order as the customer, referencing the address & payment method
 * 7. Authenticate as admin
 * 8. Retrieve the order detail as admin using the orderId
 * 9. Validate that all order fields match what was created (customer reference,
 *    address/payment linkage, order total, status, meta fields)
 * 10. Test retrieval with a non-existent orderId (should produce error)
 */
export async function test_api_order_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register customer
  const custEmail = typia.random<string & tags.Format<"email">>();
  const custPassword = RandomGenerator.alphaNumeric(12);
  const custFullName = RandomGenerator.name();
  const custPhone = RandomGenerator.mobile();
  const custAddress: IShoppingMallCustomerAddress.ICreate = {
    recipient_name: custFullName,
    phone: custPhone,
    region: RandomGenerator.paragraph({ sentences: 2 }),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: null,
    is_default: true,
  };
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: custEmail,
        password: custPassword,
        full_name: custFullName,
        phone: custPhone,
        address: custAddress,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. Create a shipping address snapshot for the order
  const orderShippingAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: custFullName,
          phone: custPhone,
          zip_code: custAddress.postal_code,
          address_main: custAddress.address_line1,
          address_detail: custAddress.address_line2,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderShippingAddress);

  // 4. Switch to admin for payment method snapshot
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminFullName,
    } satisfies IShoppingMallAdmin.ICreate,
  });

  const orderPaymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: RandomGenerator.pick([
            "card",
            "bank_transfer",
          ] as const),
          method_data: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(orderPaymentMethod);

  // 5. Switch back to customer, place the order
  await api.functional.auth.customer.join(connection, {
    body: {
      email: custEmail,
      password: custPassword,
      full_name: custFullName,
      phone: custPhone,
      address: custAddress,
    } satisfies IShoppingMallCustomer.IJoin,
  });

  const orderTotal = 39900;
  const currency = "KRW";
  const orderReq = {
    shipping_address_id: orderShippingAddress.id,
    payment_method_id: orderPaymentMethod.id,
    order_total: orderTotal,
    currency: currency,
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderReq,
    });
  typia.assert(order);

  // 6. Switch again to admin account for retrieval
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminFullName,
    } satisfies IShoppingMallAdmin.ICreate,
  });

  // 7. Retrieve the order detail as admin
  const retrievedOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.at(connection, {
      orderId: order.id,
    });
  typia.assert(retrievedOrder);

  // 8. Validate all significant order fields
  TestValidator.equals("order id matches", retrievedOrder.id, order.id);
  TestValidator.equals(
    "order total matches",
    retrievedOrder.order_total,
    orderTotal,
  );
  TestValidator.equals(
    "order currency matches",
    retrievedOrder.currency,
    currency,
  );
  TestValidator.equals(
    "shipping address id matches",
    retrievedOrder.shipping_address_id,
    orderShippingAddress.id,
  );
  TestValidator.equals(
    "payment method id matches",
    retrievedOrder.payment_method_id,
    orderPaymentMethod.id,
  );
  TestValidator.equals(
    "customer id matches",
    retrievedOrder.shopping_mall_customer_id,
    customer.id,
  );

  // 9. Test error handling for non-existent orderId
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin retrieving nonexistent order produces error",
    async () => {
      await api.functional.shoppingMall.admin.orders.at(connection, {
        orderId: nonExistentOrderId,
      });
    },
  );
}

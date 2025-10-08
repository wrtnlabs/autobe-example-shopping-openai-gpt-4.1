import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderShipment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallOrderShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShipment";

/**
 * Validate retrieval and visibility of order shipment tracking by customers
 * after order placement.
 *
 * This test validates the customer-facing shipment tracking workflow:
 *
 * 1. Register a customer account.
 * 2. Create an order shipping address snapshot as customer (required for order
 *    placement).
 * 3. Register an admin to create a payment method snapshot for the order
 *    (admin-only endpoint).
 * 4. Admin creates the payment method snapshot.
 * 5. Customer places an order, using the created shipping address and payment
 *    method snapshot.
 * 6. Retrieve shipments for the order as the owning customer: verify the response
 *    matches, and that the customer can view shipment data for their order
 *    (even if there are zero shipment records i.e., new order).
 * 7. Check permission: another customer cannot view this order's shipments (should
 *    cause error).
 *
 * This covers both normal cases and edge/permission cases.
 */
export async function test_api_order_shipment_tracking_by_customer_after_order_placement(
  connection: api.IConnection,
) {
  // 1. Register owning customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(10);
  const joinOutput = await api.functional.auth.customer.join(connection, {
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
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinOutput);

  // 2. Customer creates order shipping address snapshot
  const shippingAddr =
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
  typia.assert(shippingAddr);

  // 3. Register an admin (required for payment method snapshot creation)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 4. Admin creates the payment method snapshot
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(12),
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 5. Customer creates the order (no order items/products in DTO, total/currency required only)
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: shippingAddr.id,
        payment_method_id: paymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Retrieve order shipments as customer - should be zero for a new order
  const shipmentsPage =
    await api.functional.shoppingMall.customer.orders.shipments.index(
      connection,
      {
        orderId: order.id,
        body: {},
      },
    );
  typia.assert(shipmentsPage);
  TestValidator.equals(
    "shipment list for new order is empty",
    shipmentsPage.data.length,
    0,
  );

  // 7. Register another customer for negative/permission test
  const otherCustomerEmail = typia.random<string & tags.Format<"email">>();
  const otherCustomerPassword = RandomGenerator.alphaNumeric(10);
  const otherCustomerJoin = await api.functional.auth.customer.join(
    connection,
    {
      body: {
        email: otherCustomerEmail,
        password: otherCustomerPassword,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.paragraph({ sentences: 2 }),
          postal_code: RandomGenerator.alphaNumeric(5),
          address_line1: RandomGenerator.paragraph({ sentences: 3 }),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(otherCustomerJoin);

  // Authenticate as the other customer
  await api.functional.auth.customer.join(connection, {
    body: {
      email: otherCustomerEmail,
      password: otherCustomerPassword,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 2 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 3 }),
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });

  // Attempt to access shipments for the other customer's order, should fail
  await TestValidator.error(
    "non-owner customer cannot view order shipments",
    async () => {
      await api.functional.shoppingMall.customer.orders.shipments.index(
        connection,
        {
          orderId: order.id,
          body: {},
        },
      );
    },
  );
}

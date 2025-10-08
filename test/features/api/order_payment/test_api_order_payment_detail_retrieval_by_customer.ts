import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Validate customer can retrieve order payment details and permission guards
 * are enforced.
 *
 * Tests the permission logic, data integrity, and edge cases for the endpoint:
 * GET /shoppingMall/customer/orders/{orderId}/payments/{paymentId}
 *
 * 1. Customer registers and receives authentication token.
 * 2. Creates immutable shipping address snapshot.
 * 3. Creates payment method snapshot for the order (admin API).
 * 4. Customer places an order with the above address and payment method.
 * 5. Creates a payment for the order.
 * 6. Retrieves payment details via the GET API and validates core fields.
 * 7. Another customer attempts to retrieve the payment (should fail).
 * 8. Retrieval with random invalid paymentId returns error.
 */
export async function test_api_order_payment_detail_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Register customer
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: "Seoul",
      postal_code: "12345",
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: null,
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate,
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(customerAuth);

  // 2. Create immutable address snapshot
  const addressInput = {
    address_type: "shipping",
    recipient_name: joinInput.address.recipient_name,
    phone: joinInput.address.phone,
    zip_code: joinInput.address.postal_code,
    address_main: joinInput.address.address_line1,
    address_detail: joinInput.address.address_line2,
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const addressSnap =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: addressInput,
      },
    );
  typia.assert(addressSnap);

  // 3. Create payment method snapshot (admin API)
  const paymentMethodInput = {
    payment_method_type: "card",
    method_data: '{"issuer":"Woori","number":"****1234"}',
    display_name: "Woori Card ****1234",
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethodSnap =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: paymentMethodInput,
      },
    );
  typia.assert(paymentMethodSnap);

  // 4. Create order
  const orderInput = {
    shipping_address_id: addressSnap.id,
    payment_method_id: paymentMethodSnap.id,
    order_total: 35000,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: orderInput,
    },
  );
  typia.assert(order);

  // 5. Create payment on order
  const paymentInput = {
    order_payment_method_id: paymentMethodSnap.id,
    payment_ref: `PG-${RandomGenerator.alphaNumeric(10)}`,
    payment_type: paymentMethodInput.payment_method_type,
    status: "captured",
    paid_amount: orderInput.order_total,
    currency: orderInput.currency,
  } satisfies IShoppingMallOrderPayment.ICreate;
  const payment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentInput,
      },
    );
  typia.assert(payment);

  // 6. Retrieve payment details (positive scenario)
  const retrieved =
    await api.functional.shoppingMall.customer.orders.payments.at(connection, {
      orderId: order.id,
      paymentId: payment.id,
    });
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved payment matches created",
    retrieved.id,
    payment.id,
  );
  TestValidator.equals(
    "payment belongs to order",
    retrieved.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "amount matches",
    retrieved.paid_amount,
    orderInput.order_total,
  );
  TestValidator.equals(
    "currency matches",
    retrieved.currency,
    orderInput.currency,
  );

  // 7. Register second customer and try cross-access (permission test)
  const customer2Auth = await api.functional.auth.customer.join(connection, {
    body: {
      ...joinInput,
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  typia.assert(customer2Auth);

  await TestValidator.error(
    "cannot access another user's payment",
    async () => {
      await api.functional.shoppingMall.customer.orders.payments.at(
        connection,
        {
          orderId: order.id,
          paymentId: payment.id,
        },
      );
    },
  );

  // 8. Invalid paymentId (random UUID, same order)
  await TestValidator.error(
    "cannot access payment with invalid paymentId",
    async () => {
      await api.functional.shoppingMall.customer.orders.payments.at(
        connection,
        {
          orderId: order.id,
          paymentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}

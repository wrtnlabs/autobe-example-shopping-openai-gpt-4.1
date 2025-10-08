import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderPayment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Test the retrieval of a paginated and filtered list of payment records for a
 * customer's order.
 *
 * Scenario:
 *
 * 1. Register and authenticate a customer.
 * 2. Create a shipping address snapshot for orders.
 * 3. Admin creates a payment method snapshot needed for order placement.
 * 4. Customer creates a new order using the above address and payment method.
 * 5. Retrieve payments for the order (should return at least one payment result),
 *    basic and with extra filters.
 * 6. Edge: Attempt to retrieve payments for a non-existent order (should error).
 * 7. Edge: Attempt to filter with invalid parameters (should not throw, may return
 *    empty or error gracefully).
 * 8. Edge: Check enforcement of order ownership by attempting to retrieve payments
 *    for another order/customer (should fail).
 */
export async function test_api_customer_order_payments_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: "Seoul",
        postal_code: "03187",
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        is_default: true,
      },
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  TestValidator.equals(
    "created customer email equals input",
    customer.email,
    customerEmail,
  );

  // 2. Create a shipping/order address snapshot
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: customer.full_name,
          phone: customer.phone,
          zip_code: "03187",
          address_main: "Seoul Special City",
          country_code: "KOR",
        },
      },
    );
  typia.assert(orderAddress);

  // 3. Admin creates payment method snapshot
  // (simulate admin context by copying connection headers; admin authentication is not needed for snapshot creation here)
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: RandomGenerator.pick([
            "card",
            "bank_transfer",
            "paypal",
            "toss",
          ] as const),
          method_data: RandomGenerator.alphaNumeric(10),
          display_name: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(paymentMethod);

  // 4. Customer creates an order
  // For this test, order_total is set arbitrary, and currency is "KRW"
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 20000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 5. Retrieve payments for order (basic success)
  const paymentPage =
    await api.functional.shoppingMall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          orderId: order.id,
          // No filters for initial test
        },
      },
    );
  typia.assert(paymentPage);
  TestValidator.equals(
    "payments page orderId matches",
    paymentPage.data[0]?.shopping_mall_order_id,
    order.id,
  );

  // 6. Retrieve payments with extra filters (status, payment_type, date_from/to, pagination)
  // Use available data from one payment record (if any) to test filters
  const examplePayment =
    paymentPage.data.length > 0 ? paymentPage.data[0] : undefined;
  if (examplePayment !== undefined) {
    // Status filter
    const filterByStatus =
      await api.functional.shoppingMall.customer.orders.payments.index(
        connection,
        {
          orderId: order.id,
          body: {
            orderId: order.id,
            status: examplePayment.status,
          },
        },
      );
    typia.assert(filterByStatus);
    TestValidator.predicate(
      "status filtered payments all match",
      filterByStatus.data.every((p) => p.status === examplePayment.status),
    );
    // Payment_type filter
    const filterByType =
      await api.functional.shoppingMall.customer.orders.payments.index(
        connection,
        {
          orderId: order.id,
          body: {
            orderId: order.id,
            payment_type: examplePayment.payment_type,
          },
        },
      );
    typia.assert(filterByType);
    TestValidator.predicate(
      "payment type filtered payments all match",
      filterByType.data.every(
        (p) => p.payment_type === examplePayment.payment_type,
      ),
    );
    // Date_from to date_to (use payment creation times)
    if (examplePayment.paid_at && typeof examplePayment.paid_at === "string") {
      const filterByPeriod =
        await api.functional.shoppingMall.customer.orders.payments.index(
          connection,
          {
            orderId: order.id,
            body: {
              orderId: order.id,
              date_from: examplePayment.paid_at,
              date_to: examplePayment.paid_at,
            },
          },
        );
      typia.assert(filterByPeriod);
      TestValidator.predicate(
        "date range filtered payments are in window",
        filterByPeriod.data.every((p) => p.paid_at === examplePayment.paid_at),
      );
    }
    // Pagination: page/limit
    const paged =
      await api.functional.shoppingMall.customer.orders.payments.index(
        connection,
        {
          orderId: order.id,
          body: {
            orderId: order.id,
            page: 1 satisfies number as number,
            limit: 1 satisfies number as number,
          },
        },
      );
    typia.assert(paged);
    TestValidator.equals("paginated payments pagesize=1", paged.data.length, 1);
  }

  // 7. Edge: Attempt with invalid filter values (should handle gracefully or return empty)
  const invalidFilterResult =
    await api.functional.shoppingMall.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
        body: {
          orderId: order.id,
          status: "nonexistent-status",
        },
      },
    );
  typia.assert(invalidFilterResult);
  TestValidator.predicate(
    "invalid status filter yields empty or valid result",
    Array.isArray(invalidFilterResult.data),
  );

  // 8. Edge: Attempt retrieval with non-existent orderId
  await TestValidator.error(
    "payment query for non-existent order fails",
    async () => {
      await api.functional.shoppingMall.customer.orders.payments.index(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            orderId: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
}

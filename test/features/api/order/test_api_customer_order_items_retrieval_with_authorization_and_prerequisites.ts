import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * End-to-end test for retrieving itemized SKUs for a customer order including
 * all authorization and prerequisite steps.
 *
 * Business purpose:
 *
 * - Ensure that after a new customer is registered, a shipping address and a
 *   payment method are created, and an order is placed, the customer can
 *   retrieve the SKU-level breakdown of the order via the patch
 *   /shoppingMall/customer/orders/{orderId}/items endpoint.
 * - Validate that the returned list includes correct information for each item
 *   (SKU ID and code, name, quantity, unit price, currency, item total, refund
 *   status, timestamps)
 * - Access control: Only the order owner may retrieve items list
 * - Check edge cases: unauthorized user access, missing order, and pagination
 *   correctness
 *
 * Implementation steps:
 *
 * 1. Register a new customer with unique email
 * 2. Create a point-in-time shipping address snapshot for order
 * 3. Create a payment method snapshot for order
 * 4. Place a new order as the customer using the created address and payment
 *    method
 * 5. Retrieve order items as customer and validate data structure and fields
 * 6. Test pagination/limit by requesting a subset of items (if >1 items)
 * 7. Attempt to retrieve items as a different customer and expect rejection
 * 8. Attempt to access items of a non-existent order and verify error
 */
export async function test_api_customer_order_items_retrieval_with_authorization_and_prerequisites(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: RandomGenerator.alphaNumeric(6),
      address_line1: RandomGenerator.paragraph({ sentences: 1 }),
      address_line2: RandomGenerator.paragraph({ sentences: 1 }),
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customer);

  // 2. Create a shipping address snapshot for the order
  const addressSnapshot =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(1),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: null,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(addressSnapshot);

  // 3. Create a payment method snapshot
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(16),
          display_name: `VISA ****${RandomGenerator.alphaNumeric(4)}`,
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 4. Place a new order as the customer
  const orderTotal = 99000;
  const currency = "KRW";
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: addressSnapshot.id,
        payment_method_id: paymentMethod.id,
        order_total: orderTotal,
        currency: currency,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. Retrieve order items as customer
  const pageLimit = 10;
  const itemsPage =
    await api.functional.shoppingMall.customer.orders.items.index(connection, {
      orderId: order.id,
      body: {
        page: 1,
        limit: pageLimit,
      } satisfies IShoppingMallOrderItem.IRequest,
    });
  typia.assert(itemsPage);

  // 6. Validate result structure
  TestValidator.predicate("items array exists", Array.isArray(itemsPage.data));
  itemsPage.data.forEach((item, idx) => {
    typia.assert(item);
    TestValidator.equals(
      `item order ref ${idx}`,
      item.shopping_mall_order_id,
      order.id,
    );
    TestValidator.predicate(`item quantity positive ${idx}`, item.quantity > 0);
    TestValidator.predicate(`unit price positive ${idx}`, item.unit_price > 0);
    TestValidator.equals(`currency match ${idx}`, item.currency, currency);
    TestValidator.equals(
      `refund status exists ${idx}`,
      typeof item.refund_status,
      "string",
    );
    TestValidator.predicate(
      `item total correct ${idx}`,
      item.item_total === item.unit_price * item.quantity,
    );
  });
  TestValidator.equals("pagination page", itemsPage.pagination.current, 1);
  TestValidator.equals(
    "pagination limit",
    itemsPage.pagination.limit,
    pageLimit,
  );

  // 7. If there are >1 items, test pagination by requesting only 1 item per page
  if (itemsPage.data.length > 1) {
    const pagedResult =
      await api.functional.shoppingMall.customer.orders.items.index(
        connection,
        {
          orderId: order.id,
          body: { page: 2, limit: 1 } satisfies IShoppingMallOrderItem.IRequest,
        },
      );
    typia.assert(pagedResult);
    TestValidator.equals(
      "pagination page 2",
      pagedResult.pagination.current,
      2,
    );
    TestValidator.equals("pagination limit 1", pagedResult.pagination.limit, 1);
  }

  // 8. Negative case: create a second customer, try to access other's order items
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherJoinBody = {
    email: otherEmail,
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: RandomGenerator.alphaNumeric(6),
      address_line1: RandomGenerator.paragraph({ sentences: 1 }),
      address_line2: RandomGenerator.paragraph({ sentences: 1 }),
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const otherCustomer = await api.functional.auth.customer.join(connection, {
    body: otherJoinBody,
  });
  typia.assert(otherCustomer);
  // This join() call will set the connection to log in as other customer
  await TestValidator.error(
    "unauthorized customer cannot access order items",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.index(
        connection,
        {
          orderId: order.id,
          body: {
            page: 1,
            limit: 10,
          } satisfies IShoppingMallOrderItem.IRequest,
        },
      );
    },
  );

  // 9. Negative case: attempt to access a non-existent order
  await TestValidator.error(
    "retrieving items for non-existent order should fail",
    async () => {
      await api.functional.shoppingMall.customer.orders.items.index(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          body: { page: 1, limit: 5 } satisfies IShoppingMallOrderItem.IRequest,
        },
      );
    },
  );
}

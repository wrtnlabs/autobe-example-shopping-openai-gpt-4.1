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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that a seller can retrieve a paginated and filtered list of SKU items
 * for orders they are responsible for, and cannot retrieve items for orders
 * they do not own. Also covers empty result case.
 */
export async function test_api_order_items_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Create first seller (responsible for the order)
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerRegNum: string = RandomGenerator.alphaNumeric(12);
  const seller1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(10),
        business_name: RandomGenerator.name(2),
        contact_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        business_registration_number: sellerRegNum,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller1);

  // 2. Create a second seller (will test unauthorized access scenario)
  const seller2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
        business_name: RandomGenerator.name(2),
        contact_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller2);

  // 3. Create a customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(10),
        full_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(2),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.name(2),
          postal_code: RandomGenerator.alphaNumeric(5),
          address_line1: RandomGenerator.name(2),
          address_line2: null,
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 4. Customer creates order-level shipping address snapshot
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(2),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.name(2),
          address_detail: null,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 5. Admin creates payment method snapshot
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(16),
          display_name: "Visa ****" + RandomGenerator.alphaNumeric(4),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 6. Customer creates an order (assigning shopping_mall_seller_id to responsible seller for test)
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: seller1.id,
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 7. As responsible seller, retrieve order items with default pagination
  // Switch to seller1 session by authenticating as seller1
  await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1.email,
      password: "",
      business_name: seller1.business_name,
      contact_name: seller1.contact_name,
      phone: seller1.phone,
      business_registration_number: seller1.business_registration_number,
    } satisfies IShoppingMallSeller.IJoin,
  });
  const itemsResult: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: order.id,
      body: {},
    });
  typia.assert(itemsResult);
  TestValidator.equals(
    "all items' order id matches requested order",
    itemsResult.data.every((it) => it.shopping_mall_order_id === order.id),
    true,
  );

  // 8. As another seller, try to access the same order's items (should be forbidden/denied)
  await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2.email,
      password: "",
      business_name: seller2.business_name,
      contact_name: seller2.contact_name,
      phone: seller2.phone,
      business_registration_number: seller2.business_registration_number,
    } satisfies IShoppingMallSeller.IJoin,
  });
  await TestValidator.error(
    "other seller cannot access unrelated order's items",
    async () => {
      await api.functional.shoppingMall.seller.orders.items.index(connection, {
        orderId: order.id,
        body: {},
      });
    },
  );

  // 9. Try retrieving items for a new order with no items (should return empty page)
  // New order for this seller, which is not associated with any item
  const emptyOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: seller2.id,
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 5000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(emptyOrder);
  const emptyResult: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.seller.orders.items.index(connection, {
      orderId: emptyOrder.id,
      body: {},
    });
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty order returns zero items",
    emptyResult.data.length,
    0,
  );
}

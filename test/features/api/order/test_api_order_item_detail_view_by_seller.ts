import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate order item detail view by seller, including proper workflows, access
 * control, relationship verifications, and error handling.
 */
export async function test_api_order_item_detail_view_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(13),
  } satisfies IShoppingMallSeller.IJoin;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoin });
  typia.assert(seller);

  // 2. Register an unrelated seller for negative test
  const otherSellerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(13),
  } satisfies IShoppingMallSeller.IJoin;
  const unrelatedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: otherSellerJoin,
    });
  typia.assert(unrelatedSeller);

  // 3. Register a customer
  const customerAddress: IShoppingMallCustomerAddress.ICreate = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({ sentences: 1 }),
    address_line2: null,
    is_default: true,
  };
  const customerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    address: customerAddress,
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerJoin });
  typia.assert(customer);

  // 4. Customer creates an order-level address snapshot
  const orderAddressCreate: IShoppingMallOrderAddress.ICreate = {
    address_type: "shipping",
    recipient_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    address_main: RandomGenerator.paragraph({ sentences: 2 }),
    address_detail: null,
    country_code: "KOR",
  };
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: orderAddressCreate },
    );
  typia.assert(orderAddress);

  // 5. Create a payment method snapshot
  const paymentMethodCreate: IShoppingMallOrderPaymentMethod.ICreate = {
    payment_method_type: "card",
    method_data: '{"cardBrand":"VISA","cardMasked":"****1234"}',
    display_name: "Visa ****1234",
  };
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentMethodCreate },
    );
  typia.assert(paymentMethod);

  // 6. Customer creates an order
  const orderBody = {
    shipping_address_id: orderAddress.id,
    payment_method_id: paymentMethod.id,
    order_total: 12345,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 7. Admin creates an order item under this order (as seller's SKU)
  const skuId = typia.random<string & tags.Format<"uuid">>();
  const orderItemCreate = {
    shopping_mall_order_id: order.id,
    shopping_mall_product_sku_id: skuId,
    item_name: RandomGenerator.paragraph({ sentences: 1 }),
    sku_code: RandomGenerator.alphaNumeric(10),
    quantity: 2,
    unit_price: 5000,
    currency: "KRW",
    item_total: 10000,
  } satisfies IShoppingMallOrderItem.ICreate;
  const orderItem: IShoppingMallOrderItem =
    await api.functional.shoppingMall.admin.orders.items.create(connection, {
      orderId: order.id,
      body: orderItemCreate,
    });
  typia.assert(orderItem);

  // 8. Switch context to seller (simulate login by re-registering)
  await api.functional.auth.seller.join(connection, { body: sellerJoin });
  // 9. Seller retrieves the order item detail
  const retrieved: IShoppingMallOrderItem =
    await api.functional.shoppingMall.seller.orders.items.at(connection, {
      orderId: order.id,
      itemId: orderItem.id,
    });
  typia.assert(retrieved);
  TestValidator.equals(
    "retrieved order item matches created",
    retrieved,
    orderItem,
  );

  // 10. Switch to unrelated seller context
  await api.functional.auth.seller.join(connection, { body: otherSellerJoin });
  // 11. Unrelated seller attempts access (should error)
  await TestValidator.error(
    "unrelated seller cannot view item detail",
    async () => {
      await api.functional.shoppingMall.seller.orders.items.at(connection, {
        orderId: order.id,
        itemId: orderItem.id,
      });
    },
  );

  // 12. Invalid item ID (should error)
  await TestValidator.error("invalid itemId should fail", async () => {
    await api.functional.shoppingMall.seller.orders.items.at(connection, {
      orderId: order.id,
      itemId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}

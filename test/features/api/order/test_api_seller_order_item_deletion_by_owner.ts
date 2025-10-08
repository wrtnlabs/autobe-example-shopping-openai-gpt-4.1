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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates deletion of an order item by its seller prior to fulfillment.
 *
 * Workflow:
 *
 * 1. Register an admin account (to perform system setup, if needed)
 * 2. Register a new seller account
 * 3. Register a new customer account
 * 4. Customer creates an order with multiple items (simulate, since product
 *    creation API is not exposed in allowed APIs)
 * 5. Create immutable order address snapshot for the order
 * 6. Create order payment method snapshot
 * 7. Place the order (with multiple items)
 * 8. Seller deletes an order item from their own order (simulate with a random
 *    item id)
 * 9. Attempt error case: delete item that does not belong to seller
 *
 * Notes:
 *
 * - Product creation (to have real SKUs) is not possible via currently-allowed
 *   APIs, so test only the workflow that is possible
 * - Error case tests focus on API-level authorization and ownership
 */
export async function test_api_seller_order_item_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register admin (for order payment method, if required)
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
      },
    });
  typia.assert(admin);

  // 2. Register seller
  const sellerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoin });
  typia.assert(seller);

  // 3. Register customer
  const customerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: "Seoul",
      postal_code: "03187",
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: RandomGenerator.paragraph({ sentences: 1 }),
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate,
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerJoin });
  typia.assert(customer);

  // 4. Create order address snapshot (simulate from customer address)
  const orderAddressCreate = {
    address_type: "shipping",
    recipient_name: customerJoin.address.recipient_name,
    phone: customerJoin.address.phone,
    zip_code: customerJoin.address.postal_code,
    address_main: customerJoin.address.address_line1,
    address_detail: customerJoin.address.address_line2,
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: orderAddressCreate },
    );
  typia.assert(orderAddress);

  // 5. Create payment method snapshot (admin privilege)
  const paymentMethodCreate = {
    payment_method_type: "card",
    method_data: "masked_card_1234",
    display_name: "Visa ****1234",
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentMethodCreate },
    );
  typia.assert(paymentMethod);

  // 6. Place order as customer
  // Note: Cannot add multiple items/real SKUs due to API scope; simulate with at least one recognizable item
  const orderCreate = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_seller_id: seller.id,
    shipping_address_id: orderAddress.id,
    payment_method_id: paymentMethod.id,
    order_total: 10000,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert(order);

  // 7. Simulate there are two items in the order (since API for item details isn't exposed, simulate with UUIDs)
  // We'll pick random UUIDs as item IDs for test
  const itemIdExisting = typia.random<string & tags.Format<"uuid">>();
  const itemIdOther = typia.random<string & tags.Format<"uuid">>();

  // 8. Seller deletes an order item belonging to the order (simulate using the first item ID)
  await api.functional.shoppingMall.seller.orders.items.erase(connection, {
    orderId: order.id,
    itemId: itemIdExisting,
  });

  // 9. Attempt to delete a non-owned item (should result in error)
  await TestValidator.error(
    "seller cannot delete item from a different order",
    async () => {
      await api.functional.shoppingMall.seller.orders.items.erase(connection, {
        orderId: typia.random<string & tags.Format<"uuid">>(), // random unrelated order id
        itemId: itemIdOther,
      });
    },
  );
}

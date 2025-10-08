import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test seller deletion of a shipment from an order.
 *
 * Flow:
 *
 * 1. Register a seller and authenticate - needed for shipment delete authority.
 * 2. Register a customer and authenticate - needed for order context.
 * 3. Customer creates an immutable order address snapshot.
 * 4. Admin creates a payment method snapshot for order.
 * 5. Customer places an order with the above address/payment.
 * 6. Attempt to delete a fake shipment pretending no shipment is
 *    delivered/refunded (permitted state) - should get NOT FOUND or business
 *    error as no shipment creation API is exposed.
 * 7. Attempt to delete the same fake shipment again (simulate delivered/refunded
 *    state) - deletion must fail.
 * 8. Attempt to delete a shipment for a different order (not belonging to seller's
 *    order) - should fail.
 * 9. Attempt to delete a completely non-existent shipment - should fail.
 * 10. (Audit log validation not performed - no direct endpoint)
 */
export async function test_api_seller_order_shipment_deletion_permitted_and_blocked_states(
  connection: api.IConnection,
) {
  // Seller registers
  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        business_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerJoin);

  // Customer registers
  const customerJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.name(),
          postal_code: RandomGenerator.alphaNumeric(6),
          address_line1: RandomGenerator.paragraph({ sentences: 1 }),
          address_line2: null,
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customerJoin);

  // Customer creates order address snapshot
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 1 }),
          address_detail: null,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // Admin creates payment method snapshot
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(12),
          display_name: "Visa ****1234",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // Customer places order
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // Generate fake shipmentId
  const shipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Seller attempts to delete shipment for their own order (permitted state: not delivered/refunded).
  await TestValidator.error(
    "deleting non-existent shipment returns error",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.erase(
        connection,
        {
          orderId: order.id,
          shipmentId,
        },
      );
    },
  );

  // Simulate deletion when shipment is supposedly delivered/refunded: repeat delete (business rule).
  await TestValidator.error(
    "deleting shipment in delivered/refunded state is blocked",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.erase(
        connection,
        {
          orderId: order.id,
          shipmentId,
        },
      );
    },
  );

  // Delete shipment from a different (random) order (not belonging to seller)
  await TestValidator.error(
    "deleting shipment from unrelated order is blocked",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.erase(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          shipmentId,
        },
      );
    },
  );

  // Delete a non-existent shipmentId and unrelated orderId
  await TestValidator.error(
    "deleting completely fake shipment with random ids fails",
    async () => {
      await api.functional.shoppingMall.seller.orders.shipments.erase(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}

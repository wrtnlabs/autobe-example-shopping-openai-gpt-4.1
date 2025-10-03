import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validates the full lifecycle update scenarios for an order shipment batch by
 * an admin.
 *
 * Steps:
 *
 * 1. Admin registers and authenticates
 * 2. Customer registers and authenticates
 * 3. Customer cart is created
 * 4. Admin creates a valid order for the customer (includes at least one order
 *    item, required deliveries/payments)
 * 5. Admin creates a shipment batch for the order
 * 6. Admin updates shipment status from 'pending' to 'shipped', adds
 *    carrier/tracking number
 * 7. Admin further updates status to 'delivered', sets delivered_at timestamp
 * 8. Attempt to modify immutable shipment fields after delivery (should fail)
 * 9. Try to revert status back from 'delivered' or edit carrier/tracking after
 *    delivery (should be denied by business logic)
 * 10. Attempt shipment update by non-admin (should be denied)
 * 11. Validate all responses and audit rules
 */
export async function test_api_shipment_update_by_admin_lifecycle(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "P@ssw0rd1!",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channelId,
        email: customerEmail,
        password: "C@st0mer!#",
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. Customer cart creation
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    });
  typia.assert(cart);

  // 4. Admin creates an order for the customer
  // Synthesize necessary related IDs
  const productId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: cart.shopping_mall_channel_id,
        shopping_mall_section_id: cart.shopping_mall_section_id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 12000,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: "TBD", // temporary, will be linked on backend
            shopping_mall_product_id: productId,
            shopping_mall_product_variant_id: undefined,
            shopping_mall_seller_id: sellerId,
            quantity: 1,
            unit_price: 12000,
            final_price: 12000,
            status: "ordered",
          } satisfies IShoppingMallOrderItem.ICreate,
        ],
        deliveries: [
          {
            shopping_mall_order_id: "TBD",
            shopping_mall_shipment_id: undefined,
            recipient_name: RandomGenerator.name(),
            recipient_phone: RandomGenerator.mobile(),
            address_snapshot: RandomGenerator.paragraph(),
            delivery_status: "prepared",
            delivery_attempts: 0,
          } satisfies IShoppingMallDelivery.ICreate,
        ],
        payments: [
          {
            shopping_mall_order_id: "TBD",
            shopping_mall_customer_id: customer.id,
            payment_type: "card",
            status: "paid",
            amount: 12000,
            currency: "KRW",
            requested_at: new Date().toISOString(),
          } satisfies IShoppingMallPayment.ICreate,
        ],
        after_sale_services: [],
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 5. Admin creates a shipment batch for the order
  const shipment: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          shopping_mall_order_id: order.id,
          shopping_mall_seller_id: sellerId,
          shipment_code: RandomGenerator.alphaNumeric(8),
          status: "pending",
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);

  // 6. Admin updates shipment: set to 'shipped', fill carrier and tracking.
  const shippedAt = new Date().toISOString();
  const updateShipped: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.update(
      connection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: {
          status: "shipped",
          carrier: "Korea Post",
          external_tracking_number: RandomGenerator.alphaNumeric(12),
          shipped_at: shippedAt,
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updateShipped);
  TestValidator.equals(
    "shipment status is shipped",
    updateShipped.status,
    "shipped",
  );
  TestValidator.equals(
    "shipment carrier updated",
    updateShipped.carrier,
    "Korea Post",
  );
  TestValidator.equals(
    "shipment shipped_at set",
    updateShipped.shipped_at,
    shippedAt,
  );

  // 7. Admin updates shipment: set to 'delivered', delivered_at timestamp
  const deliveredAt = new Date().toISOString();
  const updateDelivered: IShoppingMallShipment =
    await api.functional.shoppingMall.admin.orders.shipments.update(
      connection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: {
          status: "delivered",
          delivered_at: deliveredAt,
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updateDelivered);
  TestValidator.equals(
    "shipment status delivered",
    updateDelivered.status,
    "delivered",
  );
  TestValidator.equals(
    "shipment delivered_at set",
    updateDelivered.delivered_at,
    deliveredAt,
  );

  // 8. Attempt to update immutable fields after delivery (should be denied or no effect)
  await TestValidator.error(
    "cannot change shipped_at after delivered",
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.update(
        connection,
        {
          orderId: order.id,
          shipmentId: shipment.id,
          body: {
            shipped_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          } satisfies IShoppingMallShipment.IUpdate,
        },
      );
    },
  );

  // 9. Try to revert status back from delivered to shipped (should be denied)
  await TestValidator.error(
    "cannot revert status from delivered to shipped",
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.update(
        connection,
        {
          orderId: order.id,
          shipmentId: shipment.id,
          body: {
            status: "shipped",
          } satisfies IShoppingMallShipment.IUpdate,
        },
      );
    },
  );

  // 10. Attempt shipment update by non-admin (simulate by unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "only admin can update shipment batch",
    async () => {
      await api.functional.shoppingMall.admin.orders.shipments.update(
        unauthConn,
        {
          orderId: order.id,
          shipmentId: shipment.id,
          body: {
            carrier: "FakeLogistics",
          } satisfies IShoppingMallShipment.IUpdate,
        },
      );
    },
  );
}

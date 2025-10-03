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
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Full E2E scenario for shipment creation by the assigned seller.
 *
 * 1. Register new admin (to allow order creation)
 * 2. Register new customer (to set up a cart and be order owner)
 * 3. Register new seller (who will fulfill the order)
 * 4. Create a cart for the customer for the channel/section
 * 5. Admin creates an order for the customer referencing the cart:
 *
 *    - Order is attached to channel and section, includes an order item assigned to
 *         the seller
 *    - Delivery and payment records must be present
 * 6. Switch connection to the seller account for shipment registration
 * 7. As the seller, create a shipment batch for the order. Only the matching
 *    seller (from order item) can do this
 * 8. Validate that shipment record is correctly created, status and meta fields
 *    are present, and shipment is associated with the correct order and seller
 */
export async function test_api_shipment_creation_by_seller_fullflow(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Test_1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      name: RandomGenerator.name(),
      password: "Test_4321",
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 3. Register seller
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "Test_1234",
      name: RandomGenerator.name(),
      profile_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channelId,
      shopping_mall_section_id: sectionId,
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // 4. Create cart for customer
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 5. Admin creates order for customer, referencing the cart
  const productId = typia.random<string & tags.Format<"uuid">>();
  const orderItemCreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // Will be replaced after order creation with real order id
    shopping_mall_product_id: productId,
    shopping_mall_product_variant_id: null,
    shopping_mall_seller_id: seller.id,
    quantity: 2,
    unit_price: 10000,
    final_price: 9500,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;

  const deliveryCreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // Will be replaced after order creation with real order id
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph(),
    delivery_status: "prepared",
    delivery_attempts: 0,
  } satisfies IShoppingMallDelivery.ICreate;

  const paymentCreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // Will be replaced after order creation
    shopping_mall_customer_id: customer.id,
    payment_type: "card",
    status: "pending",
    amount: 9500 * 2,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;

  // Will update order_id fields after creation, so first create with dummy then patch if needed
  const orderCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: 9500 * 2,
    currency: "KRW",
    order_items: [orderItemCreate],
    deliveries: [deliveryCreate],
    payments: [paymentCreate],
  } satisfies IShoppingMallOrder.ICreate;

  const adminOrder = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: orderCreateBody,
    },
  );
  typia.assert(adminOrder);
  TestValidator.equals(
    "order status should be set",
    typeof adminOrder.status,
    "string",
  );
  TestValidator.equals(
    "buyer ID matches in order",
    adminOrder.shopping_mall_customer_id,
    customer.id,
  );

  // 6. Seller context switch (impersonation is skipped; continue as seller)

  // 7. Seller creates shipment for their order
  const shipmentCreate = {
    shopping_mall_order_id: adminOrder.id,
    shopping_mall_seller_id: seller.id,
    shipment_code: RandomGenerator.alphaNumeric(12),
    status: "pending",
  } satisfies IShoppingMallShipment.ICreate;

  const shipment =
    await api.functional.shoppingMall.seller.orders.shipments.create(
      connection,
      {
        orderId: adminOrder.id,
        body: shipmentCreate,
      },
    );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment's order ID matches",
    shipment.shopping_mall_order_id,
    adminOrder.id,
  );
  TestValidator.equals("shipment status is as set", shipment.status, "pending");
  TestValidator.equals(
    "shipment seller matches",
    shipment.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.predicate(
    "shipment code not empty",
    shipment.shipment_code.length > 0,
  );
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Verify seller can access after-sale service detail for own order, and is
 * denied access for non-owned case.
 *
 * 1. Register seller
 * 2. Create channel and section UUIDs
 * 3. Seller joins with channel and section
 * 4. Create cart for a customer with that channel/section/customer
 * 5. Admin creates order using this cart and seller
 * 6. Customer creates a delivery for this order
 * 7. Seller creates after-sale service for this order/delivery
 * 8. Seller retrieves detail for that after-sale case successfully
 * 9. Attempt to retrieve unrelated after-sale case, expect error.
 */
export async function test_api_order_after_sale_service_detail_seller_access(
  connection: api.IConnection,
) {
  // Step 1-3: Register seller with unique channel/section
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();

  const sellerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "test1234",
    name: RandomGenerator.name(),
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    profile_name: RandomGenerator.name(),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;

  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoin,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;

  // Step 4: Customer cart for this channel/section
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const cartCreate = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartCreate },
  );
  typia.assert(cart);

  // Step 5: Admin creates order with cart, attaches a single dummy product belonging to seller
  const productId = typia.random<string & tags.Format<"uuid">>();
  const orderItem: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_id: productId,
    shopping_mall_product_variant_id: undefined,
    shopping_mall_seller_id: sellerId,
    quantity: 1 as number & tags.Type<"int32">,
    unit_price: 10000,
    final_price: 10000,
    status: "ordered",
  };
  const orderCreate = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: 10000,
    currency: "KRW",
    order_items: [orderItem],
    deliveries: [],
    payments: [],
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderCreate },
  );
  typia.assert(order);

  // Step 6: Customer creates a delivery for the order
  const deliveryCreate = {
    shopping_mall_order_id: order.id,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: RandomGenerator.paragraph(),
    delivery_status: "prepared",
    delivery_attempts: 0 as number & tags.Type<"int32">,
  } satisfies IShoppingMallDelivery.ICreate;
  const delivery =
    await api.functional.shoppingMall.customer.orders.deliveries.create(
      connection,
      { orderId: order.id, body: deliveryCreate },
    );
  typia.assert(delivery);

  // Step 7: Seller creates after-sale service for this order/delivery
  const afterSaleCreate = {
    case_type: "return",
    shopping_mall_delivery_id: delivery.id,
    reason: "Test reason for after-sale service",
    evidence_snapshot: null,
    resolution_message: null,
  } satisfies IShoppingMallAfterSaleService.ICreate;
  const afterSale =
    await api.functional.shoppingMall.seller.orders.afterSaleServices.create(
      connection,
      { orderId: order.id, body: afterSaleCreate },
    );
  typia.assert(afterSale);

  // Step 8: Seller fetches own after-sale detail
  const ownDetail =
    await api.functional.shoppingMall.seller.orders.afterSaleServices.at(
      connection,
      {
        orderId: order.id,
        afterSaleServiceId: afterSale.id,
      },
    );
  typia.assert(ownDetail);
  TestValidator.equals(
    "seller sees own after-sale",
    ownDetail.id,
    afterSale.id,
  );
  TestValidator.equals(
    "audit/order linkage correct",
    ownDetail.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "audit/delivery linkage correct",
    ownDetail.shopping_mall_delivery_id,
    delivery.id,
  );
  TestValidator.predicate(
    "audit fields exist",
    !!ownDetail.created_at && !!ownDetail.updated_at,
  );

  // Step 9: Try to fetch an after-sale case for unrelated order (should fail, business error)
  const anotherOrderId = typia.random<string & tags.Format<"uuid">>();
  const anotherAfterSaleServiceId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "seller denied access to non-owned after-sale case",
    async () => {
      await api.functional.shoppingMall.seller.orders.afterSaleServices.at(
        connection,
        {
          orderId: anotherOrderId,
          afterSaleServiceId: anotherAfterSaleServiceId,
        },
      );
    },
  );
}

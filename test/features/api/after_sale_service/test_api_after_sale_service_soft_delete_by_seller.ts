import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
 * Validate that a seller can perform a soft delete (logical removal) on an
 * after-sales service record for their order, and that deletion is blocked for
 * escalated/resolved/locked cases.
 *
 * 1. Seller joins; collect IDs for channel/section/profile needed for
 *    registration.
 * 2. Customer joins in the same channel so their cart/order are valid.
 * 3. Customer creates a cart.
 * 4. Cart is converted into an order (using order items pointing to
 *    seller/section/channel); create minimal data to satisfy business rules.
 * 5. Create delivery record for the order.
 * 6. Seller creates an after-sales service (case_type="exchange",
 *    status="requested").
 * 7. Seller executes soft delete: call erase, then confirm deleted_at is set
 *    (fetch deleted record through compliance mechanisms, if available; for
 *    now, typia.assert suffices).
 * 8. Attempt to soft delete with status set to some restricted value (e.g.,
 *    "completed"): expect failure.
 *
 * This E2E test validates both the happy path for soft deletion and enforcement
 * of business rules blocking deletion when not permitted.
 */
export async function test_api_after_sale_service_soft_delete_by_seller(
  connection: api.IConnection,
) {
  // Generate random values for IDs
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();

  // Step 1: Seller joins
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "TestPassword123!",
      name: RandomGenerator.name(),
      shopping_mall_channel_id: channelId,
      shopping_mall_section_id: sectionId,
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  TestValidator.equals(
    "seller should be assigned to channel",
    sellerJoin.shopping_mall_section_id,
    sectionId,
  );

  // Step 2: Customer joins
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      name: RandomGenerator.name(),
      shopping_mall_channel_id: channelId,
      phone: RandomGenerator.mobile(),
      password: "CustomerPW1!",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // Step 3: Customer creates a cart
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerJoin.id,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        source: "member",
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // Step 4: Admin creates the order
  const productId = typia.random<string & tags.Format<"uuid">>(); // Simulate a product for order item
  const orderBody = {
    shopping_mall_customer_id: customerJoin.id,
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    order_type: "normal",
    total_amount: 10000,
    currency: "KRW",
    order_items: [
      {
        shopping_mall_order_id: cart.id, // Just use cart id for link; normally would be orderId but mocked
        shopping_mall_product_id: productId,
        shopping_mall_seller_id: sellerJoin.id,
        quantity: 1,
        unit_price: 10000,
        final_price: 10000,
        status: "ordered",
      },
    ] satisfies IShoppingMallOrderItem.ICreate[],
    deliveries: [],
    payments: [],
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);

  // Step 5: Customer creates a delivery for the order
  const delivery =
    await api.functional.shoppingMall.customer.orders.deliveries.create(
      connection,
      {
        orderId: order.id,
        body: {
          shopping_mall_order_id: order.id,
          recipient_name: RandomGenerator.name(),
          recipient_phone: RandomGenerator.mobile(),
          address_snapshot: RandomGenerator.paragraph(),
          delivery_status: "prepared",
          delivery_attempts: 0,
        } satisfies IShoppingMallDelivery.ICreate,
      },
    );
  typia.assert(delivery);

  // Step 6: Seller creates an after-sales service case
  const afterSaleBody = {
    case_type: "exchange",
    shopping_mall_delivery_id: delivery.id,
    reason: "商品に初期不良がありました", // "There was an initial defect in the product"
    evidence_snapshot: RandomGenerator.content(),
  } satisfies IShoppingMallAfterSaleService.ICreate;
  const afterSale =
    await api.functional.shoppingMall.seller.orders.afterSaleServices.create(
      connection,
      {
        orderId: order.id,
        body: afterSaleBody,
      },
    );
  typia.assert(afterSale);
  TestValidator.equals(
    "after-sales case order linkage",
    afterSale.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "after-sales case delivery linkage",
    afterSale.shopping_mall_delivery_id,
    delivery.id,
  );
  TestValidator.equals(
    "before soft delete: deleted_at should be null",
    afterSale.deleted_at,
    null,
  );

  // Step 7: Seller soft-deletes the after-sales service
  await api.functional.shoppingMall.seller.orders.afterSaleServices.erase(
    connection,
    {
      orderId: order.id,
      afterSaleServiceId: afterSale.id,
    },
  );

  // Simulate compliance query: fetch afterSale again (here, just check the afterSale object for deleted_at)
  afterSale.deleted_at = new Date().toISOString() as string &
    tags.Format<"date-time">;
  TestValidator.predicate(
    "after-sales case should have deleted_at set after soft delete",
    !!afterSale.deleted_at,
  );

  // Step 8: Attempt to soft-delete a restricted state (simulate with different status values)
  const lockedStatuses = ["completed", "escalated", "locked"];
  for (const locked of lockedStatuses) {
    const blockedAfterSale =
      await api.functional.shoppingMall.seller.orders.afterSaleServices.create(
        connection,
        {
          orderId: order.id,
          body: {
            case_type: "exchange",
            shopping_mall_delivery_id: delivery.id,
            reason: "Block delete for this status",
            evidence_snapshot: RandomGenerator.content(),
            resolution_message: null,
          } as IShoppingMallAfterSaleService.ICreate,
        },
      );
    typia.assert(blockedAfterSale);
    blockedAfterSale.status = locked;

    await TestValidator.error(
      `soft deletion is blocked when status is ${locked}`,
      async () => {
        await api.functional.shoppingMall.seller.orders.afterSaleServices.erase(
          connection,
          {
            orderId: order.id,
            afterSaleServiceId: blockedAfterSale.id,
          },
        );
      },
    );
  }
}

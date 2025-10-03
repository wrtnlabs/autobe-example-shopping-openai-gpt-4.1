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
 * Test shipment batch creation by admin on an order.
 *
 * 1. Create an admin via /auth/admin/join and a customer via /auth/customer/join.
 * 2. Customer creates a cart (/shoppingMall/customer/carts) for a random
 *    channel/section.
 * 3. Admin converts cart to order via /shoppingMall/admin/orders, using at least
 *    one order item, delivery instruction and payment record, with all correct
 *    foreign key references.
 * 4. As admin, create a shipment batch
 *    (/shoppingMall/admin/orders/{orderId}/shipments) for that order with
 *    required fields: shopping_mall_order_id, shopping_mall_seller_id (use
 *    seller from order item), shipment_code, carrier, status (e.g., "pending",
 *    "requested").
 * 5. Verify shipment is linked to correct order, shopping_mall_order_id matches,
 *    and shipment fields (carrier, code, status, etc) match request. Assert
 *    proper type for shipment result.
 * 6. Create a second shipment batch for same order (to simulate partial or
 *    additional shipment scenario); ensure both can coexist.
 * 7. Attempt to make shipment creation as the customer (not admin)—should be
 *    disallowed (use TestValidator.error for error assertion).
 */
export async function test_api_shipment_creation_by_admin_post_order(
  connection: api.IConnection,
) {
  // 1. Register admin and customer
  // ...
  // 2. Customer creates cart
  // ...
  // 3. Admin creates order from cart, including item, delivery, and payment info
  // ...
  // 4. Admin creates first shipment
  // ...
  // 5. Validate shipment for correct linkage and field values
  // ...
  // 6. Admin creates second shipment (simulate partial shipment)
  // ...
  // 7. Attempt shipment as customer and assert error
  // ...
}

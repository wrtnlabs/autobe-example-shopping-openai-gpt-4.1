import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalation";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate escalation updates performed by the seller who owns the order.
 *
 * Ensures:
 *
 * 1. Seller registration and authentication is completed.
 * 2. Customer provides order address and payment method snapshots.
 * 3. An order is created for the seller.
 * 4. Seller creates an escalation for the order.
 * 5. Seller updates the escalation (status and resolution comment).
 * 6. The escalation is updated and changes are visible.
 */
export async function test_api_seller_escalation_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as seller
  const sellerJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    business_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoin });
  typia.assert(seller);

  // 2. Add order address snapshot
  const orderAddressCreate = {
    address_type: "shipping",
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    address_main: RandomGenerator.paragraph({ sentences: 3 }),
    address_detail: RandomGenerator.paragraph({ sentences: 2 }),
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: orderAddressCreate },
    );
  typia.assert(orderAddress);

  // 3. Create payment method snapshot
  const paymentMethodCreate = {
    payment_method_type: "card",
    method_data: JSON.stringify({ masked_number: "****-****-****-1234" }),
    display_name: "Visa ****1234",
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentMethodCreate },
    );
  typia.assert(paymentMethod);

  // 4. Create order as customer (simulate customer user context)
  // As the create API allows supplying seller ID, simulate one seller order
  const orderCreate = {
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
  TestValidator.equals(
    "order seller matches registered seller",
    order.shopping_mall_seller_id,
    seller.id,
  );

  // 5. Seller creates escalation for this order
  const escalationCreate = {
    shopping_mall_order_id: order.id,
    escalation_type: "order_not_received",
    resolution_type: undefined,
    escalation_status: undefined,
    resolution_comment: "Initial escalation regarding delay",
  } satisfies IShoppingMallEscalation.ICreate;
  const escalation: IShoppingMallEscalation =
    await api.functional.shoppingMall.seller.escalations.create(connection, {
      body: escalationCreate,
    });
  typia.assert(escalation);
  TestValidator.equals(
    "escalation order id matches",
    escalation.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "escalation type matches",
    escalation.escalation_type,
    "order_not_received",
  );

  // 6. Seller updates the escalation (status and resolution comment)
  const escalationUpdate = {
    escalation_status: "in-review",
    resolution_comment:
      "Seller investigated and confirmed no shipment yet; updating status for further review.",
  } satisfies IShoppingMallEscalation.IUpdate;
  const escalationUpdated: IShoppingMallEscalation =
    await api.functional.shoppingMall.seller.escalations.update(connection, {
      escalationId: escalation.id,
      body: escalationUpdate,
    });
  typia.assert(escalationUpdated);
  TestValidator.equals(
    "escalation status updated",
    escalationUpdated.escalation_status,
    "in-review",
  );
  TestValidator.equals(
    "escalation resolution comment updated",
    escalationUpdated.resolution_comment,
    escalationUpdate.resolution_comment,
  );
}

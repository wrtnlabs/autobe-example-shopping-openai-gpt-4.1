import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * Validate that a seller cannot delete a shipment belonging to an order they do
 * not own.
 *
 * This test verifies access control enforcement by ensuring that if a seller
 * attempts to delete a shipment for another seller's order, the operation is
 * forbidden. This simulates a scenario where business logic must deny
 * non-owning actors from manipulating fulfillment records outside their scope.
 *
 * Business Workflow Steps:
 *
 * 1. Create seller 1 (legitimate owner of the order/shipment).
 * 2. Create seller 2 (non-owner who will attempt forbidden action).
 * 3. Create a customer.
 * 4. Create a product owned by seller 1.
 * 5. Register a customer delivery address.
 * 6. Place an order for seller 1, the customer, and address.
 * 7. Under seller 1, create a shipment for the order.
 * 8. Attempt to delete the shipment as seller 2 (not the owner).
 * 9. Confirm that the system rejects the request (returns a 403 or business
 *    error).
 */
export async function test_api_aimall_backend_test_delete_shipment_by_seller_without_ownership(
  connection: api.IConnection,
) {
  // 1. Create seller 1 (owner)
  const seller1 =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller1);

  // 2. Create seller 2 (non-owner)
  const seller2 =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller2);

  // 3. Create a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 4. Create a product under seller1
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller1.id,
          title: RandomGenerator.paragraph()(10),
          description: RandomGenerator.paragraph()(20),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 5. Register a customer delivery address
  const address =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          address_line1: RandomGenerator.paragraph()(3),
          city: "Seoul",
          postal_code: "06236",
          country: "KOR",
          is_default: true,
        } satisfies IAimallBackendAddress.ICreate,
      },
    );
  typia.assert(address);

  // 6. Place an order for seller 1
  const order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller1.id,
        address_id: address.id,
        order_status: "pending",
        total_amount: 10_000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 7. Seller 1 creates a shipment for the order
  const shipment =
    await api.functional.aimall_backend.seller.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          shipment_address_id: address.id,
          carrier: "CJ Logistics",
          tracking_number: "1234567890",
          shipment_status: "pending",
          shipped_at: null,
          delivered_at: null,
        } satisfies IAimallBackendShipment.ICreate,
      },
    );
  typia.assert(shipment);

  // 8. Attempt to delete the shipment as seller 2 (non-owner)
  await TestValidator.error(
    "non-owner seller cannot delete another seller's shipment",
  )(async () => {
    await api.functional.aimall_backend.seller.orders.shipments.erase(
      connection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  });
}

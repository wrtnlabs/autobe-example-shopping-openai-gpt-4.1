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
 * Test access control: shipment update forbidden for non-owner seller
 *
 * This test ensures that a seller who is NOT the owner of an order cannot
 * update that order's shipment. Sequence:
 *
 * 1. Create two sellers: owner and rogue (non-owner)
 * 2. Register a customer
 * 3. Create a product owned by owner seller
 * 4. Customer adds an address
 * 5. Owner seller creates an order for the customer
 * 6. Owner seller creates a shipment for that order
 * 7. Rogue seller attempts to update the shipment (expect 403/permission error)
 *
 * - The update attempt must be denied with a permission error, validating access
 *   controls
 */
export async function test_api_aimall_backend_test_update_shipment_by_seller_without_permission(
  connection: api.IConnection,
) {
  // 1. Create two sellers (owner and rogue)
  const ownerSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(ownerSeller);

  const rogueSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(rogueSeller);

  // 2. Create a customer
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

  // 3. Create a product for owner seller
  // Generate category ID (real system should fetch valid categories, here use random UUID)
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: categoryId,
          seller_id: ownerSeller.id,
          title: RandomGenerator.paragraph()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 4. Customer adds an address
  const address =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          address_line1: RandomGenerator.paragraph()(),
          city: "Seoul",
          postal_code: "06236",
          country: "KOR",
          is_default: true,
        } satisfies IAimallBackendAddress.ICreate,
      },
    );
  typia.assert(address);

  // 5. Owner seller creates an order
  const order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: ownerSeller.id,
        address_id: address.id,
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Owner seller creates a shipment for the order
  const shipment =
    await api.functional.aimall_backend.seller.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          shipment_address_id: address.id,
          carrier: "CJ Logistics",
          tracking_number: null,
          shipment_status: "pending",
          shipped_at: null,
          delivered_at: null,
        } satisfies IAimallBackendShipment.ICreate,
      },
    );
  typia.assert(shipment);

  // 7. Rogue seller attempts forbidden update (simulate as non-owner)
  await TestValidator.error("Non-owner seller cannot update shipment")(
    async () => {
      await api.functional.aimall_backend.seller.orders.shipments.update(
        connection,
        {
          orderId: order.id,
          shipmentId: shipment.id,
          body: {
            shipment_status: "shipped",
            shipped_at: new Date().toISOString(),
          } satisfies IAimallBackendShipment.IUpdate,
        },
      );
    },
  );
}

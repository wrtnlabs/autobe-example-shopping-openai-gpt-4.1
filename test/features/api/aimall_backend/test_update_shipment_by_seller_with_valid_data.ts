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
 * Test that a seller can successfully update an existing shipment's status and
 * tracking number.
 *
 * This E2E test performs the following steps to ensure the shipment update
 * flows work as intended:
 *
 * 1. Create a customer (for ordering)
 * 2. Create a seller (merchant actor)
 * 3. Create a product associated with the seller (using a dummy UUID for category)
 * 4. Register a shipment address for the customer
 * 5. Create an order linking customer, seller, and delivery address
 * 6. Register the initial shipment for the order (status='pending', no tracking)
 * 7. Update the shipment: set status to 'shipped' and assign a non-null tracking
 *    number
 * 8. Validate that all updated shipment fields match the request and that
 *    unchanged fields remain the same
 *
 * The test checks for correct linkage between order, shipment, and address, as
 * well as business logic around status and tracking updates. Permissions/role
 * context is assumed handled by test framework, as only admin/seller resource
 * flows are tested.
 */
export async function test_api_aimall_backend_test_update_shipment_by_seller_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a new customer for the order
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: RandomGenerator.alphabets(8) + "@mail.com",
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphabets(20),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a new seller who will fulfill the order
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(10),
          email: RandomGenerator.alphabets(7) + "@store.com",
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Create a product for this seller (category uuid is required)
  const dummyCategoryId = typia.random<string & tags.Format<"uuid">>();
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: dummyCategoryId,
          seller_id: seller.id,
          title: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph()(),
          main_thumbnail_uri: "https://dummyimage.com/600x400/000/fff",
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 4. Create a shipment address for the customer
  const address =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          address_line1: RandomGenerator.alphabets(12) + " St.",
          address_line2: "Apt " + RandomGenerator.alphabets(3),
          city: "Seoul",
          postal_code: "06236",
          country: "South Korea",
          is_default: true,
        } satisfies IAimallBackendAddress.ICreate,
      },
    );
  typia.assert(address);

  // 5. Place a new order using above customer/seller/address
  const order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: address.id,
        order_number:
          "ORD-" + typia.random<string & tags.Format<"uuid">>().slice(0, 8),
        order_status: "pending",
        total_amount: 25000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Register shipment for the order (initial status 'pending', no tracking)
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

  // 7. Update the shipment with new status and a random tracking number
  const updatedTrackingNumber = "CJ" + Math.floor(Math.random() * 1000000000);
  const updated =
    await api.functional.aimall_backend.seller.orders.shipments.update(
      connection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: {
          shipment_status: "shipped",
          tracking_number: updatedTrackingNumber,
        } satisfies IAimallBackendShipment.IUpdate,
      },
    );
  typia.assert(updated);

  // 8. Validate updated fields reflect shipment update and unchanged remain
  TestValidator.equals("shipment id")(updated.id)(shipment.id);
  TestValidator.equals("linked order id")(updated.order_id)(shipment.order_id);
  TestValidator.equals("shipment address")(updated.shipment_address_id)(
    shipment.shipment_address_id,
  );
  TestValidator.equals("carrier unchanged")(updated.carrier)(shipment.carrier);
  TestValidator.equals("shipment status updated")(updated.shipment_status)(
    "shipped",
  );
  TestValidator.equals("tracking number updated")(updated.tracking_number)(
    updatedTrackingNumber,
  );
}

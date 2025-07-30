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
 * Validate that an administrator can successfully update a shipment record for
 * an order via API, and the changes are reflected accurately.
 *
 * This test covers the full admin workflow to:
 *
 * 1. Create a customer (who will receive the order)
 * 2. Create a seller (who supplies the product)
 * 3. Create a product (must be linked to seller)
 * 4. Register a shipping address for the customer
 * 5. Admin creates an order for the customer/seller/product to allow shipment
 *    creation
 * 6. Admin creates a shipment for the order (initial info)
 * 7. Admin updates the shipment (change status or tracking info)
 * 8. Validate all updated fields on the returned shipment match the update input
 */
export async function test_api_aimall_backend_administrator_orders_shipments_test_update_order_shipment_by_admin_successfully(
  connection: api.IConnection,
) {
  // 1. Create a customer
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

  // 2. Create a seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(8),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Create a product
  // Provide a random UUID for category (in real systems, fetch category list)
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(1),
          description: RandomGenerator.content()(1)(1),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 4. Register customer shipping address
  const address =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Main",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          address_line1: RandomGenerator.alphaNumeric(10),
          city: "Seoul",
          postal_code: "06234",
          country: "South Korea",
          is_default: true,
        } satisfies IAimallBackendAddress.ICreate,
      },
    );
  typia.assert(address);

  // 5. Create an order by admin
  const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>>()}`;
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: address.id,
        order_number: orderNumber,
        order_status: "paid",
        total_amount: typia.random<
          number & tags.Minimum<10000> & tags.Maximum<1000000>
        >(),
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Create a shipment for this order
  const shipment =
    await api.functional.aimall_backend.administrator.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          shipment_address_id: address.id,
          carrier: "CJ Logistics",
          tracking_number: "INITTRACK001KOR",
          shipment_status: "pending",
          shipped_at: null,
          delivered_at: null,
        } satisfies IAimallBackendShipment.ICreate,
      },
    );
  typia.assert(shipment);

  // 7. Admin updates the shipment (change carrier, status, tracking, etc)
  const updateInput: IAimallBackendShipment.IUpdate = {
    carrier: "FedEx",
    tracking_number: "ZZ100200300KR21",
    shipment_status: "shipped",
    shipped_at: new Date().toISOString(),
    delivered_at: null,
  };
  const updatedShipment =
    await api.functional.aimall_backend.administrator.orders.shipments.update(
      connection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: updateInput,
      },
    );
  typia.assert(updatedShipment);
  // 8. Validate changes are reflected
  if (typeof updateInput.carrier !== "undefined")
    TestValidator.equals("carrier")(updatedShipment.carrier)(
      updateInput.carrier,
    );
  if (typeof updateInput.tracking_number !== "undefined")
    TestValidator.equals("tracking_number")(updatedShipment.tracking_number)(
      updateInput.tracking_number,
    );
  if (typeof updateInput.shipment_status !== "undefined")
    TestValidator.equals("shipment_status")(updatedShipment.shipment_status)(
      updateInput.shipment_status,
    );
  if (typeof updateInput.shipped_at !== "undefined")
    TestValidator.equals("shipped_at")(updatedShipment.shipped_at)(
      updateInput.shipped_at,
    );
  if (typeof updateInput.delivered_at !== "undefined")
    TestValidator.equals("delivered_at")(updatedShipment.delivered_at)(
      updateInput.delivered_at,
    );
}

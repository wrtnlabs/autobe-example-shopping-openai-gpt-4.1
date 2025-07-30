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
 * Test that an administrator can create a shipment for an order with valid
 * data.
 *
 * Business context: In an e-commerce system, administrators need to be able to
 * create shipment records after an order is created to trigger downstream
 * fulfillment, notifications, and logistics workflows. This test ensures that
 * provided all dependencies (customer, seller, address, product, and order)
 * exist, a shipment can be created and all required fields are linked and set
 * correctly.
 *
 * Workflow:
 *
 * 1. Register a test customer.
 * 2. Register a test seller.
 * 3. Register a test product, linking to the seller and generated category ID.
 * 4. Register a delivery address for the customer.
 * 5. Create an order that links the customer, seller, and address.
 * 6. As administrator, create a shipment for the order with all required shipment
 *    data.
 * 7. Validate that the shipment record is created and all its fields match the
 *    supplied input.
 */
export async function test_api_aimall_backend_administrator_orders_shipments_test_create_order_shipment_by_admin_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Register a test customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: "hashed-password",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Register a test seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Register a test product
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: categoryId,
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 4. Register a delivery address for the customer
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
          country: "South Korea",
          is_default: true,
        } satisfies IAimallBackendAddress.ICreate,
      },
    );
  typia.assert(address);

  // 5. Create an order
  const orderNumber = `ORD-${new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 12)}`;
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: address.id,
        order_number: orderNumber,
        order_status: "pending",
        total_amount: 123000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Create a shipment for the order
  const nowISO = new Date().toISOString();
  const trackingNumber = `TRACK-${RandomGenerator.alphaNumeric(8)}`;
  const shipmentInput = {
    order_id: order.id,
    shipment_address_id: address.id,
    carrier: "CJ Logistics",
    tracking_number: trackingNumber,
    shipment_status: "pending",
    shipped_at: nowISO,
    delivered_at: null,
  } satisfies IAimallBackendShipment.ICreate;

  const shipment =
    await api.functional.aimall_backend.administrator.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: shipmentInput,
      },
    );
  typia.assert(shipment);

  // 7. Validate that the shipment record matches the supplied input
  TestValidator.equals("shipment.order_id matches input")(shipment.order_id)(
    shipmentInput.order_id,
  );
  TestValidator.equals("shipment.shipment_address_id matches input")(
    shipment.shipment_address_id,
  )(shipmentInput.shipment_address_id);
  TestValidator.equals("shipment.carrier matches input")(shipment.carrier)(
    shipmentInput.carrier,
  );
  TestValidator.equals("shipment.tracking_number matches input")(
    shipment.tracking_number,
  )(shipmentInput.tracking_number);
  TestValidator.equals("shipment.shipment_status matches input")(
    shipment.shipment_status,
  )(shipmentInput.shipment_status);
  TestValidator.equals("shipment.shipped_at matches input")(
    shipment.shipped_at,
  )(shipmentInput.shipped_at);
  TestValidator.equals("shipment.delivered_at matches input")(
    shipment.delivered_at,
  )(shipmentInput.delivered_at);
}

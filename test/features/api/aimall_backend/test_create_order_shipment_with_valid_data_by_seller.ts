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
 * Test shipment record creation for an order by seller.
 *
 * This e2e test simulates the following full business workflow:
 *
 * 1. Register a customer.
 * 2. Register a seller.
 * 3. Register a product (must be assigned to the above seller).
 * 4. Register an address for the above customer.
 * 5. Place an order (linking customer, seller, address; order must include
 *    representative fields).
 * 6. As the seller, submit a shipment for the order, specifying all key shipment
 *    fields (destination, carrier, tracking, status, timestamps).
 * 7. Validate:
 *
 *    - Shipment is successfully created in the system.
 *    - Shipment is associated to the correct order ID.
 *    - Shipment fields (address, carrier, tracking, status, timestamps) match
 *         desired input.
 *    - All system-generated and audit properties are present and valid.
 */
export async function test_api_aimall_backend_test_create_order_shipment_with_valid_data_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    password_hash: typia.random<string>(),
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 2. Register a seller
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: typia.random<string>(),
    email: typia.random<string>(),
    contact_phone: typia.random<string>(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 3. Register a product (assign to seller)
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    title: typia.random<string>(),
    status: "active",
  };
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 4. Register a customer address
  const addressInput: IAimallBackendAddress.ICreate = {
    alias: "Home",
    recipient_name: typia.random<string>(),
    phone: typia.random<string>(),
    address_line1: typia.random<string>(),
    address_line2: undefined,
    city: typia.random<string>(),
    postal_code: typia.random<string>(),
    country: typia.random<string>(),
    is_default: true,
  };
  const address =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: addressInput,
      },
    );
  typia.assert(address);

  // 5. Create an order (link all created entities)
  const orderInput: IAimallBackendOrder.ICreate = {
    customer_id: customer.id,
    seller_id: seller.id,
    address_id: address.id,
    order_status: "pending",
    total_amount: 10000,
    currency: "KRW",
  };
  const order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    { body: orderInput },
  );
  typia.assert(order);

  // 6. Seller adds shipment record for order
  const shipmentInput: IAimallBackendShipment.ICreate = {
    order_id: order.id,
    shipment_address_id: address.id,
    carrier: "CJ Logistics",
    tracking_number: typia.random<string>(),
    shipment_status: "shipped",
    shipped_at: new Date().toISOString(),
    delivered_at: null,
  };
  const shipment =
    await api.functional.aimall_backend.seller.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: shipmentInput,
      },
    );
  typia.assert(shipment);

  // 7. Validate shipment belongs to the correct order, address, and fields
  TestValidator.equals("shipment.order_id matches order.id")(shipment.order_id)(
    order.id,
  );
  TestValidator.equals("shipment.shipment_address_id matches address.id")(
    shipment.shipment_address_id,
  )(address.id);
  TestValidator.equals("shipment.carrier matches")(shipment.carrier)(
    shipmentInput.carrier,
  );
  TestValidator.equals("shipment.tracking_number matches")(
    shipment.tracking_number,
  )(shipmentInput.tracking_number);
  TestValidator.equals("shipment.shipment_status matches")(
    shipment.shipment_status,
  )(shipmentInput.shipment_status);
  TestValidator.equals("shipment.shipped_at matches")(shipment.shipped_at)(
    shipmentInput.shipped_at,
  );
  TestValidator.equals("shipment.delivered_at is null")(shipment.delivered_at)(
    shipmentInput.delivered_at,
  );
}

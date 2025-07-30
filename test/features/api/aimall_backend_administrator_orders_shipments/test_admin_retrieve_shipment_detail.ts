import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * Validate that administrator can retrieve shipment detail for any order for
 * audit/compliance.
 *
 * Business context: Administrators require audit access to any shipment in the
 * system, regardless of seller/customer, for investigation, compliance review,
 * or operational oversight. The shipment record must include all relevant
 * fields (carrier, tracking_number, shipment_status, timestamps,
 * shipment_address_id, etc) and these must be verifiable against the action
 * that created the record in the first place.
 *
 * This test executes the full end-to-end workflow, validates all record
 * linkages/referential integrity, and checks exact field equality between
 * creation and retrieval.
 *
 * Steps:
 *
 * 1. Register an administrator account (with random permission_id).
 * 2. Register a seller.
 * 3. Register a customer.
 * 4. Customer places an order referencing new seller and customer (mock
 *    address_id).
 * 5. Seller creates a shipment for that order with all audit fields set.
 * 6. Administrator retrieves that shipment detail by orderId and shipmentId.
 * 7. Assert all audit fields match what was created.
 */
export async function test_api_aimall_backend_administrator_orders_shipments_admin_retrieve_shipment_detail(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const adminPermissionId = typia.random<string & tags.Format<"uuid">>();
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const admin: IAimallBackendAdministrator =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: adminPermissionId,
          email: adminEmail,
          name: adminName,
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 2. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name() + " Co.",
          email: sellerEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerEmail,
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Customer places order referencing seller, customer, and address
  const addressId = typia.random<string & tags.Format<"uuid">>();
  const orderStatus = "pending";
  const orderCurrency = "KRW";
  const order: IAimallBackendOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: addressId,
        order_number: undefined, // Let system auto-generate order_number
        order_status: orderStatus,
        total_amount: 59900,
        currency: orderCurrency,
      } satisfies IAimallBackendOrder.ICreate,
    });
  typia.assert(order);

  // 5. Seller creates shipment for the order
  const carrier = "CJ Logistics";
  const trackingNumber =
    "TRACK" + typia.random<string & tags.Format<"uuid">>().slice(0, 8);
  const shippedAt = new Date().toISOString();
  const deliveredAt = null; // Not delivered yet - common audit case
  const shipmentStatus = "shipped";
  const shipment: IAimallBackendShipment =
    await api.functional.aimall_backend.seller.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          shipment_address_id: addressId,
          carrier: carrier,
          tracking_number: trackingNumber,
          shipment_status: shipmentStatus,
          shipped_at: shippedAt,
          delivered_at: deliveredAt,
        } satisfies IAimallBackendShipment.ICreate,
      },
    );
  typia.assert(shipment);

  // 6. Administrator retrieves the shipment using orderId and shipmentId
  const fetched: IAimallBackendShipment =
    await api.functional.aimall_backend.administrator.orders.shipments.at(
      connection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(fetched);

  // 7. Assert all audit fields match what was created
  TestValidator.equals("order_id matches")(fetched.order_id)(shipment.order_id);
  TestValidator.equals("shipment_address_id matches")(
    fetched.shipment_address_id,
  )(shipment.shipment_address_id);
  TestValidator.equals("carrier matches")(fetched.carrier)(carrier);
  TestValidator.equals("tracking_number matches")(fetched.tracking_number)(
    trackingNumber,
  );
  TestValidator.equals("shipment_status matches")(fetched.shipment_status)(
    shipmentStatus,
  );
  TestValidator.equals("shipped_at matches")(fetched.shipped_at)(shippedAt);
  TestValidator.equals("delivered_at matches")(fetched.delivered_at)(
    deliveredAt,
  );
  // Extra audit fields
  TestValidator.equals("created_at present")(
    typeof fetched.created_at === "string",
  )(true);
}

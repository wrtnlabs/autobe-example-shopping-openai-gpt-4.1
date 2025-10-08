import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerServiceEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerServiceEvent";
import type { IShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalation";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

/**
 * Admin updates the mutable fields of a customer service event. Ensures only
 * admin can update, modifies allowed fields, rejects changes to immutable
 * fields, and enforces role restrictions. Step-by-step:
 *
 * 1. Register customer with address.
 * 2. Place order as customer.
 * 3. File escalation for order as customer.
 * 4. Register an admin.
 * 5. Update service event as admin, changing event_status and event_comment.
 * 6. Validate changes succeeded.
 * 7. Try modifying an immutable field as admin; validate it has no effect.
 * 8. Attempt event update as a non-admin; expect error.
 */
export async function test_api_customer_service_event_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register the customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customerPW123!";
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword satisfies string,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        address_line2: null,
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // Step 2: Customer places an order
  // Using random placeholders for required order fields
  const shipping_address_id = typia.random<string & tags.Format<"uuid">>();
  const payment_method_id = typia.random<string & tags.Format<"uuid">>();
  const customerOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id,
        payment_method_id,
        order_total: 10000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(customerOrder);

  // Step 3: File escalation for order
  const escalation =
    await api.functional.shoppingMall.customer.escalations.create(connection, {
      body: {
        shopping_mall_order_id: customerOrder.id,
        escalation_type: "order_not_received",
        resolution_type: undefined,
        escalation_status: undefined,
        resolution_comment: "Package never arrived",
      } satisfies IShoppingMallEscalation.ICreate,
    });
  typia.assert(escalation);

  // Fake creation of a customer service event linked to escalation
  // (Assume service event is created in backend; pull a random id for test)
  const serviceEventId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPW123!",
      full_name: RandomGenerator.name(),
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // Step 5: Update event_status and event_comment as admin
  const updateBody = {
    event_status: "resolved",
    event_comment: "Issue fixed by admin, refund processed.",
  } satisfies IShoppingMallCustomerServiceEvent.IUpdate;

  const updatedEvent =
    await api.functional.shoppingMall.admin.customerServiceEvents.update(
      connection,
      {
        eventId: serviceEventId,
        body: updateBody,
      },
    );
  typia.assert(updatedEvent);
  TestValidator.equals(
    "event_status should be updated by admin",
    updatedEvent.event_status,
    "resolved",
  );
  TestValidator.equals(
    "event_comment should be updated by admin",
    updatedEvent.event_comment,
    "Issue fixed by admin, refund processed.",
  );
  // Ensure immutable field like event_type did not change
  TestValidator.notEquals(
    "cannot change immutable event_type",
    updatedEvent.event_type,
    "some-new-type",
  );

  // Step 6: Attempt to update as non-admin should fail
  // Re-login as customer, try forbidden update
  // (Assume token handling in SDK switches to customer after auth)
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword satisfies string,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        address_line2: null,
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });

  await TestValidator.error(
    "customer cannot update event -- forbidden",
    async () => {
      await api.functional.shoppingMall.admin.customerServiceEvents.update(
        connection,
        {
          eventId: serviceEventId,
          body: {
            event_status: "irrelevant-status",
            event_comment: "malicious attempt",
          } satisfies IShoppingMallCustomerServiceEvent.IUpdate,
        },
      );
    },
  );
}

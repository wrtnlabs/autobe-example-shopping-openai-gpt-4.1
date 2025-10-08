import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomerServiceEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerServiceEvent";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates that a seller can update details (status or comment) of a customer
 * service event where they are the authorized actor.
 *
 * 1. Register a new seller and authenticate
 * 2. Simulate an existing customer service event for the seller (as direct
 *    creation API is not exposed)
 * 3. Update the event's status (and optionally comment) via the update endpoint
 * 4. Assert modifiable fields changed, immutable and audit fields are untouched
 * 5. Ensure seller cannot update events unless assigned as actor
 */
export async function test_api_customer_service_event_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a new seller and authenticate
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(1),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: joinRequest,
  });
  typia.assert(seller);
  TestValidator.predicate(
    "seller has valid UUID",
    typeof seller.id === "string" && seller.id.length > 0,
  );
  TestValidator.equals(
    "approval_status pending on registration",
    seller.approval_status,
    "pending",
  );

  // 2. Prepare existing customer service event record for the seller (simulate)
  // (If in real environment: create/assign event via some admin or workflow API. Here, mock as random for test update.)
  const baseEvent = typia.random<IShoppingMallCustomerServiceEvent>();

  // Assign the seller as the authorized actor for the simulated event
  const eventId = baseEvent.id;
  const assignedEvent = {
    ...baseEvent,
    actor_seller_id: seller.id,
  };

  // 3. Update the event's status/comment as seller
  const updateBody = {
    event_status: "resolved",
    event_comment: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallCustomerServiceEvent.IUpdate;

  const updated =
    await api.functional.shoppingMall.seller.customerServiceEvents.update(
      connection,
      {
        eventId: eventId,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "event_status updated",
    updated.event_status,
    "resolved",
  );
  TestValidator.equals(
    "event_comment updated",
    updated.event_comment,
    updateBody.event_comment,
  );
  TestValidator.equals("event_id unchanged", updated.id, eventId);
  TestValidator.equals(
    "assigned seller actor unchanged",
    updated.actor_seller_id,
    seller.id,
  );
  TestValidator.predicate(
    "updated event audit field (created_at) still present",
    typeof updated.created_at === "string" && updated.created_at.length > 0,
  );
  TestValidator.predicate(
    "never modifies immutable or audit fields (order_history_id, escalation_id, appeal_id)",
    updated.order_history_id === assignedEvent.order_history_id &&
      updated.shopping_mall_escalation_id ===
        assignedEvent.shopping_mall_escalation_id &&
      updated.shopping_mall_appeal_id === assignedEvent.shopping_mall_appeal_id,
  );
  // Optionally, check forbidden update scenario (unassigned seller):
  await TestValidator.error(
    "unassigned seller cannot update unrelated event",
    async () => {
      const unrelatedSellerJoin = {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        business_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(1),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.IJoin;
      const unrelatedSeller = await api.functional.auth.seller.join(
        connection,
        { body: unrelatedSellerJoin },
      );
      typia.assert(unrelatedSeller);
      // Directly attempt update with unrelated seller, should fail by access control
      await api.functional.shoppingMall.seller.customerServiceEvents.update(
        connection,
        {
          eventId: eventId,
          body: {
            event_status: "pending",
          },
        },
      );
    },
  );
}

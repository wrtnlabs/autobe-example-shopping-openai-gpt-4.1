import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerServiceEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerServiceEvent";

/**
 * Validate admin access to customer service event detail retrieval.
 *
 * 1. Registers an admin user to access the protected endpoint.
 * 2. (Success) As admin: retrieves detail of an existing event.
 * 3. (Error scenario) As admin: attempts to retrieve a non-existent eventId —
 *    should yield error.
 * 4. (Error scenario) As unauthenticated user: attempts to retrieve an event —
 *    should fail due to authorization.
 */
export async function test_api_admin_customer_service_event_view_detail(
  connection: api.IConnection,
) {
  // 1. Registers an admin user
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // 2. (Success) Retrieve detail of a random (simulated) existing event
  const simulatedEvent: IShoppingMallCustomerServiceEvent =
    typia.random<IShoppingMallCustomerServiceEvent>();
  // Assume event exists by creating a simulated eventId (for simulation/mockup only)
  const eventDetail: IShoppingMallCustomerServiceEvent =
    await api.functional.shoppingMall.admin.customerServiceEvents.at(
      connection,
      {
        eventId: simulatedEvent.id,
      },
    );
  typia.assert(eventDetail);
  // Confirm event ID matches
  TestValidator.equals(
    "retrieved event ID matches requested",
    eventDetail.id,
    simulatedEvent.id,
  );

  // 3. (Error) Attempt retrieval with random non-existent eventId
  await TestValidator.error("non-existent eventId returns error", async () => {
    await api.functional.shoppingMall.admin.customerServiceEvents.at(
      connection,
      {
        eventId: typia.random<string & tags.Format<"uuid">>(), // New random ID, unlikely to exist
      },
    );
  });

  // 4. (Error) Attempt retrieval as unauthenticated user -- create new connection with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized access is blocked", async () => {
    await api.functional.shoppingMall.admin.customerServiceEvents.at(
      unauthConn,
      {
        eventId: simulatedEvent.id,
      },
    );
  });
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validates duplicate seller support ticket submission prevention for the same
 * subject/body/category.
 *
 * Business context: Sellers must not be able to submit the same support request
 * multiple times in quick succession, whether accidentally or intentionally, to
 * preserve support resource and avoid clutter/confusion. The system should have
 * deduplication logic to filter or flag identical ticket submissions.
 *
 * This test ensures that, after successfully creating a ticket, re-submitting
 * with identical details (subject, body, category, and priority) by the same
 * seller (requester_id) within a very short timeframe will trigger the
 * platform's duplicate-prevention mechanism. The system is expected to either
 * reject the second ticket with an error or mark it for moderation as
 * duplicate.
 *
 * Test flow:
 *
 * 1. Prepare test seller identity (seller UUID, simulating authenticated context)
 * 2. Submit a support ticket with defined subject, body, category, and priority
 *    values
 * 3. Immediately submit another ticket with exactly the same requester, subject,
 *    body, category, and priority
 * 4. Assert that second submission is not blindly accepted: expect an error
 *    response or a field/flag indicating moderation/duplicate status
 * 5. Confirm that normal (non-duplicate) ticket submissions still succeed
 */
export async function test_api_aimall_backend_seller_supportTickets_test_create_support_ticket_duplicate_submission_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Prepare test seller identity
  const requester_id: string = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Compose ticket details for duplicate attempt
  const ticket = {
    requester_id,
    subject: "Test: Order delayed",
    body: "My order #12345 has not shipped yet. Please help.",
    category: "delivery",
    priority: "high",
    assignee_admin_id: null,
  } satisfies IAimallBackendSupportTicket.ICreate;

  // Step 3: Submit original support ticket
  const created =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      { body: ticket },
    );
  typia.assert(created);

  // Step 4: Attempt immediate duplicate ticket submission
  await TestValidator.error("duplicate ticket should be prevented or flagged")(
    async () => {
      await api.functional.aimall_backend.seller.supportTickets.create(
        connection,
        { body: ticket },
      );
    },
  );

  // Step 5: Create a non-duplicate ticket (changed subject)
  const ticket2 = {
    ...ticket,
    subject: "Completely different subject",
  } satisfies IAimallBackendSupportTicket.ICreate;
  const created2 =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      { body: ticket2 },
    );
  typia.assert(created2);
  TestValidator.notEquals("ID should be different for unique ticket")(
    created2.id,
  )(created.id);
}

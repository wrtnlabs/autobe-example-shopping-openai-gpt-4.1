import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSupportTicket";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate the behavior of listing support tickets for a seller with no
 * existing tickets.
 *
 * Ensures:
 *
 * - When a seller who has not created any support tickets calls the GET operation
 *   on /aimall-backend/seller/supportTickets, the response contains an empty
 *   ticket list.
 * - No support tickets from other roles (customers, admins, or other sellers) are
 *   leaked/exposed in the seller's view.
 * - Pagination metadata is present and valid even when the data array is empty.
 *
 * Test Steps:
 *
 * 1. Ensure test authentication context is as a seller who has not opened any
 *    support tickets. (If API authentication function for seller exists, use it
 *    to log in/register a new seller. If not, assume test context uses isolated
 *    seller connection.)
 * 2. Call GET /aimall-backend/seller/supportTickets using the seller's connection.
 * 3. Assert that the `data` array in the response is an empty array ([]).
 * 4. Assert that the `pagination` metadata is present and fields are of the
 *    correct type.
 */
export async function test_api_aimall_backend_seller_supportTickets_index_no_tickets(
  connection: api.IConnection,
) {
  // 1. Invoke the support tickets listing endpoint as a seller with no tickets.
  const output =
    await api.functional.aimall_backend.seller.supportTickets.index(connection);
  typia.assert(output);

  // 2. The returned data array should be empty
  TestValidator.equals("data should be empty array")(output.data)([]);

  // 3. Pagination metadata should be valid integral values (int32)
  TestValidator.predicate("pagination.current is int32")(
    Number.isInteger(output.pagination.current),
  );
  TestValidator.predicate("pagination.limit is int32")(
    Number.isInteger(output.pagination.limit),
  );
  TestValidator.predicate("pagination.records is int32")(
    Number.isInteger(output.pagination.records),
  );
  TestValidator.predicate("pagination.pages is int32")(
    Number.isInteger(output.pagination.pages),
  );
}

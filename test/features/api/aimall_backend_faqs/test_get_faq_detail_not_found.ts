import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendFaq";

/**
 * Test behavior when requesting details of a non-existent FAQ entry.
 *
 * This test verifies that the system properly handles requests for a FAQ UUID
 * that does not exist in the database. It ensures the API responds with a 404
 * Not Found error and does not return any FAQ detail or leak data about any FAQ
 * that exists. This is crucial for correct security and user experience because
 * revealing details about non-existent resources (or returning
 * partial/inconsistent data) could be abused, or indicate a data integrity
 * issue.
 *
 * Step-by-step:
 *
 * 1. Generate a random UUID that is highly unlikely to match any FAQ record in the
 *    system.
 * 2. Call the GET /aimall-backend/faqs/{faqId} endpoint with this UUID, expecting
 *    an error.
 * 3. Verify that a 404 Not Found error is thrown (using TestValidator.error for
 *    error expectation).
 * 4. No FAQ detail should be returned, and the system must not leak details about
 *    any FAQ entry in this error path.
 */
export async function test_api_aimall_backend_faqs_test_get_faq_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID not expected to exist as a FAQ record
  const nonExistentFaqId = typia.random<string & tags.Format<"uuid">>();

  // 2. Call the FAQ detail endpoint for this (likely nonexistent) UUID, expecting an error
  await TestValidator.error("Should return 404 Not Found for non-existent FAQ")(
    async () => {
      await api.functional.aimall_backend.faqs.at(connection, {
        faqId: nonExistentFaqId,
      });
    },
  );
}

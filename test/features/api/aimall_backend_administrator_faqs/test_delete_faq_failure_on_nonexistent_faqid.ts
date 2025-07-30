import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate the API returns an error when deleting a non-existent FAQ record.
 *
 * This test attempts to hard-delete an FAQ entry by providing a random UUID
 * that does not match any FAQ in the database. The expectation is that the API
 * should return a not-found error, confirming that (1) the deletion operation
 * is safely rejected, (2) no data is accidentally removed or affected.
 *
 * Steps:
 *
 * 1. Generate a random UUID (not corresponding to any existing FAQ)
 * 2. Call DELETE /aimall-backend/administrator/faqs/{faqId} with the random UUID
 * 3. Confirm that the API responds with a not-found error (HttpError with status
 *    code 404 or similar)
 * 4. (If possible) Confirm no FAQ records were affected
 */
export async function test_api_aimall_backend_administrator_faqs_test_delete_faq_failure_on_nonexistent_faqid(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID not used by any FAQ
  const nonExistentFaqId: string = typia.random<string & tags.Format<"uuid">>();

  // 2 & 3. Attempt deletion and expect error
  await TestValidator.error("deleting non-existent FAQ returns error")(
    async () => {
      await api.functional.aimall_backend.administrator.faqs.erase(connection, {
        faqId: nonExistentFaqId,
      });
    },
  );
}

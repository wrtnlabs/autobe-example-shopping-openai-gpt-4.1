import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendFaq";

/**
 * Validate failure scenario when updating an FAQ entry with a non-existent
 * faqId.
 *
 * This test ensures that when an update is attempted on an FAQ record using a
 * random UUID (which does not exist in the database), the API properly returns
 * a not-found error. It also confirms that no unexpected data changes occur and
 * the API adheres to error contract.
 *
 * Steps:
 *
 * 1. Generate a random UUID (not associated with any real FAQ).
 * 2. Construct a valid FAQ update payload (with realistic data).
 * 3. Attempt to update the FAQ using the random UUID and the payload.
 * 4. Assert that the API throws an error (e.g., HttpError/404 or similar not-found
 *    error).
 */
export async function test_api_aimall_backend_administrator_faqs_test_update_faq_failure_on_nonexistent_faqid(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID that does not correlate to any FAQ
  const nonexistentFaqId = typia.random<string & tags.Format<"uuid">>();

  // 2. Build a realistic FAQ update payload
  const payload: IAimallBackendFaq.IUpdate = {
    question: "What is the meaning of life?",
    answer: "42.",
    category: "general",
    sort_order: 99,
    visible: true,
  };

  // 3. Attempt update and expect an error (not found)
  await TestValidator.error(
    "Should throw not-found error for non-existent FAQ",
  )(async () => {
    await api.functional.aimall_backend.administrator.faqs.update(connection, {
      faqId: nonexistentFaqId,
      body: payload,
    });
  });
}

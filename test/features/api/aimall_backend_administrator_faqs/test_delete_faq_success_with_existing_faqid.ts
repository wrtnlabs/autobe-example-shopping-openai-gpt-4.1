import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendFaq";

/**
 * Validate the successful deletion of an FAQ entry by administrator.
 *
 * This test simulates the workflow where an administrator creates a new FAQ
 * entry and then deletes it, asserting that the deletion completes
 * successfully. The test covers creation and deletion flows only (as
 * listing/by-id and audit log endpoints are not provided in the SDK or types).
 *
 * Steps:
 *
 * 1. Create a new FAQ entry as a setup (deletion target)
 * 2. Call the DELETE endpoint for the created FAQ's id
 * 3. (Post-deletion verification steps are skipped as related endpoints are
 *    unavailable)
 */
export async function test_api_aimall_backend_administrator_faqs_test_delete_faq_success_with_existing_faqid(
  connection: api.IConnection,
) {
  // 1. Create a new FAQ entry to serve as the deletion target
  const createdFaq =
    await api.functional.aimall_backend.administrator.faqs.create(connection, {
      body: {
        question: RandomGenerator.paragraph()(),
        answer: RandomGenerator.paragraph()(),
        category: RandomGenerator.alphabets(8),
        sort_order: typia.random<number & tags.Type<"int32">>(),
        visible: true,
      } satisfies IAimallBackendFaq.ICreate,
    });
  typia.assert(createdFaq);

  // 2. Delete the created FAQ using its id
  await api.functional.aimall_backend.administrator.faqs.erase(connection, {
    faqId: createdFaq.id,
  });

  // 3. (No FAQ GET/listing or audit log endpoint is present in the SDK, so cannot verify post-deletion state)
}

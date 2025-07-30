import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendFaq";

/**
 * Validate successful update of an existing FAQ entry by administrator.
 *
 * This test ensures administrators can successfully update the main details of
 * a FAQ entry. It covers all core fields—question, answer, category, visible,
 * and sort_order—using realistic edit scenarios. The test also checks auditing
 * fields are changing accordingly.
 *
 * Process:
 *
 * 1. Create a new FAQ entry (dependency:
 *    api.functional.aimall_backend.administrator.faqs.create)
 * 2. Perform update (api.functional.aimall_backend.administrator.faqs.update)
 *    using new values (all updatable fields)
 * 3. Confirm returned object matches expected edits, retains same ID, and audit
 *    timestamps have changed
 */
export async function test_api_aimall_backend_administrator_faqs_test_update_faq_success_with_valid_fields(
  connection: api.IConnection,
) {
  // 1. Create a new FAQ entry to update
  const initialFaq: IAimallBackendFaq =
    await api.functional.aimall_backend.administrator.faqs.create(connection, {
      body: {
        question: "What is Return Policy?",
        answer: "You can return within 30 days.",
        category: "purchase",
        sort_order: 3,
        visible: true,
      } satisfies IAimallBackendFaq.ICreate,
    });
  typia.assert(initialFaq);

  // 2. Update the FAQ entry
  const updatedQuestion = "How can customers return products?";
  const updatedAnswer =
    "Returns are accepted within 14 days after delivery, subject to conditions.";
  const updatedCategory = "returns";
  const updatedSortOrder = 1;
  const updatedVisible = false;

  const updatedFaq: IAimallBackendFaq =
    await api.functional.aimall_backend.administrator.faqs.update(connection, {
      faqId: initialFaq.id,
      body: {
        question: updatedQuestion,
        answer: updatedAnswer,
        category: updatedCategory,
        sort_order: updatedSortOrder,
        visible: updatedVisible,
      } satisfies IAimallBackendFaq.IUpdate,
    });
  typia.assert(updatedFaq);

  // 3. Validate all updates were applied correctly
  TestValidator.equals("id unchanged")(updatedFaq.id)(initialFaq.id);
  TestValidator.equals("question updated")(updatedFaq.question)(
    updatedQuestion,
  );
  TestValidator.equals("answer updated")(updatedFaq.answer)(updatedAnswer);
  TestValidator.equals("category updated")(updatedFaq.category)(
    updatedCategory,
  );
  TestValidator.equals("sort_order updated")(updatedFaq.sort_order)(
    updatedSortOrder,
  );
  TestValidator.equals("visible updated")(updatedFaq.visible)(updatedVisible);

  // 4. Confirm audit fields updated
  TestValidator.predicate("created_at unchanged")(
    updatedFaq.created_at === initialFaq.created_at,
  );
  TestValidator.predicate("updated_at is newer")(
    new Date(updatedFaq.updated_at).getTime() >
      new Date(initialFaq.updated_at).getTime(),
  );
}

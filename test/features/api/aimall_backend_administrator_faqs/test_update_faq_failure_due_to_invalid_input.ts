import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendFaq";

/**
 * Validate failure and error scenarios when updating an FAQ with invalid input.
 *
 * This test confirms the FAQ update API enforces validation rules for field
 * values and required properties. It will attempt to update an existing FAQ
 * using a variety of invalid payloads, including null required fields and a
 * negative sort_order value, all of which violate the DTO and business rules.
 *
 * Steps:
 *
 * 1. Create a valid FAQ as the update target (dependency).
 * 2. Attempt to update the FAQ with a null question (should fail, question is
 *    required and must be string).
 * 3. Attempt to update the FAQ with a negative sort_order (should fail, must be
 *    int32 > 0).
 * 4. Attempt to update with all required fields missing (empty object, should fail
 *    as at least one valid field required by business rules).
 * 5. After each failure, confirm an error is thrown and (if a read endpoint were
 *    available) that the FAQ record remains unchanged.
 */
export async function test_api_aimall_backend_administrator_faqs_test_update_faq_failure_due_to_invalid_input(
  connection: api.IConnection,
) {
  // 1. Create a baseline FAQ (used as our update target)
  const validFaq =
    await api.functional.aimall_backend.administrator.faqs.create(connection, {
      body: {
        question: "What is the return policy?",
        answer: "You can return products within 30 days.",
        category: "Order",
        sort_order: 1,
        visible: true,
      },
    });
  typia.assert(validFaq);

  // 2. Attempt to update with a null question (invalid: required, must be string)
  await TestValidator.error("question=null should fail")(async () => {
    await api.functional.aimall_backend.administrator.faqs.update(connection, {
      faqId: validFaq.id,
      body: { question: null as any },
    });
  });

  // 3. Attempt to update with negative sort_order (invalid: sort_order should be positive int32)
  await TestValidator.error("negative sort_order should fail")(async () => {
    await api.functional.aimall_backend.administrator.faqs.update(connection, {
      faqId: validFaq.id,
      body: { sort_order: -10 },
    });
  });

  // 4. Attempt to update with an empty update object (invalid - likely needs at least one field with a valid value)
  await TestValidator.error("empty update object should fail")(async () => {
    await api.functional.aimall_backend.administrator.faqs.update(connection, {
      faqId: validFaq.id,
      body: {},
    });
  });

  // 5. (No read endpoint available) In a complete test, you would read and assert the FAQ remains unchanged.
}

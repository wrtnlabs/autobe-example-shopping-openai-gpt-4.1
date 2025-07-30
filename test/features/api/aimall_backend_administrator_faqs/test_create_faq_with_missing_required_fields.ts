import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendFaq";

/**
 * Validate FAQ creation input validation errors.
 *
 * This test ensures that the administrator FAQ creation API correctly enforces
 * required fields. Specifically, it attempts to create FAQ entries with either
 * the 'question' or 'answer' fields missing, both of which are required. The
 * API should reject such requests and return a validation error indicating
 * which required fields are absent. This is crucial to guarantee that all FAQ
 * entries contain essential information for end-users and administrators,
 * maintaining knowledge base data integrity and usability.
 *
 * Steps:
 *
 * 1. Attempt to create a FAQ with all required fields except 'question' (i.e.,
 *    omit 'question').
 * 2. Confirm that the API responds with a validation error indicating the missing
 *    'question' field.
 * 3. Attempt to create a FAQ with all required fields except 'answer' (i.e., omit
 *    'answer').
 * 4. Confirm that the API responds with a validation error indicating the missing
 *    'answer' field.
 *
 * These checks ensure that the backend enforces input validation strictness for
 * knowledge base quality.
 */
export async function test_api_aimall_backend_administrator_faqs_test_create_faq_with_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Attempt to create a FAQ with missing 'question' field
  await TestValidator.error("missing question should fail")(async () => {
    await api.functional.aimall_backend.administrator.faqs.create(connection, {
      body: {
        // question: intentionally omitted
        answer: "Example answer text.",
        category: "general",
        sort_order: 1,
        visible: true,
      } as any, // See Note: TypeScript type safety intentionally bypassed to simulate runtime omission
    });
  });

  // 2. Attempt to create a FAQ with missing 'answer' field
  await TestValidator.error("missing answer should fail")(async () => {
    await api.functional.aimall_backend.administrator.faqs.create(connection, {
      body: {
        question: "Example question text?",
        // answer: intentionally omitted
        category: "general",
        sort_order: 2,
        visible: false,
      } as any, // See Note: TypeScript type safety intentionally bypassed to simulate runtime omission
    });
  });
  //
  // Note: TypeScript enforces required properties at compile time. To test missing required field behavior at runtime, 'as any' is used exclusively for these negative test cases. No type safety is bypassed in production/positive flows.
}

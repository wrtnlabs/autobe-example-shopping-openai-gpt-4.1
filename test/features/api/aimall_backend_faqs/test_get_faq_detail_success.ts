import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendFaq";

/**
 * Validate successful retrieval of a single FAQ entity by its UUID.
 *
 * This test ensures that the FAQ retrieval endpoint correctly returns a FAQ
 * record that matches the one inserted via the admin creation API. It covers
 * data integrity, field completeness, and timestamp presence for use in detail
 * views, search, and audit.
 *
 * Step-by-step process:
 *
 * 1. Insert a FAQ entity using the admin API to ensure it exists.
 * 2. Retrieve the FAQ entity using its UUID via the user-facing endpoint.
 * 3. Assert that all fields in the retrieved record match the inserted data,
 *    including question, answer, category, sort_order, visible, and id.
 * 4. Assert that created_at and updated_at are present and ISO8601 strings.
 */
export async function test_api_aimall_backend_faqs_test_get_faq_detail_success(
  connection: api.IConnection,
) {
  // 1. Insert a FAQ entry via admin API
  const faqInput: IAimallBackendFaq.ICreate = {
    question: "What is the best way to reset my password?",
    answer:
      "You can reset your password by clicking the 'Forgot password' link at login.",
    category: "Account",
    sort_order: 10,
    visible: true,
  };

  const createdFaq: IAimallBackendFaq =
    await api.functional.aimall_backend.administrator.faqs.create(connection, {
      body: faqInput,
    });
  typia.assert(createdFaq);

  // 2. Retrieve the FAQ by its UUID via the get-by-id endpoint
  const fetchedFaq: IAimallBackendFaq =
    await api.functional.aimall_backend.faqs.at(connection, {
      faqId: createdFaq.id,
    });
  typia.assert(fetchedFaq);

  // 3. Assert all relevant business fields match what was inserted
  TestValidator.equals("question matches input")(fetchedFaq.question)(
    faqInput.question,
  );
  TestValidator.equals("answer matches input")(fetchedFaq.answer)(
    faqInput.answer,
  );
  TestValidator.equals("category matches input")(fetchedFaq.category)(
    faqInput.category,
  );
  TestValidator.equals("sort_order matches input")(fetchedFaq.sort_order)(
    faqInput.sort_order,
  );
  TestValidator.equals("visible matches input")(fetchedFaq.visible)(
    faqInput.visible,
  );
  TestValidator.equals("id matches inserted")(fetchedFaq.id)(createdFaq.id);

  // 4. Audit/logging: created_at and updated_at should be valid ISO8601 timestamps
  TestValidator.predicate("created_at is a valid ISO 8601 string")(
    !!fetchedFaq.created_at && !isNaN(Date.parse(fetchedFaq.created_at)),
  );
  TestValidator.predicate("updated_at is a valid ISO 8601 string")(
    !!fetchedFaq.updated_at && !isNaN(Date.parse(fetchedFaq.updated_at)),
  );
}

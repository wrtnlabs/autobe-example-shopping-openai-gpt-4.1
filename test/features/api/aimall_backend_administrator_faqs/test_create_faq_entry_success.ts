import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendFaq";

/**
 * Validate the successful creation of a new FAQ entry via administrator
 * endpoint.
 *
 * This test ensures that an administrator can create a FAQ entry with all
 * necessary fields (question, answer, category, visible, sort_order), and that
 * the returned entry contains all expected data per the IAimallBackendFaq
 * entity definition. It also validates that the system stores and returns the
 * FAQ correctly for further usage such as display, filtering, or searching.
 *
 * Steps:
 *
 * 1. Prepare valid FAQ entry data (including question, answer, category, visible
 *    flag, sort_order).
 * 2. Call the administrator FAQ creation endpoint with the sample data.
 * 3. Assert that the returned entity matches all input fields and includes
 *    required system-generated fields (id, created_at, updated_at).
 * 4. (If API methods were available) Validate by fetching FAQ entry list and/or
 *    single FAQ by ID to ensure the record is findable and data is consistent.
 *    (Not implemented if corresponding API endpoints are not available.)
 */
export async function test_api_aimall_backend_administrator_faqs_test_create_faq_entry_success(
  connection: api.IConnection,
) {
  // 1. Prepare valid FAQ creation data
  const testInput = {
    question: "How do I reset my password?",
    answer: "Click the 'Forgot Password' link and follow the instructions.",
    category: "Account Management",
    sort_order: 1,
    visible: true,
  } satisfies IAimallBackendFaq.ICreate;

  // 2. Call create FAQ endpoint
  const createdFaq =
    await api.functional.aimall_backend.administrator.faqs.create(connection, {
      body: testInput,
    });
  typia.assert(createdFaq);

  // 3. Assert returned entity matches input and system-generated fields are present
  TestValidator.equals("question matches")(createdFaq.question)(
    testInput.question,
  );
  TestValidator.equals("answer matches")(createdFaq.answer)(testInput.answer);
  TestValidator.equals("category matches")(createdFaq.category)(
    testInput.category,
  );
  TestValidator.equals("visible matches")(createdFaq.visible)(
    testInput.visible,
  );
  TestValidator.equals("sort_order matches")(createdFaq.sort_order)(
    testInput.sort_order,
  );

  // Check system-generated fields exist
  TestValidator.predicate("id is a uuid")(
    typeof createdFaq.id === "string" && createdFaq.id.length > 0,
  );
  TestValidator.predicate("created_at is present")(
    typeof createdFaq.created_at === "string" &&
      createdFaq.created_at.length > 0,
  );
  TestValidator.predicate("updated_at is present")(
    typeof createdFaq.updated_at === "string" &&
      createdFaq.updated_at.length > 0,
  );

  // 4. Omitted: validate via GET endpoints as not available in provided API.
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendFaq";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendFaq } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendFaq";

/**
 * Validate retrieval of FAQ entries for public display.
 *
 * This test ensures the FAQ listing endpoint returns only entries marked as
 * visible=true for general (non-admin) contexts. All users—guests, customers,
 * and admins—should be able to access the endpoint, but only visible=true FAQs
 * should appear for public (non-admin) consumption.
 *
 * Step-by-step workflow:
 *
 * 1. Insert two FAQ entries as test data: one with visible=true, one with
 *    visible=false.
 * 2. As a guest (unauthenticated), fetch the FAQ list and ensure only visible=true
 *    entries are present, with properly populated fields.
 * 3. Validate required fields on returned FAQ records (question, answer, category,
 *    sort_order, visible, timestamps).
 * 4. Validate at least one visible FAQ is present, and invisible FAQ is excluded.
 * 5. Validate pagination/meta in response.
 */
export async function test_api_aimall_backend_faqs_test_list_faq_entries_success(
  connection: api.IConnection,
) {
  // 1. Insert visible=true FAQ
  const visibleFaq =
    await api.functional.aimall_backend.administrator.faqs.create(connection, {
      body: {
        question: "How do I reset my password?",
        answer:
          "Click 'Forgot Password' on the login screen and follow the instructions.",
        category: "account",
        sort_order: 1,
        visible: true,
      },
    });
  typia.assert(visibleFaq);

  // 2. Insert visible=false FAQ
  const invisibleFaq =
    await api.functional.aimall_backend.administrator.faqs.create(connection, {
      body: {
        question: "Internal: How to access admin logs?",
        answer: "Navigate to /admin/logs section (admin only).",
        category: "internal",
        sort_order: 2,
        visible: false,
      },
    });
  typia.assert(invisibleFaq);

  // 3. As guest, fetch FAQ list
  const guestFaqPage =
    await api.functional.aimall_backend.faqs.index(connection);
  typia.assert(guestFaqPage);
  // All returned FAQs should have visible=true
  for (const faq of guestFaqPage.data) {
    TestValidator.equals("visible is true")(faq.visible)(true);
    // Validate required fields
    TestValidator.predicate("question field exists and is populated")(
      !!faq.question && typeof faq.question === "string",
    );
    TestValidator.predicate("answer field exists and is populated")(
      !!faq.answer && typeof faq.answer === "string",
    );
    TestValidator.predicate("category exists")(
      !!faq.category && typeof faq.category === "string",
    );
    TestValidator.predicate("sort_order is number")(
      typeof faq.sort_order === "number",
    );
    TestValidator.predicate("created_at is ISO string")(
      typeof faq.created_at === "string" && !isNaN(Date.parse(faq.created_at)),
    );
    TestValidator.predicate("updated_at is ISO string")(
      typeof faq.updated_at === "string" && !isNaN(Date.parse(faq.updated_at)),
    );
  }
  // At least one visible FAQ should be present
  TestValidator.predicate("at least one visible FAQ present")(
    guestFaqPage.data.some((faq) => faq.id === visibleFaq.id),
  );
  // The invisible FAQ must NOT be included
  TestValidator.predicate("invisible FAQ not present")(
    guestFaqPage.data.every((faq) => faq.id !== invisibleFaq.id),
  );
  // 4. Validate pagination/meta
  TestValidator.predicate("pagination meta valid")(
    guestFaqPage.pagination &&
      typeof guestFaqPage.pagination.current === "number",
  );
}

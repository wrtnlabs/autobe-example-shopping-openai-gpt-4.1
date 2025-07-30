import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Test creation of a new community post (board/Q&A) by an authenticated
 * customer with valid data.
 *
 * This E2E verifies that when a logged-in customer submits a correctly formed
 * post (title, body, is_private: false):
 *
 * - All required fields for post creation are provided
 * - The returned post record echoes the supplied input with system-generated
 *   fields auto-assigned (id, view count, timestamps)
 * - Customer is auto-attributed as the author (audit field populated)
 * - Created post appears in global post listings
 * - Timestamps and system fields are valid and populated
 *
 * Workflow:
 *
 * 1. Prepare valid input data (title, body, is_private: false)
 * 2. Authenticate as a customer (assume connection is pre-authenticated)
 * 3. Call the post creation endpoint
 * 4. Assert output record matches input and contains system-generated/audit fields
 *    (id, timestamps, customer_id, etc.)
 * 5. Optionally call a post-listing endpoint to verify post presence (SKIP if not
 *    available)
 *
 * Business and type assertions:
 *
 * - Title/body/is_private on output match input
 * - Customer_id present and non-null
 * - Id is valid UUID, created_at/updated_at populated, view_count = 0
 */
export async function test_api_aimall_backend_customer_posts_test_create_post_successfully_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Prepare valid input data for the post
  const input: IAimallBackendPost.ICreate = {
    title: "E2E Test Title - " + RandomGenerator.alphaNumeric(8),
    body: "E2E Test Body - " + RandomGenerator.paragraph()(),
    is_private: false,
  };

  // 2. Create the post as an authenticated customer
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    { body: input },
  );
  typia.assert(post);

  // 3. Assert core business fields match input
  TestValidator.equals("title")(post.title)(input.title);
  TestValidator.equals("body")(post.body)(input.body);
  TestValidator.equals("is_private")(post.is_private)(input.is_private);

  // 4. Check system-generated/audit fields
  TestValidator.predicate("id is UUID")(
    typeof post.id === "string" && /^[0-9a-fA-F-]{36}$/.test(post.id),
  );
  TestValidator.predicate("customer_id present")(!!post.customer_id);
  TestValidator.equals("view_count should be zero")(post.view_count)(0);
  TestValidator.predicate("created_at is ISO date")(
    typeof post.created_at === "string" && /T/.test(post.created_at),
  );
  TestValidator.predicate("updated_at is ISO date")(
    typeof post.updated_at === "string" && /T/.test(post.updated_at),
  );
  TestValidator.equals("deleted_at should be null")(post.deleted_at)(null);
  // No global post list endpoint defined, so skip that verification step.
}

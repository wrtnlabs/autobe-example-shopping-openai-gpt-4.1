import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test: searching attachments by invalid/non-existent postId as customer
 *
 * This test checks that the API correctly returns a 404 Not Found (or similar)
 * error if a customer tries to search/filter attachments on a post UUID that
 * does not exist. It ensures that the search API robustly checks parent
 * existence, and does not leak info or allow orphaned children queries.
 *
 * Steps:
 *
 * 1. Create a random (guaranteed fake) UUID as postId
 * 2. Build a valid IAimallBackendAttachment.IRequest search/filter object
 * 3. Call the endpoint and verify that an error is thrown (404 Not Found or
 *    similar)
 *
 * No dependencies or prior setup are required for this test.
 */
export async function test_api_aimall_backend_customer_posts_attachments_test_search_post_attachments_invalid_post_as_customer(
  connection: api.IConnection,
) {
  // 1. Use a fake random UUID as the non-existent parent postId
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();

  // 2. Prepare a syntactically & semantically valid search filter
  const filter: IAimallBackendAttachment.IRequest = {
    file_type: "image/jpeg",
    file_size_min: 1024,
    file_size_max: 10485760, // up to 10 MB
    limit: 10,
    page: 1,
  };

  // 3. Attempt to query search API and expect error (404 Not Found or equivalent)
  await TestValidator.error(
    "404 error on non-existent postId for attachments search",
  )(async () => {
    await api.functional.aimall_backend.customer.posts.attachments.search(
      connection,
      {
        postId: nonExistentPostId,
        body: filter,
      },
    );
  });
}

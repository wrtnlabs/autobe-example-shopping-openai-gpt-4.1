import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test that a customer can retrieve all attachments for a post they own.
 *
 * This verifies that a customer who creates a post and uploads attachments can
 * later retrieve a complete list of those attachments using the attachments API
 * endpoint. Ensures correct records, metadata, and structure are returned.
 *
 * Steps:
 *
 * 1. Register a customer account using valid registration data.
 * 2. Create a post as that customer (title, body, privacy fields).
 * 3. Add (upload) multiple attachments to the post, each with file URI, MIME, and
 *    size.
 * 4. Retrieve all attachments for the post via the GET /attachments endpoint.
 * 5. Assert that every uploaded attachment is present in the attachments list,
 *    with correct file_uri, file_type, and file_size values.
 * 6. Validate structure and values of pagination metadata.
 */
export async function test_api_aimall_backend_customer_posts_attachments_index(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customerStatus = "active";
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerEmail,
        phone: customerPhone,
        status: customerStatus,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a post as the registered customer
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        title: RandomGenerator.paragraph()(2),
        body: RandomGenerator.content()()(3),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Add multiple attachments to the post
  const uploadedAttachments: IAimallBackendAttachment[] = [];
  const ATTACH_COUNT = 3;
  for (let i = 0; i < ATTACH_COUNT; ++i) {
    const fileUri = `s3://mock-bucket/${post.id}/${typia.random<string & tags.Format<"uuid">>()}.jpg`;
    const fileType = "image/jpeg";
    const fileSize = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<512000>
    >();
    const attachmentCreate = {
      post_id: post.id,
      file_uri: fileUri,
      file_type: fileType,
      file_size: fileSize,
    } satisfies IAimallBackendAttachment.ICreate;
    const attachment =
      await api.functional.aimall_backend.customer.posts.attachments.create(
        connection,
        {
          postId: post.id,
          body: attachmentCreate,
        },
      );
    typia.assert(attachment);
    uploadedAttachments.push(attachment);
  }

  // 4. Retrieve all attachments for the post
  const page =
    await api.functional.aimall_backend.customer.posts.attachments.index(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert(page);

  // 5. Assert every added attachment is present in attachments list with correct values
  for (const expected of uploadedAttachments) {
    const found = page.data.find(
      (att) => att.id === expected.id && att.file_uri === expected.file_uri,
    );
    TestValidator.predicate(
      `Attachment with ID ${expected.id} should exist in GET response`,
    )(!!found);
    if (found) {
      TestValidator.equals("Attachment file type matches")(found.file_type)(
        expected.file_type,
      );
      TestValidator.equals("Attachment file size matches")(found.file_size)(
        expected.file_size,
      );
    }
  }

  // 6. Validate attachments pagination structure
  TestValidator.predicate("Attachments pagination records count matches")(
    page.data.length >= ATTACH_COUNT,
  );
  TestValidator.equals("pagination structure - current page is 1")(
    page.pagination.current,
  )(1);
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller attachment detail access, scope, and permissions.
 *
 * This E2E test demonstrates the end-to-end flow of registering a new seller,
 * uploading an attachment, and accessing the attachment detail as that seller.
 * The test validates that all returned metadata conforms to the
 * IShoppingMallAttachment schema and business rules. It checks correct scope
 * enforcement by confirming the seller cannot fetch attachments uploaded by
 * other sellers and that invalid UUID or deleted IDs are forbidden. It also
 * covers edge case validation, including permission scope boundaries.
 *
 * Steps:
 *
 * 1. Register two sellers with distinct accounts/channels/sections
 * 2. As seller1, upload a file using /shoppingMall/seller/attachments (POST),
 *    recording attachmentId
 * 3. As seller1, fetch details with
 *    /shoppingMall/seller/attachments/{attachmentId} (GET) and validate
 *    response structure and field semantics (file extension/size, CDN URL,
 *    permissions, time fields, etc.)
 * 4. As seller2, attempt to fetch seller1's attachmentId and expect a forbidden
 *    error
 * 5. As seller1, attempt to fetch a non-existent (random) UUID and expect not
 *    found error
 * 6. Validate that permission_scope and public_accessible fields match intended
 *    test setup
 */
export async function test_api_seller_attachment_detail_access_and_role_validation(
  connection: api.IConnection,
) {
  // 1. Register seller1 and seller2 (different channels/sections)
  const channelId1 = typia.random<string & tags.Format<"uuid">>();
  const sectionId1 = typia.random<string & tags.Format<"uuid">>();
  const channelId2 = typia.random<string & tags.Format<"uuid">>();
  const sectionId2 = typia.random<string & tags.Format<"uuid">>();
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller2Email = typia.random<string & tags.Format<"email">>();

  const seller1Join = {
    email: seller1Email,
    password: "SELLER1PASS",
    name: RandomGenerator.name(),
    shopping_mall_channel_id: channelId1,
    shopping_mall_section_id: sectionId1,
    profile_name: RandomGenerator.name(1),
  } satisfies IShoppingMallSeller.IJoin;

  const seller2Join = {
    email: seller2Email,
    password: "SELLER2PASS",
    name: RandomGenerator.name(),
    shopping_mall_channel_id: channelId2,
    shopping_mall_section_id: sectionId2,
    profile_name: RandomGenerator.name(1),
  } satisfies IShoppingMallSeller.IJoin;

  const seller1Auth = await api.functional.auth.seller.join(connection, {
    body: seller1Join,
  });
  typia.assert(seller1Auth);
  await api.functional.auth.seller.join(connection, { body: seller2Join });

  // 2. Seller1 uploads an attachment
  const attachmentBody = {
    filename:
      RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }) +
      ".jpg",
    file_extension: "jpg",
    mime_type: "image/jpeg",
    size_bytes: 10240,
    server_url:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(16),
    public_accessible: false,
    permission_scope: "seller",
    logical_source: "product-image",
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallAttachment.ICreate;
  const created = await api.functional.shoppingMall.seller.attachments.create(
    connection,
    { body: attachmentBody },
  );
  typia.assert(created);

  // 3. Seller1 fetches their own attachment
  const fetched = await api.functional.shoppingMall.seller.attachments.at(
    connection,
    { attachmentId: created.id },
  );
  typia.assert(fetched);
  TestValidator.equals(
    "Fetched attachment matches uploaded",
    fetched.id,
    created.id,
  );
  TestValidator.equals("filename", fetched.filename, attachmentBody.filename);
  TestValidator.equals(
    "server_url format",
    fetched.server_url,
    created.server_url,
  );
  TestValidator.equals("public_accessible", fetched.public_accessible, false);
  TestValidator.equals("permission_scope", fetched.permission_scope, "seller");
  TestValidator.equals(
    "logical_source",
    fetched.logical_source,
    "product-image",
  );
  TestValidator.equals("file extension", fetched.file_extension, "jpg");
  TestValidator.equals("mime type", fetched.mime_type, "image/jpeg");
  TestValidator.equals(
    "description",
    fetched.description,
    attachmentBody.description,
  );
  TestValidator.predicate("size_bytes positive", fetched.size_bytes > 0);
  TestValidator.predicate(
    "created_at has value",
    typeof fetched.created_at === "string" && fetched.created_at.length > 0,
  );

  // 4. As seller2, attempt to read seller1's attachment
  await api.functional.auth.seller.join(connection, { body: seller2Join });
  await TestValidator.error(
    "Seller2 forbidden from reading seller1's attachment",
    async () => {
      await api.functional.shoppingMall.seller.attachments.at(connection, {
        attachmentId: created.id,
      });
    },
  );

  // 5. Seller1 tries to read non-existent attachment
  await api.functional.auth.seller.join(connection, { body: seller1Join });
  const randomAttachmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Not found for random attachmentId", async () => {
    await api.functional.shoppingMall.seller.attachments.at(connection, {
      attachmentId: randomAttachmentId,
    });
  });
}

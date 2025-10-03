import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a newly created seller can upload a file attachment using the
 * seller API, following correct authentication and business logic.
 *
 * Steps:
 *
 * 1. Register a seller with all required onboarding info (join endpoint, provide
 *    at least email, password, name, profile_name, section/catalog/channel ids,
 *    etc.)
 * 2. Ensure authentication is set up for seller (SDK should set token on join)
 * 3. Prepare attachment upload metadata:
 *
 *    - Filename with valid extension (e.g., .jpg, .pdf)
 *    - File_extension and mime_type, consistent (e.g., for jpg: extension=jpg,
 *         mime=image/jpeg)
 *    - Size_bytes a reasonable nonzero value (e.g., couple K or M bytes)
 *    - Server_url (random URL string, should match format)
 *    - Set public_accessible field (true, but could test with false as well)
 *    - Permission_scope (e.g. 'seller'), logical_source (e.g. 'product-image'),
 *         description (free text)
 * 4. Upload attachment via seller attachment API while authenticated
 * 5. Assert response: attachment is created, metadata matches input,
 *    permission/audit fields match (e.g., permission_scope = 'seller'),
 *    download url is present, business logic is satisfied (no extraneous
 *    errors).
 *
 * Edge cases: could repeat with different extensions or public_accessible=false
 * if desired.
 */
export async function test_api_attachment_upload_by_seller_success(
  connection: api.IConnection,
) {
  // 1. Register seller: construct registration payload with all required fields
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    profile_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;

  // Register seller and authenticate
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(seller);

  // Prepare attachment metadata
  const attachmentBody = {
    filename: `catalog-image-${RandomGenerator.alphaNumeric(8)}.jpg`,
    file_extension: "jpg",
    mime_type: "image/jpeg",
    size_bytes: 1024 * 1024, // 1MB
    server_url: `https://cdn.example.com/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
    public_accessible: true,
    permission_scope: "seller",
    logical_source: "product-image",
    description: "Test upload by seller for product image use case.",
  } satisfies IShoppingMallAttachment.ICreate;

  // Upload (should be authenticated via SDK-managed token)
  const attachment =
    await api.functional.shoppingMall.seller.attachments.create(connection, {
      body: attachmentBody,
    });
  typia.assert(attachment);

  // Validate output
  TestValidator.equals(
    "uploaded filename matches input",
    attachment.filename,
    attachmentBody.filename,
  );
  TestValidator.equals(
    "uploaded extension matches",
    attachment.file_extension,
    attachmentBody.file_extension,
  );
  TestValidator.equals(
    "uploaded mime type matches",
    attachment.mime_type,
    attachmentBody.mime_type,
  );
  TestValidator.equals(
    "uploaded size matches",
    attachment.size_bytes,
    attachmentBody.size_bytes,
  );
  TestValidator.equals(
    "public_accessible field honored",
    attachment.public_accessible,
    attachmentBody.public_accessible,
  );
  TestValidator.equals(
    "permission_scope is correct",
    attachment.permission_scope,
    attachmentBody.permission_scope,
  );
  TestValidator.equals(
    "logical_source present",
    attachment.logical_source,
    attachmentBody.logical_source,
  );
  TestValidator.equals(
    "description matches",
    attachment.description,
    attachmentBody.description,
  );
  TestValidator.predicate(
    "server_url is present and valid",
    typeof attachment.server_url === "string" &&
      attachment.server_url.startsWith("https://"),
  );
  TestValidator.predicate(
    "attachment id is present",
    typeof attachment.id === "string" && attachment.id.length > 0,
  );
  TestValidator.predicate(
    "audit timestamps are valid",
    typeof attachment.created_at === "string" &&
      typeof attachment.updated_at === "string",
  );
}

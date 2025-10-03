import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate the end-to-end flow for successful file attachment upload by a newly
 * registered customer.
 *
 * This test scenario ensures the following business logic and requirements:
 *
 * 1. A customer is registered via the public join endpoint for a specific channel
 *    with unique email/phone.
 * 2. The customer is authenticated (with JWT issued on join) to access customer
 *    APIs.
 * 3. The customer uploads an attachment using the
 *    /shoppingMall/customer/attachments endpoint.
 * 4. The uploaded attachment is created with correct metadata fields (filename,
 *    extension, mime_type, server_url, permission_scope, public_accessible,
 *    size_bytes, etc).
 * 5. Attachment permissions, type, and metadata conform to business and audit
 *    rules.
 * 6. The response contains a working server_url and all fields are validated,
 *    including business-level fields like permission_scope.
 */
export async function test_api_attachment_upload_by_customer_success(
  connection: api.IConnection,
) {
  // 1. Register a customer first
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerBody = {
    shopping_mall_channel_id: channelId,
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBody,
    });
  typia.assert(customer);
  // Ensure token acquired
  TestValidator.predicate(
    "customer token issued",
    typeof customer.token?.access === "string" &&
      customer.token.access.length > 0,
  );

  // 2. Upload an attachment as this (authenticated) customer
  const attachmentBody = {
    filename: `${RandomGenerator.alphabets(10)}.jpg`,
    file_extension: "jpg",
    mime_type: "image/jpeg",
    // Use random but reasonable file size (between 12KB - 3MB)
    size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<12000> & tags.Maximum<3000000>
    >(),
    server_url: `https://cdn.shoppingmall.com/${RandomGenerator.alphaNumeric(32)}.jpg`,
    public_accessible: false,
    permission_scope: "customer",
    logical_source: "product-image",
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallAttachment.ICreate;
  const attachment: IShoppingMallAttachment =
    await api.functional.shoppingMall.customer.attachments.create(connection, {
      body: attachmentBody,
    });
  typia.assert(attachment);
  // Validate business-critical metadata
  TestValidator.equals(
    "attachment file extension matches request",
    attachment.file_extension,
    attachmentBody.file_extension,
  );
  TestValidator.equals(
    "attachment MIME type matches request",
    attachment.mime_type,
    attachmentBody.mime_type,
  );
  TestValidator.equals(
    "attachment permission_scope is set",
    attachment.permission_scope,
    attachmentBody.permission_scope,
  );
  TestValidator.equals(
    "attachment logical_source is set",
    attachment.logical_source,
    attachmentBody.logical_source,
  );
  TestValidator.equals(
    "attachment public_accessible is set",
    attachment.public_accessible,
    attachmentBody.public_accessible,
  );
  TestValidator.equals(
    "attachment server_url matches",
    attachment.server_url,
    attachmentBody.server_url,
  );
  // Audit/business fields should be present
  TestValidator.predicate(
    "attachment id is valid uuid",
    typeof attachment.id === "string" && attachment.id.length > 10,
  );
  TestValidator.predicate(
    "server_url looks like URL",
    typeof attachment.server_url === "string" &&
      attachment.server_url.startsWith("https://"),
  );
  TestValidator.predicate(
    "size_bytes is reasonable",
    typeof attachment.size_bytes === "number" &&
      attachment.size_bytes >= 12000 &&
      attachment.size_bytes <= 3000000,
  );
  TestValidator.predicate(
    "attachment created_at is set",
    typeof attachment.created_at === "string" &&
      attachment.created_at.length > 15,
  );
  TestValidator.predicate(
    "attachment mime_type is image/jpeg",
    attachment.mime_type === "image/jpeg",
  );
}

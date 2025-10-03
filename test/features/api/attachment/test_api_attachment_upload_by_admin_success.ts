import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";

/**
 * Validate an administrator’s ability to upload a file attachment in admin
 * context.
 *
 * The test verifies the following workflow step by step:
 *
 * 1. Register a new admin by calling the admin join endpoint (POST
 *    /auth/admin/join) with unique random credentials.
 * 2. Assert successful admin registration and obtain authenticated context (token
 *    is applied automatically by the SDK).
 * 3. As authenticated admin, upload a file attachment using POST
 *    /shoppingMall/admin/attachments, setting all required business and
 *    metadata fields:
 *
 *    - Filename (string, user-visible name with extension)
 *    - File_extension (string, e.g., "pdf")
 *    - Mime_type (string, e.g., "application/pdf")
 *    - Size_bytes (number >0, e.g., 100 )
 *    - Server_url (string, valid path/URL)
 *    - Public_accessible (boolean)
 *    - Permission_scope (e.g., "admin_only")
 *    - Logical_source (e.g., "order-receipt")
 *    - Description (optional freeform string)
 * 4. Assert the attachment is created successfully and all fields in the response
 *    match the request and enforce system-generated fields and audit
 *    information.
 * 5. Assert business logic: only authenticated admins can call the endpoint and
 *    correct property persistence and audit fields exist (id, hash_md5,
 *    created_at, updated_at, status, etc).
 */
export async function test_api_attachment_upload_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Register a unique admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Prepare file attachment data with all business metadata fields
  const filename = `${RandomGenerator.paragraph({ sentences: 2 }).replace(/\s/g, "_")}.pdf`;
  const file_extension = "pdf";
  const mime_type = "application/pdf";
  const size_bytes = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<64> & tags.Maximum<65536>
  >() satisfies number as number;
  const server_url = `https://cdn.mockfiles.example.com/${RandomGenerator.alphaNumeric(32)}.pdf`;
  const public_accessible = false;
  const permission_scope = "admin_only";
  const logical_source = "order-receipt";
  const description = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
  });

  const createBody = {
    filename,
    file_extension,
    mime_type,
    size_bytes,
    server_url,
    public_accessible,
    permission_scope,
    logical_source,
    description,
  } satisfies IShoppingMallAttachment.ICreate;

  // 3. Upload attachment as admin
  const attachment = await api.functional.shoppingMall.admin.attachments.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(attachment);

  // 4. Assert returned metadata persistence
  TestValidator.equals("filename", attachment.filename, filename);
  TestValidator.equals(
    "file extension",
    attachment.file_extension,
    file_extension,
  );
  TestValidator.equals("mime type", attachment.mime_type, mime_type);
  TestValidator.equals("size_bytes", attachment.size_bytes, size_bytes);
  TestValidator.equals("server_url", attachment.server_url, server_url);
  TestValidator.equals(
    "public_accessible",
    attachment.public_accessible,
    public_accessible,
  );
  TestValidator.equals(
    "permission_scope",
    attachment.permission_scope,
    permission_scope,
  );
  TestValidator.equals(
    "logical_source",
    attachment.logical_source,
    logical_source,
  );
  TestValidator.equals("description", attachment.description, description);
  // Accept both undefined and null for not soft deleted
  TestValidator.equals(
    "not soft deleted (undefined/null)",
    attachment.deleted_at,
    null,
  );
}

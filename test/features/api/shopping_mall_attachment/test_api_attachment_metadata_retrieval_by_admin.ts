import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";

/**
 * Validate that an authenticated admin can retrieve full metadata for a file
 * attachment they uploaded.
 *
 * This test covers:
 *
 * - Admin registration & authentication.
 * - Attachment creation/upload and the assignment of all critical metadata.
 * - Retrieval of metadata for that attachment by ID via the admin-only endpoint.
 * - Asserting correctness of all returned fields (filename, extension, mime,
 *   server_url, permissions, logical business source, hash, audit timestamps,
 *   etc.).
 * - Access/permission enforcement: only admin can access this endpoint (cannot
 *   test as non-admin with available APIs, but check contract logic).
 * - Proper error handling: requesting non-existent/deleted attachments yields an
 *   error.
 *
 * Steps:
 *
 * 1. Register a new admin user (for authentication via /auth/admin/join).
 * 2. As this admin, upload a new attachment via /shoppingMall/admin/attachments
 *    (with valid test data).
 * 3. Fetch the attachment's metadata via
 *    /shoppingMall/admin/attachments/{attachmentId}; verify all critical
 *    fields.
 * 4. Attempt to access a random non-existent attachment UUID and ensure error is
 *    thrown.
 * 5. (Optional/Simulated) Mark attachment as deleted (simulate soft delete by
 *    altering deleted_at via test) and assert error or check metadata presence
 *    based on business contract.
 */
export async function test_api_attachment_metadata_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Upload a new attachment as admin
  const createInput = {
    filename: RandomGenerator.paragraph({ sentences: 2 }) + ".txt",
    file_extension: "txt",
    mime_type: "text/plain",
    size_bytes: typia.random<number & tags.Type<"int32">>(),
    server_url: "https://cdn.test.com/" + RandomGenerator.alphaNumeric(20),
    public_accessible: false,
    permission_scope: "admin_only",
    logical_source: "test-attachment",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAttachment.ICreate;

  const attachment = await api.functional.shoppingMall.admin.attachments.create(
    connection,
    { body: createInput },
  );
  typia.assert(attachment);
  // Match returned values
  TestValidator.equals(
    "filename matches",
    attachment.filename,
    createInput.filename,
  );
  TestValidator.equals(
    "file_extension matches",
    attachment.file_extension,
    createInput.file_extension,
  );
  TestValidator.equals(
    "mime_type matches",
    attachment.mime_type,
    createInput.mime_type,
  );
  TestValidator.equals(
    "size_bytes matches",
    attachment.size_bytes,
    createInput.size_bytes,
  );
  TestValidator.equals(
    "server_url matches",
    attachment.server_url,
    createInput.server_url,
  );
  TestValidator.equals(
    "public_accessible matches",
    attachment.public_accessible,
    createInput.public_accessible,
  );
  TestValidator.equals(
    "permission_scope matches",
    attachment.permission_scope,
    createInput.permission_scope,
  );
  TestValidator.equals(
    "logical_source matches",
    attachment.logical_source,
    createInput.logical_source,
  );
  TestValidator.equals(
    "description matches",
    attachment.description,
    createInput.description,
  );

  // 3. Retrieve the attachment metadata by ID and assert all fields
  const fetched = await api.functional.shoppingMall.admin.attachments.at(
    connection,
    {
      attachmentId: attachment.id,
    },
  );
  typia.assert(fetched);
  TestValidator.equals(
    "retrieved attachment id matches",
    fetched.id,
    attachment.id,
  );
  TestValidator.equals(
    "retrieved filename matches",
    fetched.filename,
    createInput.filename,
  );
  TestValidator.equals(
    "retrieved file_extension matches",
    fetched.file_extension,
    createInput.file_extension,
  );
  TestValidator.equals(
    "retrieved mime_type matches",
    fetched.mime_type,
    createInput.mime_type,
  );
  TestValidator.equals(
    "retrieved size_bytes matches",
    fetched.size_bytes,
    createInput.size_bytes,
  );
  TestValidator.equals(
    "retrieved server_url matches",
    fetched.server_url,
    createInput.server_url,
  );
  TestValidator.equals(
    "retrieved public_accessible matches",
    fetched.public_accessible,
    createInput.public_accessible,
  );
  TestValidator.equals(
    "retrieved permission_scope matches",
    fetched.permission_scope,
    createInput.permission_scope,
  );
  TestValidator.equals(
    "retrieved logical_source matches",
    fetched.logical_source,
    createInput.logical_source,
  );
  TestValidator.equals(
    "retrieved description matches",
    fetched.description,
    createInput.description,
  );
  TestValidator.predicate(
    "retrieved hash_md5 present",
    typeof fetched.hash_md5 === "string" && fetched.hash_md5.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    typeof fetched.created_at === "string" && fetched.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    typeof fetched.updated_at === "string" && fetched.updated_at.length > 0,
  );
  // deleted_at is optional and should be null/undefined for new attachments
  TestValidator.equals(
    "deleted_at is null or undefined on new attachment",
    fetched.deleted_at ?? null,
    null,
  );

  // 4. Attempt to fetch a non-existent attachment, expect error
  const randomUuid = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching non-existent attachment should fail",
    async () => {
      await api.functional.shoppingMall.admin.attachments.at(connection, {
        attachmentId: randomUuid,
      });
    },
  );

  // 5. Simulate checking a deleted attachment: this would require a delete API or soft-delete logic—which doesn't exist—so we check that deleted_at remains null by default and skip actual deletion.
}

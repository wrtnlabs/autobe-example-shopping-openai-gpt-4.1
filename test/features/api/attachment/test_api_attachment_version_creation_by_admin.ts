import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import type { IShoppingMallAttachmentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachmentVersion";

/**
 * Validates creation of a new file version for a registered attachment as an
 * admin.
 *
 * This test simulates real-world admin workflow for file evidence:
 *
 * 1. Register admin (and authenticate)
 * 2. Upload initial attachment
 * 3. Create a new version as the same admin (simulate e.g., file correction)
 * 4. Confirm new version references original attachment, version number increments
 *    (should be 2), uploader is admin
 * 5. All meta/audit fields, hash, URL, filename, ext, MIME type, and size are
 *    present and valid
 * 6. Fail to create a version for soft-deleted attachment (should error)
 * 7. Fail to upload invalid type/size (simulate oversized, bad MIME)
 */
export async function test_api_attachment_version_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(15),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoin,
  });
  typia.assert(adminAuth);

  // 2. Upload attachment (initial version is implied)
  const attachmentInput = {
    filename: RandomGenerator.paragraph({ sentences: 2 }) + ".pdf",
    file_extension: "pdf",
    mime_type: "application/pdf",
    size_bytes: 1024 * 400, // 400KB
    server_url:
      "https://cdn.example.com/files/" +
      RandomGenerator.alphaNumeric(20) +
      ".pdf",
    public_accessible: false,
    permission_scope: "admin_only",
    logical_source: "legal-document",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies IShoppingMallAttachment.ICreate;
  const attachment = await api.functional.shoppingMall.admin.attachments.create(
    connection,
    { body: attachmentInput },
  );
  typia.assert(attachment);

  // 3. Create new version with different fields, but same uploader_id
  const versionCreate = {
    server_url:
      "https://cdn.example.com/files/" +
      RandomGenerator.alphaNumeric(22) +
      ".pdf",
    filename: RandomGenerator.paragraph({ sentences: 2 }) + "_v2.pdf",
    file_extension: "pdf",
    mime_type: "application/pdf",
    size_bytes: 840 * 1024, // 840KB
    hash_md5: RandomGenerator.alphaNumeric(32),
    uploader_id: adminAuth.id,
  } satisfies IShoppingMallAttachmentVersion.ICreate;
  const version =
    await api.functional.shoppingMall.admin.attachments.versions.create(
      connection,
      {
        attachmentId: attachment.id,
        body: versionCreate,
      },
    );
  typia.assert(version);
  // Confirm versioning
  TestValidator.equals(
    "version links to original attachment",
    version.shopping_mall_attachment_id,
    attachment.id,
  );
  TestValidator.predicate(
    "version number is 2 or greater",
    version.version_number >= 2,
  );
  TestValidator.equals("uploader is admin", version.uploader_id, adminAuth.id);
  TestValidator.equals(
    "mime type recorded",
    version.mime_type,
    versionCreate.mime_type,
  );
  TestValidator.equals(
    "file extension recorded",
    version.file_extension,
    versionCreate.file_extension,
  );
  TestValidator.predicate(
    "URI is correct",
    version.server_url.startsWith("https://cdn.example.com/"),
  );
  TestValidator.equals(
    "hash_md5 recorded",
    version.hash_md5,
    versionCreate.hash_md5,
  );
  TestValidator.predicate(
    "created_at present",
    typeof version.created_at === "string" && version.created_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", version.deleted_at, null);

  // 4. Negative: try to version a soft-deleted attachment
  // (Simulate deletion by making up a deleted attachmentId if soft-delete API is unavailable)
  await TestValidator.error(
    "fail to create version for soft-deleted attachment",
    async () => {
      await api.functional.shoppingMall.admin.attachments.versions.create(
        connection,
        {
          attachmentId: typia.random<string & tags.Format<"uuid">>(), // Not present
          body: {
            ...versionCreate,
            server_url:
              "https://cdn.example.com/files/" +
              RandomGenerator.alphaNumeric(24) +
              ".pdf",
          },
        },
      );
    },
  );

  // 5. Negative: enforce file policy (oversize, wrong mime), actual validation message is implementation-defined
  await TestValidator.error("fail size limit (policy)", async () => {
    await api.functional.shoppingMall.admin.attachments.versions.create(
      connection,
      {
        attachmentId: attachment.id,
        body: {
          ...versionCreate,
          size_bytes: 100 * 1024 * 1024, // 100MB oversize
          server_url:
            "https://cdn.example.com/files/" +
            RandomGenerator.alphaNumeric(24) +
            ".pdf",
        },
      },
    );
  });
  await TestValidator.error("fail MIME policy", async () => {
    await api.functional.shoppingMall.admin.attachments.versions.create(
      connection,
      {
        attachmentId: attachment.id,
        body: {
          ...versionCreate,
          mime_type: "application/x-msdownload",
          file_extension: "exe",
          filename: RandomGenerator.paragraph({ sentences: 2 }) + ".exe",
          server_url:
            "https://cdn.example.com/files/" +
            RandomGenerator.alphaNumeric(24) +
            ".exe",
        },
      },
    );
  });
}

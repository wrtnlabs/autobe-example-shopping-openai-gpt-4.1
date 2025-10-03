import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import type { IShoppingMallAttachmentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachmentVersion";

/**
 * Test retrieval of a specific attachment version's metadata as an admin.
 *
 * - Authenticate as admin
 * - Create an attachment
 * - Upload multiple versions with distinct metadata to the attachment (simulate
 *   update history)
 * - For each uploaded version, fetch the details through GET
 *   /shoppingMall/admin/attachments/{attachmentId}/versions/{versionId}
 * - Assert all response fields match the expected metadata
 * - Attempt to fetch a version with non-existing versionId for the valid
 *   attachment (expect error)
 * - Switch to a new unauthenticated context and attempt access (expect error)
 */
export async function test_api_admin_attachment_version_detail_access(
  connection: api.IConnection,
) {
  // 1. Register admin and authenticate
  const adminEmail = `${RandomGenerator.alphabets(8)}@company.com`;
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  // 2. Create attachment
  const attachmentCreate = {
    filename: RandomGenerator.name(2) + ".pdf",
    file_extension: "pdf",
    mime_type: "application/pdf",
    size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<2000000>
    >(),
    server_url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}.pdf`,
    public_accessible: false,
    permission_scope: "admin_only",
    logical_source: "test-e2e",
    description: "E2E attachment description",
  } satisfies IShoppingMallAttachment.ICreate;
  const attachment = await api.functional.shoppingMall.admin.attachments.create(
    connection,
    { body: attachmentCreate },
  );
  typia.assert(attachment);
  // 3. Upload versions (simulate versioning)
  const versions: IShoppingMallAttachmentVersion[] = [];
  for (let i = 1; i <= 3; ++i) {
    const versionCreate = {
      server_url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(16)}_v${i}.pdf`,
      filename: RandomGenerator.name(2) + `_v${i}.pdf`,
      file_extension: ".pdf",
      mime_type: "application/pdf",
      size_bytes: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<2000000>
      >(),
      hash_md5: RandomGenerator.alphaNumeric(32),
      uploader_id: adminAuth.id,
    } satisfies IShoppingMallAttachmentVersion.ICreate;
    const version =
      await api.functional.shoppingMall.admin.attachments.versions.create(
        connection,
        { attachmentId: attachment.id, body: versionCreate },
      );
    typia.assert(version);
    // Keep for later comparison
    versions.push(version);
  }
  // 4. For each version, fetch and assert equality
  for (const expected of versions) {
    const detail =
      await api.functional.shoppingMall.admin.attachments.versions.at(
        connection,
        {
          attachmentId: expected.shopping_mall_attachment_id,
          versionId: expected.id,
        },
      );
    typia.assert(detail);
    TestValidator.equals(
      "attachment version detail should match uploaded version",
      detail,
      expected,
      (key) => key === "created_at" || key === "deleted_at",
    );
    TestValidator.predicate(
      "created_at must be ISO8601 date-time string",
      typeof detail.created_at === "string" &&
        !isNaN(Date.parse(detail.created_at)),
    );
  }
  // 5. Attempt to fetch bogus versionId (should fail)
  const fakeVersionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "attachment version fetch with nonexistent versionId should throw",
    async () => {
      await api.functional.shoppingMall.admin.attachments.versions.at(
        connection,
        { attachmentId: attachment.id, versionId: fakeVersionId },
      );
    },
  );
  // 6. Try unauthenticated context (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated access to admin version endpoint should be forbidden",
    async () => {
      await api.functional.shoppingMall.admin.attachments.versions.at(
        unauthConn,
        { attachmentId: attachment.id, versionId: versions[0].id },
      );
    },
  );
}

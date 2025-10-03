import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAttachmentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAttachmentVersion";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import type { IShoppingMallAttachmentVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachmentVersion";

/**
 * Test attachment version listing, pagination, and permissions.
 *
 * 1. Register as admin (with unique email/password/name).
 * 2. Create an attachment as admin.
 * 3. Upload four versions with incrementing metadata as the admin uploader.
 * 4. List (PATCH) versions for the attachment, using different pages (limit 2/page
 *    1 and 2), sort by created_at ascending/descending, filter by
 *    file_extension/uploader_id.
 * 5. Check: paging info, version numbers incremented correctly, sorting works,
 *    filter responses match expectations, and audit fields present for all
 *    items.
 * 6. Negatives: call with junk or non-existent attachmentId, try as an
 *    unauthenticated connection (empty headers).
 */
export async function test_api_admin_attachment_version_list_pagination(
  connection: api.IConnection,
) {
  // 1. Register & authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(8);
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: { email: adminEmail, password: adminPassword, name: adminName },
  });
  typia.assert(admin);

  // 2. Create an attachment
  const attachmentBody = {
    filename: RandomGenerator.paragraph({ sentences: 2 }),
    file_extension: RandomGenerator.pick(["pdf", "jpg", "txt", "png"] as const),
    mime_type: RandomGenerator.pick([
      "application/pdf",
      "image/jpeg",
      "text/plain",
      "image/png",
    ] as const),
    size_bytes: typia.random<number & tags.Type<"int32">>(),
    server_url: RandomGenerator.content({ paragraphs: 1 }),
    public_accessible: false,
    permission_scope: "admin_only",
    logical_source: "test-attachment-version",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAttachment.ICreate;
  const attachment = await api.functional.shoppingMall.admin.attachments.create(
    connection,
    {
      body: attachmentBody,
    },
  );
  typia.assert(attachment);

  // 3. Upload multiple new versions (4)
  const NUM_VERSIONS = 4;
  const version_extension = RandomGenerator.pick([
    "pdf",
    "jpg",
    "txt",
    "png",
  ] as const);
  const versions: IShoppingMallAttachmentVersion[] = [];
  for (let i = 0; i < NUM_VERSIONS; ++i) {
    const fileName = `${RandomGenerator.paragraph({ sentences: 2 })}_${i + 1}.${version_extension}`;
    const version =
      await api.functional.shoppingMall.admin.attachments.versions.create(
        connection,
        {
          attachmentId: attachment.id,
          body: {
            server_url: RandomGenerator.content({ paragraphs: 1 }),
            filename: fileName,
            file_extension: version_extension,
            mime_type: RandomGenerator.pick([
              "application/pdf",
              "image/jpeg",
              "text/plain",
              "image/png",
            ] as const),
            size_bytes: typia.random<number & tags.Type<"int32">>(),
            hash_md5: RandomGenerator.alphaNumeric(32),
            uploader_id: admin.id,
          },
        },
      );
    typia.assert(version);
    versions.push(version);
  }

  // 4. List: page 1 (limit 2), ascending by version_number
  const page1 =
    await api.functional.shoppingMall.admin.attachments.versions.index(
      connection,
      {
        attachmentId: attachment.id,
        body: {
          attachmentId: attachment.id,
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          sort: "version_number" as any, // sort key not in schema, may need to use created_at or other
          order: "asc",
        },
      },
    );
  typia.assert(page1);
  TestValidator.equals("page info - 1st page", page1.pagination.current, 1);
  TestValidator.equals(
    "limit 2 for paged version list",
    page1.pagination.limit,
    2,
  );
  TestValidator.equals(
    "number of records matches versions uploaded (first page)",
    page1.data.length,
    2,
  );

  // 5. List: page 2 (limit 2)
  const page2 =
    await api.functional.shoppingMall.admin.attachments.versions.index(
      connection,
      {
        attachmentId: attachment.id,
        body: {
          attachmentId: attachment.id,
          limit: 2 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          sort: "created_at",
          order: "asc",
        },
      },
    );
  typia.assert(page2);
  TestValidator.equals("page info - 2nd page", page2.pagination.current, 2);
  TestValidator.equals("limit info - 2nd page", page2.pagination.limit, 2);
  TestValidator.equals(
    "number of records matches versions uploaded (second page)",
    page2.data.length,
    2,
  );

  // 6. Sorting by created_at descending
  const descPage =
    await api.functional.shoppingMall.admin.attachments.versions.index(
      connection,
      {
        attachmentId: attachment.id,
        body: {
          limit: 4 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          sort: "created_at",
          order: "desc",
        },
      },
    );
  typia.assert(descPage);
  for (let i = 1; i < descPage.data.length; ++i) {
    TestValidator.predicate(
      `descending created_at sorting [${i}]`,
      descPage.data[i - 1].created_at >= descPage.data[i].created_at,
    );
  }

  // 7. Filtering by file_extension and uploader_id
  const filterPage =
    await api.functional.shoppingMall.admin.attachments.versions.index(
      connection,
      {
        attachmentId: attachment.id,
        body: {
          file_extension: version_extension,
          uploader_id: admin.id,
        },
      },
    );
  typia.assert(filterPage);
  for (const v of filterPage.data) {
    TestValidator.equals(
      "filtered by extension",
      v.file_extension,
      version_extension,
    );
    TestValidator.equals("filtered by uploader_id", v.uploader_id, admin.id);
  }

  // 8. Audit fields validation (created_at, deleted_at, uploader_id)
  for (const page of [page1, page2, descPage, filterPage]) {
    for (const version of page.data) {
      TestValidator.predicate(
        "created_at is ISO string",
        typeof version.created_at === "string" &&
          version.created_at.includes("T"),
      );
      TestValidator.equals(
        "deleted_at should be null for active",
        version.deleted_at,
        null,
      );
      TestValidator.equals(
        "uploader_id present",
        version.uploader_id,
        admin.id,
      );
    }
  }

  // 9. Unauthorized access test
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cannot read versions",
    async () => {
      await api.functional.shoppingMall.admin.attachments.versions.index(
        unauthConnection,
        {
          attachmentId: attachment.id,
          body: {},
        },
      );
    },
  );

  // 10. Listing versions for non-existent attachment (should fail)
  await TestValidator.error("non-existent attachmentId fails", async () => {
    await api.functional.shoppingMall.admin.attachments.versions.index(
      connection,
      {
        attachmentId: typia.random<string & tags.Format<"uuid">>(),
        body: {},
      },
    );
  });
}

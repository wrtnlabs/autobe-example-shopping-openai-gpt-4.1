import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAttachment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";

/**
 * Validate admin-listing of file attachments, search/filter, pagination, and
 * authorization.
 *
 * 1. Register a new admin user, storing session token.
 * 2. Upload (create) at least one attachment with distinct metadata—filename,
 *    extension, mime_type, logical_source, permission_scope (for filter
 *    scenarios).
 * 3. Use PATCH /shoppingMall/admin/attachments with: a. No filter (should list all
 *    attachments, check pagination object) b. Filename partial filter (searches
 *    by partial match) c. File extension filter d. Mime type filter e. Logical
 *    source filter f. Permission scope filter g. deleted_at: false (only
 *    non-deleted) h. deleted_at: true (simulate by first uploading and then
 *    soft 'deleting' if endpoint exists, else ensure logic supports this) i.
 *    Pagination: use small limit, check total/count j. Sorting: use sort by
 *    filename ascending/descending (if supported)
 * 4. Attempt filter/search with malformed body (e.g. limit > 100), verify error.
 * 5. Make search request without admin token (simulate unauthorized), expect
 *    error.
 * 6. For every positive filter, verify results match only expected attachments and
 *    all key filter fields match expectations.
 */
export async function test_api_admin_attachment_list_with_filters_and_authorization(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  };
  const adminSession: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreds,
    });
  typia.assert(adminSession);

  // 2. Upload (create) a few attachments with tagged test metadata
  const logicalSources = [
    "product-image",
    "order-receipt",
    "evidence",
    "board_post",
  ] as const;
  const permissionScopes = [
    "admin_only",
    "seller",
    "customer",
    "public",
  ] as const;

  const attachments: IShoppingMallAttachment[] = [];
  for (let i = 0; i < 3; ++i) {
    const body = {
      filename: `testfile_${i}_${RandomGenerator.alphaNumeric(6)}.dat`,
      file_extension: ["jpg", "pdf", "png", "txt"][i % 4],
      mime_type: ["image/jpeg", "application/pdf", "image/png", "text/plain"][
        i % 4
      ],
      size_bytes: typia.random<number & tags.Type<"int32">>(),
      server_url: `https://cdn.test/${RandomGenerator.alphaNumeric(20)}`,
      public_accessible: i % 2 === 0,
      permission_scope: RandomGenerator.pick(permissionScopes),
      logical_source: RandomGenerator.pick(logicalSources),
      description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallAttachment.ICreate;
    const created = await api.functional.shoppingMall.admin.attachments.create(
      connection,
      { body },
    );
    typia.assert(created);
    attachments.push(created);
  }

  // 3.a. No filter: should return all attachments (default pagination)
  let resp = await api.functional.shoppingMall.admin.attachments.index(
    connection,
    { body: {} },
  );
  typia.assert(resp);
  TestValidator.predicate(
    "all test attachments present with no filter",
    attachments.every((a) => resp.data.some((r) => r.id === a.id)),
  );

  // 3.b-f. Test all positive filters individually
  const sample = attachments[0];
  const filterChecks = [
    {
      title: "filename partial filter",
      body: { filename: sample.filename.slice(0, 7) },
    },
    {
      title: "file extension filter",
      body: { file_extension: sample.file_extension },
    },
    { title: "mime type filter", body: { mime_type: sample.mime_type } },
    {
      title: "logical source filter",
      body: { logical_source: sample.logical_source },
    },
    {
      title: "permission scope filter",
      body: { permission_scope: sample.permission_scope },
    },
  ];
  for (const f of filterChecks) {
    resp = await api.functional.shoppingMall.admin.attachments.index(
      connection,
      { body: f.body },
    );
    typia.assert(resp);
    TestValidator.predicate(
      `${f.title} returns expected attachment(s)`,
      resp.data.some((a) => a.id === sample.id),
    );
    // all returned must match criteria (loose equality for filename partial)
    if (f.body.filename) {
      TestValidator.predicate(
        "all attachments match filename partial",
        resp.data.every((a) => a.filename.includes(f.body.filename!)),
      );
    } else if (f.body.file_extension) {
      TestValidator.predicate(
        "all attachments match file_extension",
        resp.data.every((a) => a.file_extension === f.body.file_extension),
      );
    } else if (f.body.mime_type) {
      TestValidator.predicate(
        "all attachments match mime_type",
        resp.data.every((a) => a.mime_type === f.body.mime_type),
      );
    } else if (f.body.logical_source) {
      TestValidator.predicate(
        "all attachments match logical_source",
        resp.data.every((a) => a.logical_source === f.body.logical_source),
      );
    } else if (f.body.permission_scope) {
      TestValidator.predicate(
        "all attachments match permission_scope",
        resp.data.every((a) => a.permission_scope === f.body.permission_scope),
      );
    }
  }

  // 3.g. deleted_at: false (should only show non-deleted)
  resp = await api.functional.shoppingMall.admin.attachments.index(connection, {
    body: { deleted_at: false },
  });
  typia.assert(resp);
  TestValidator.predicate(
    "all returned attachments not soft-deleted",
    resp.data.every((a) => !a.deleted_at),
  );

  // 3.i. Pagination, limit 1
  resp = await api.functional.shoppingMall.admin.attachments.index(connection, {
    body: { limit: 1 },
  });
  typia.assert(resp);
  TestValidator.equals("pagination returns only 1 record", resp.data.length, 1);
  TestValidator.predicate(
    "pagination info present",
    typeof resp.pagination.current === "number" &&
      typeof resp.pagination.limit === "number",
  );

  // 3.j. Sorting by filename asc/desc (if supported)
  for (const sort of ["filename asc", "filename desc"]) {
    resp = await api.functional.shoppingMall.admin.attachments.index(
      connection,
      { body: { sort } },
    );
    typia.assert(resp);
    const sorted = [...resp.data].sort((a, b) =>
      sort.endsWith("asc")
        ? a.filename.localeCompare(b.filename)
        : b.filename.localeCompare(a.filename),
    );
    TestValidator.equals(
      `attachments sorted by ${sort}`,
      resp.data.map((a) => a.id),
      sorted.map((a) => a.id),
    );
  }

  // 4. Malformed filter: limit > 100
  await TestValidator.error("limit > 100 triggers error", async () => {
    await api.functional.shoppingMall.admin.attachments.index(connection, {
      body: { limit: 500 },
    });
  });

  // 5. Unauthorized search attempt: new connection without admin token
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized search attempt fails", async () => {
    await api.functional.shoppingMall.admin.attachments.index(unauthConn, {
      body: {},
    });
  });
}

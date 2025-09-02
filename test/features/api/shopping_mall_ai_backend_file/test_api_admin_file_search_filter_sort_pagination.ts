import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFile";
import type { IPageIShoppingMallAiBackendFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_file_search_filter_sort_pagination(
  connection: api.IConnection,
) {
  /**
   * Validate admin file search/filter/sort/pagination functionality.
   *
   * 1. Register two admins and store their info for file ownership diversity.
   * 2. Register several files with varying mime_types, original_filenames, and
   *    uploaded_at times, distributed among both admins.
   * 3. Run file search with different combinations of filter fields:
   *
   *    - Mime_type
   *    - Uploaded_by_id
   *    - Partial original_filename
   *    - Uploaded_at_from/to
   *    - Default (only non-deleted files)
   *    - Deleted:true (get only deleted)
   *    - Pagination (page/limit)
   *    - Sorting (asc/desc)
   * 4. Assert that responses match filter, pagination, and sort expectations.
   * 5. Test invalid query (e.g. nonsense date), expect error.
   * 6. Test unauthorized/unauthenticated access is denied.
   */

  // 1. Register two admin users for diversity in uploaded_by_id
  const admin1Username = RandomGenerator.alphabets(8);
  const admin1: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: admin1Username,
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(),
        email: `${admin1Username}@acme.com` as string & tags.Format<"email">,
        is_active: true,
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin1);
  const admin1Id = admin1.admin.id;

  // Register a second admin
  const admin2Username = RandomGenerator.alphabets(8);
  const admin2Conn: api.IConnection = { ...connection, headers: {} };
  const admin2: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(admin2Conn, {
      body: {
        username: admin2Username,
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(),
        email: `${admin2Username}@acme.com` as string & tags.Format<"email">,
        is_active: true,
        phone_number: RandomGenerator.mobile(),
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin2);
  const admin2Id = admin2.admin.id;

  // Main test admin (admin1) context
  connection.headers ??= {};
  connection.headers.Authorization = admin1.token.access;

  // Timespans for uploads
  const now = new Date();
  const msInDay = 24 * 60 * 60 * 1000;

  // Controlled file properties for search assertions
  const fileVariants = [
    {
      original_filename: "report-final.pdf",
      mime_type: "application/pdf",
      uploaded_by_id: admin1Id,
      uploaded_at: new Date(
        now.getTime() - msInDay * 5,
      ).toISOString() as string & tags.Format<"date-time">,
    },
    {
      original_filename: "sunrise.jpg",
      mime_type: "image/jpeg",
      uploaded_by_id: admin1Id,
      uploaded_at: new Date(
        now.getTime() - msInDay * 4,
      ).toISOString() as string & tags.Format<"date-time">,
    },
    {
      original_filename: "logdump.txt",
      mime_type: "text/plain",
      uploaded_by_id: admin2Id,
      uploaded_at: new Date(
        now.getTime() - msInDay * 3,
      ).toISOString() as string & tags.Format<"date-time">,
    },
    {
      original_filename: "specs.xlsx",
      mime_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      uploaded_by_id: admin2Id,
      uploaded_at: new Date(
        now.getTime() - msInDay * 2,
      ).toISOString() as string & tags.Format<"date-time">,
    },
    {
      original_filename: "image.png",
      mime_type: "image/png",
      uploaded_by_id: admin1Id,
      uploaded_at: new Date(now.getTime() - msInDay).toISOString() as string &
        tags.Format<"date-time">,
    },
  ];

  // 2. Register the files
  const createdFiles: IShoppingMallAiBackendFile[] = [];
  for (const v of fileVariants) {
    const f = await api.functional.shoppingMallAiBackend.admin.files.create(
      connection,
      {
        body: {
          original_filename: v.original_filename,
          mime_type: v.mime_type,
          storage_uri: `s3://acme-bucket/${RandomGenerator.alphaNumeric(16)}`,
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<10000000>
          >(),
          uploaded_by_id: v.uploaded_by_id,
          uploaded_at: v.uploaded_at,
        } satisfies IShoppingMallAiBackendFile.ICreate,
      },
    );
    typia.assert(f);
    createdFiles.push(f);
  }

  // Soft-delete one file for deleted tests
  // (Simulate soft-delete by directly editing in test array. True API soft-delete endpoint assumed elsewhere.)
  const softDeletedFile = createdFiles[2];
  if (softDeletedFile) {
    softDeletedFile.deleted_at = new Date().toISOString() as string &
      tags.Format<"date-time">;
  }

  // 3. Test: filter by mime_type (e.g. image/png)
  const fileOfTypeRes =
    await api.functional.shoppingMallAiBackend.admin.files.index(connection, {
      body: {
        mime_type: "image/png",
      } satisfies IShoppingMallAiBackendFile.IRequest,
    });
  typia.assert(fileOfTypeRes);
  TestValidator.predicate(
    "filter by mime_type returns only image/png",
    fileOfTypeRes.data.every((f) => f.mime_type === "image/png"),
  );

  // filter by uploaded_by_id
  const uploadedBy1Res =
    await api.functional.shoppingMallAiBackend.admin.files.index(connection, {
      body: {
        uploaded_by_id: admin1Id,
      } satisfies IShoppingMallAiBackendFile.IRequest,
    });
  typia.assert(uploadedBy1Res);
  TestValidator.predicate(
    "filter by uploaded_by_id returns only files from admin1",
    uploadedBy1Res.data.every(
      (f) =>
        createdFiles.find((cf) => cf.id === f.id)?.uploaded_by_id === admin1Id,
    ),
  );

  // filter by partial original_filename (substring)
  const substr = "report";
  const partialNameRes =
    await api.functional.shoppingMallAiBackend.admin.files.index(connection, {
      body: {
        original_filename: substr,
      } satisfies IShoppingMallAiBackendFile.IRequest,
    });
  typia.assert(partialNameRes);
  TestValidator.predicate(
    "filename substring filter returns only files containing substring",
    partialNameRes.data.every((f) => f.original_filename.includes(substr)),
  );

  // filter by date range
  // Use the earliest and latest uploaded_at from controlled set
  const fromDate = fileVariants[1].uploaded_at;
  const toDate = fileVariants[3].uploaded_at;
  const dateRangeRes =
    await api.functional.shoppingMallAiBackend.admin.files.index(connection, {
      body: {
        uploaded_at_from: fromDate,
        uploaded_at_to: toDate,
      } satisfies IShoppingMallAiBackendFile.IRequest,
    });
  typia.assert(dateRangeRes);
  TestValidator.predicate(
    "date-range filter returns only files within range",
    dateRangeRes.data.every(
      (f) => f.uploaded_at >= fromDate && f.uploaded_at <= toDate,
    ),
  );

  // Validate default filter excludes deleted files
  const allRes = await api.functional.shoppingMallAiBackend.admin.files.index(
    connection,
    {
      body: {
        // No filter, should exclude soft-deleted
      } satisfies IShoppingMallAiBackendFile.IRequest,
    },
  );
  typia.assert(allRes);
  TestValidator.predicate(
    "default excludes deleted files",
    allRes.data.every((f) => !f.deleted_at),
  );

  // Include only deleted files
  const deletedOnlyRes =
    await api.functional.shoppingMallAiBackend.admin.files.index(connection, {
      body: {
        deleted: true,
      } satisfies IShoppingMallAiBackendFile.IRequest,
    });
  typia.assert(deletedOnlyRes);
  TestValidator.predicate(
    "deleted only shows only files with deleted_at",
    deletedOnlyRes.data.every((f) => !!f.deleted_at),
  );

  // Pagination test: limit = 2, page = 2
  const pagedRes = await api.functional.shoppingMallAiBackend.admin.files.index(
    connection,
    {
      body: {
        page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 2 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<500>,
        sort: "uploaded_at:asc",
      } satisfies IShoppingMallAiBackendFile.IRequest,
    },
  );
  typia.assert(pagedRes);
  TestValidator.equals(
    "pagination returns correct count",
    pagedRes.data.length,
    Math.min(2, allRes.pagination.records - 2),
  );
  TestValidator.equals(
    "pagination: correct page field",
    pagedRes.pagination.current,
    2 as number & tags.Type<"int32">,
  );

  // Sort test: uploaded_at:desc/asc
  const sortDescRes =
    await api.functional.shoppingMallAiBackend.admin.files.index(connection, {
      body: {
        sort: "uploaded_at:desc",
        limit: 3 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<500>,
      } satisfies IShoppingMallAiBackendFile.IRequest,
    });
  typia.assert(sortDescRes);
  TestValidator.predicate(
    "sort desc order",
    sortDescRes.data.every(
      (f, i, arr) => i === 0 || f.uploaded_at <= arr[i - 1].uploaded_at,
    ),
  );

  const sortAscRes =
    await api.functional.shoppingMallAiBackend.admin.files.index(connection, {
      body: {
        sort: "uploaded_at:asc",
        limit: 3 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<500>,
      } satisfies IShoppingMallAiBackendFile.IRequest,
    });
  typia.assert(sortAscRes);
  TestValidator.predicate(
    "sort asc order",
    sortAscRes.data.every(
      (f, i, arr) => i === 0 || f.uploaded_at >= arr[i - 1].uploaded_at,
    ),
  );

  // 5. Error validation: invalid filter value (e.g. bad date)
  await TestValidator.error(
    "invalid uploaded_at_from value throws error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.files.index(connection, {
        body: {
          uploaded_at_from: "not-a-date" as string & tags.Format<"date-time">,
        } satisfies IShoppingMallAiBackendFile.IRequest,
      });
    },
  );

  // 6. Unauthorized user cannot access endpoint
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot list admin files",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.files.index(unauthConn, {
        body: {} satisfies IShoppingMallAiBackendFile.IRequest,
      });
    },
  );
}

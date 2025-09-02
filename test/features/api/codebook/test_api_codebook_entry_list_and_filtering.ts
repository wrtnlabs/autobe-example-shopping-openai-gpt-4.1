import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";
import type { IShoppingMallAiBackendCodebookEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebookEntry";
import type { IPageIShoppingMallAiBackendCodebookEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCodebookEntry";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_codebook_entry_list_and_filtering(
  connection: api.IConnection,
) {
  /**
   * Validate retrieval and advanced filtering of codebook entries.
   *
   * This test covers the following business workflow:
   *
   * 1. Register and authenticate an admin account.
   * 2. Create a new codebook and seed it with multiple entries, each with unique
   *    code, label, order, and visibility.
   * 3. Create a separate codebook with entries (negative control) to ensure
   *    cross-codebook isolation.
   * 4. Test listing all entries in the main codebook (no filters).
   * 5. Test pagination with limit and verify pagination state/result ordering.
   * 6. Test filtering by code (exact), label (partial), and visible (true/false).
   * 7. Test combination filters (code + visible).
   * 8. Confirm that only entries from the correct codebook are returned per query,
   *    with types and logic validated.
   */
  // 1. Register and authenticate admin
  const adminUsername = RandomGenerator.alphabets(8);
  const adminEmail = `${RandomGenerator.alphabets(8)}@mall.com`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminResult = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword, // In real env, hash - test accepts raw
      name: adminName,
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminResult);

  // 2. Create target codebook and secondary (negative control)
  const codebookCode = RandomGenerator.alphabets(6);
  const codebookName = RandomGenerator.name();
  const codebook =
    await api.functional.shoppingMallAiBackend.admin.codebooks.create(
      connection,
      {
        body: {
          code: codebookCode,
          name: codebookName,
        } satisfies IShoppingMallAiBackendCodebook.ICreate,
      },
    );
  typia.assert(codebook);

  const codebook2 =
    await api.functional.shoppingMallAiBackend.admin.codebooks.create(
      connection,
      {
        body: {
          code: `${codebookCode}_other`,
          name: `${codebookName} secondary`,
        } satisfies IShoppingMallAiBackendCodebook.ICreate,
      },
    );
  typia.assert(codebook2);

  // 3. Seed entries for main codebook:
  const entrySeed: Array<{
    code: string;
    label: string;
    visible: boolean;
    order: number;
    description: string;
  }> = [
    {
      code: "ACTIVE",
      label: "Active Status",
      visible: true,
      order: 1,
      description: "Shows as active",
    },
    {
      code: "HIDDEN",
      label: "Hidden State",
      visible: false,
      order: 2,
      description: "Not shown to users",
    },
    {
      code: "ARCHIVE",
      label: "Archive Option",
      visible: true,
      order: 3,
      description: "Entry is archived",
    },
    {
      code: "QUARANTINE",
      label: "Quarantine",
      visible: false,
      order: 4,
      description: "Quarantined temporarily",
    },
  ];
  const mainEntries: IShoppingMallAiBackendCodebookEntry[] = [];
  for (const seed of entrySeed) {
    const entry =
      await api.functional.shoppingMallAiBackend.admin.codebooks.entries.create(
        connection,
        {
          codebookId: codebook.id,
          body: {
            code: seed.code,
            label: seed.label,
            description: seed.description,
            order: seed.order,
            visible: seed.visible,
          } satisfies IShoppingMallAiBackendCodebookEntry.ICreate,
        },
      );
    typia.assert(entry);
    mainEntries.push(entry);
  }
  // 4. Seed entries for control codebook
  const controlEntry =
    await api.functional.shoppingMallAiBackend.admin.codebooks.entries.create(
      connection,
      {
        codebookId: codebook2.id,
        body: {
          code: "CONTROL",
          label: "Control Entry",
          order: 1,
          visible: true,
          description: "Belongs to another codebook",
        } satisfies IShoppingMallAiBackendCodebookEntry.ICreate,
      },
    );
  typia.assert(controlEntry);

  // 5. List all entries for codebookId, no filters
  const pageAll =
    await api.functional.shoppingMallAiBackend.admin.codebooks.entries.index(
      connection,
      {
        codebookId: codebook.id,
        body: {
          codebookId: codebook.id,
        } satisfies IShoppingMallAiBackendCodebookEntry.IRequest,
      },
    );
  typia.assert(pageAll);
  TestValidator.equals(
    "all codebook entries present (main codebook, no filter)",
    pageAll.data.length,
    mainEntries.length,
  );
  // Confirm all listed are from the target codebook and codes/labels match seeds
  const foundCodes = pageAll.data.map((x) => x.code).sort();
  const expectedCodes = mainEntries.map((x) => x.code).sort();
  TestValidator.equals("entry codes match seeds", foundCodes, expectedCodes);
  for (const summary of pageAll.data) {
    typia.assert(summary);
    TestValidator.equals(
      "codebook id matches on entry",
      summary.code,
      mainEntries.find((e) => e.code === summary.code)!.code,
    );
  }
  // Confirm entries from control codebook do NOT appear
  TestValidator.notEquals("control codebook entry not included", foundCodes, [
    controlEntry.code,
  ]);

  // 6. Test pagination (limit=2)
  const page1 =
    await api.functional.shoppingMallAiBackend.admin.codebooks.entries.index(
      connection,
      {
        codebookId: codebook.id,
        body: {
          codebookId: codebook.id,
          page: 1,
          limit: 2,
        } satisfies IShoppingMallAiBackendCodebookEntry.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page size matches limit", page1.data.length, 2);
  TestValidator.equals("pagination current is 1", page1.pagination.current, 1);
  TestValidator.equals("pagination limit matches", page1.pagination.limit, 2);
  TestValidator.equals(
    "pagination total records",
    page1.pagination.records,
    mainEntries.length,
  );

  // 7. Filter by code (exact match, should yield one result)
  const codeToFind = entrySeed[0].code;
  const pageByCode =
    await api.functional.shoppingMallAiBackend.admin.codebooks.entries.index(
      connection,
      {
        codebookId: codebook.id,
        body: {
          codebookId: codebook.id,
          code: codeToFind,
        } satisfies IShoppingMallAiBackendCodebookEntry.IRequest,
      },
    );
  typia.assert(pageByCode);
  TestValidator.equals(
    "find by exact code yields one",
    pageByCode.data.length,
    1,
  );
  TestValidator.equals(
    "code matches filter",
    pageByCode.data[0].code,
    codeToFind,
  );

  // 8. Filter by partial label (should be at least one; partial first word)
  const labelPartial = entrySeed[2].label.split(" ")[0];
  const pageByLabelPartial =
    await api.functional.shoppingMallAiBackend.admin.codebooks.entries.index(
      connection,
      {
        codebookId: codebook.id,
        body: {
          codebookId: codebook.id,
          label: labelPartial,
        } satisfies IShoppingMallAiBackendCodebookEntry.IRequest,
      },
    );
  typia.assert(pageByLabelPartial);
  TestValidator.predicate(
    `at least one entry label contains '${labelPartial}'`,
    pageByLabelPartial.data.length >= 1 &&
      pageByLabelPartial.data.some((x) => x.label.includes(labelPartial)),
  );

  // 9. Filter by visible=true
  const pageVisTrue =
    await api.functional.shoppingMallAiBackend.admin.codebooks.entries.index(
      connection,
      {
        codebookId: codebook.id,
        body: {
          codebookId: codebook.id,
          visible: true,
        } satisfies IShoppingMallAiBackendCodebookEntry.IRequest,
      },
    );
  typia.assert(pageVisTrue);
  TestValidator.predicate(
    "all entries in result visible=true",
    pageVisTrue.data.every((x) => x.visible === true),
  );
  TestValidator.equals(
    "visible=true count",
    pageVisTrue.data.length,
    mainEntries.filter((x) => x.visible).length,
  );

  // 10. Filter by visible=false
  const pageVisFalse =
    await api.functional.shoppingMallAiBackend.admin.codebooks.entries.index(
      connection,
      {
        codebookId: codebook.id,
        body: {
          codebookId: codebook.id,
          visible: false,
        } satisfies IShoppingMallAiBackendCodebookEntry.IRequest,
      },
    );
  typia.assert(pageVisFalse);
  TestValidator.predicate(
    "all entries in result visible=false",
    pageVisFalse.data.every((x) => x.visible === false),
  );
  TestValidator.equals(
    "visible=false count",
    pageVisFalse.data.length,
    mainEntries.filter((x) => !x.visible).length,
  );

  // 11. Combination filter: code + visible
  const pageCombo =
    await api.functional.shoppingMallAiBackend.admin.codebooks.entries.index(
      connection,
      {
        codebookId: codebook.id,
        body: {
          codebookId: codebook.id,
          code: entrySeed[0].code,
          visible: true,
        } satisfies IShoppingMallAiBackendCodebookEntry.IRequest,
      },
    );
  typia.assert(pageCombo);
  TestValidator.equals(
    "combo filter returns single result",
    pageCombo.data.length,
    1,
  );
  TestValidator.equals(
    "combo filter result matches code and visible",
    pageCombo.data[0].code,
    entrySeed[0].code,
  );
  TestValidator.equals(
    "combo filter result is visible",
    pageCombo.data[0].visible,
    true,
  );

  const pageNegativeCombo =
    await api.functional.shoppingMallAiBackend.admin.codebooks.entries.index(
      connection,
      {
        codebookId: codebook.id,
        body: {
          codebookId: codebook.id,
          code: entrySeed[0].code,
          visible: false,
        } satisfies IShoppingMallAiBackendCodebookEntry.IRequest,
      },
    );
  typia.assert(pageNegativeCombo);
  TestValidator.equals(
    "combo negative filter returns zero result",
    pageNegativeCombo.data.length,
    0,
  );

  // 12. Final: Ensure no entries from control codebook leak into results
  for (const p of [
    pageAll,
    page1,
    pageByCode,
    pageByLabelPartial,
    pageVisTrue,
    pageVisFalse,
    pageCombo,
  ]) {
    TestValidator.predicate(
      "no control codebook entry present",
      p.data.every((x) => x.code !== controlEntry.code),
    );
  }
}

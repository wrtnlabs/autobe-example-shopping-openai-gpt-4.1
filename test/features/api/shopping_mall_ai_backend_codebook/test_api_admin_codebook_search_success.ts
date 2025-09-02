import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";
import type { IPageIShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCodebook";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_codebook_search_success(
  connection: api.IConnection,
) {
  /**
   * Validate successful retrieval of paginated codebook list for admin role.
   *
   * Steps:
   *
   * 1. Register a new admin user. Required for authenticated access.
   * 2. Execute PATCH request to /shoppingMallAiBackend/admin/codebooks with
   *    default (empty) filter/search params.
   * 3. Assert API returns a paginated IPageIShoppingMallAiBackendCodebook.ISummary
   *    structure.
   * 4. Check basic pagination metadata: current, limit, records, and pages.
   * 5. Ensure data property is always present and is an array.
   * 6. If codebooks are present, validate that each summary has required shape and
   *    field types.
   */

  // 1. Register admin and ensure authentication context for protected endpoint
  const adminInput = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAiBackendAdmin.ICreate;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Find paginated codebook list (PATCH with empty/default search)
  const req: IShoppingMallAiBackendCodebook.IRequest = {};
  const page = await api.functional.shoppingMallAiBackend.admin.codebooks.index(
    connection,
    { body: req },
  );
  typia.assert(page);

  // 3. Basic pagination integrity
  TestValidator.predicate(
    "pagination exists and is object",
    typeof page.pagination === "object" && page.pagination !== null,
  );
  TestValidator.predicate(
    "pagination.current is int >= 1",
    typeof page.pagination.current === "number" && page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit is int >= 1",
    typeof page.pagination.limit === "number" && page.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination.records is >= 0",
    typeof page.pagination.records === "number" && page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is int >= 1",
    typeof page.pagination.pages === "number" && page.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "data property exists and is array",
    Array.isArray(page.data),
  );

  // 4. If codebooks found, verify structure
  if (Array.isArray(page.data) && page.data.length > 0) {
    for (const codebook of page.data) {
      TestValidator.predicate(
        "codebook.id is uuid string",
        typeof codebook.id === "string" && codebook.id.length > 0,
      );
      TestValidator.predicate(
        "codebook.code is string",
        typeof codebook.code === "string" && codebook.code.length > 0,
      );
      TestValidator.predicate(
        "codebook.name is string",
        typeof codebook.name === "string" && codebook.name.length > 0,
      );
      TestValidator.predicate(
        "codebook.created_at is date-time string",
        typeof codebook.created_at === "string" &&
          codebook.created_at.length > 0,
      );
      TestValidator.predicate(
        "codebook.updated_at is date-time string",
        typeof codebook.updated_at === "string" &&
          codebook.updated_at.length > 0,
      );
      // Description is optional and nullable, do not assert
    }
  }
}

import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendFinancialIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFinancialIncident";
import type { IPageIShoppingMallAiBackendFinancialIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFinancialIncident";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_financial_incident_detail_admin_authorization(
  connection: api.IConnection,
) {
  /**
   * Validates admin ability to retrieve full details of a specific financial
   * incident.
   *
   * Steps:
   *
   * 1. Register and authenticate admin account for test (API: /auth/admin/join)
   * 2. List at least one financial incident record (API:
   *    /shoppingMallAiBackend/admin/financialIncidents, PATCH)
   * 3. Retrieve full detail for picked incident using detail endpoint (API:
   *    /shoppingMallAiBackend/admin/financialIncidents/{incidentId}, GET)
   * 4. Validate required and optional fields match between summary and detail
   *    objects
   * 5. Attempt to fetch a non-existent incident and validate appropriate error is
   *    thrown
   */

  // STEP 1: Register and authenticate as admin
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(12),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@admin.example.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // STEP 2: Find existing incident (required: at least 1 must exist for test)
  const page =
    await api.functional.shoppingMallAiBackend.admin.financialIncidents.index(
      connection,
      {
        body: { limit: 1 },
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "At least one financial incident record must exist for detail test",
    page.data.length > 0,
  );
  const summary = page.data[0];

  // STEP 3: Retrieve the detail and perform validation
  const detail =
    await api.functional.shoppingMallAiBackend.admin.financialIncidents.at(
      connection,
      {
        incidentId: summary.id,
      },
    );
  typia.assert(detail);

  TestValidator.equals(
    "incidentId in detail must match list summary",
    detail.id,
    summary.id,
  );
  TestValidator.equals(
    "incident_type in detail must match summary",
    detail.incident_type,
    summary.incident_type,
  );
  TestValidator.equals(
    "status in detail must match summary",
    detail.status,
    summary.status,
  );
  TestValidator.equals(
    "created_at in detail must match summary",
    detail.created_at,
    summary.created_at,
  );
  if (summary.resolved_at !== undefined && summary.resolved_at !== null) {
    TestValidator.equals(
      "resolved_at (if present) must match",
      detail.resolved_at,
      summary.resolved_at,
    );
  }
  TestValidator.predicate(
    "details field must be non-empty string",
    typeof detail.details === "string" && detail.details.length > 0,
  );

  // STEP 4: Error case - accessing random (non-existent) incident should fail
  const invalidId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Admin fetching non-existent financial incidentId must error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.financialIncidents.at(
        connection,
        {
          incidentId: invalidId,
        },
      );
    },
  );
}

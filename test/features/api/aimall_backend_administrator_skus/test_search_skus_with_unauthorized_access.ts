import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IPageIAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSku";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Verify that advanced SKU search is protected by administrator role-based
 * access control.
 *
 * This test attempts to perform an advanced SKU search using the administrator
 * endpoint as a non-administrator user (such as a customer or seller). It
 * ensures that the system correctly denies the operation for insufficient
 * permissions, enforcing RBAC.
 *
 * Steps:
 *
 * 1. Attempt a SKU search (PATCH /aimall-backend/administrator/skus) without
 *    administrator privileges.
 * 2. Validate that an access/authorization error is thrown (permission denied).
 */
export async function test_api_aimall_backend_administrator_skus_test_search_skus_with_unauthorized_access(
  connection: api.IConnection,
) {
  // Attempt SKU search with random filters as a non-admin user
  await TestValidator.error("Unauthorized admin SKU search should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.skus.search(
        connection,
        {
          body: typia.random<IAimallBackendSku.IRequest>(),
        },
      );
    },
  );
}

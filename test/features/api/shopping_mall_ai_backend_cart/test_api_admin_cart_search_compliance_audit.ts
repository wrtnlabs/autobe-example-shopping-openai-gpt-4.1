import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import type { IPageIShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates the admin cart search API for compliance audit/analytics
 * capability.
 *
 * Scenario:
 *
 * 1. Register/authorize an admin user via /auth/admin/join.
 * 2. Perform admin-level cart search: (a) broad search (no filters) (b)
 *    filtered search (status, customer_id, created_at_min/max, limit, page)
 *    (c) edge: non-existent customer_id (d) error: invalid (negative) page
 *    (e) security: unauthenticated access attempt
 *
 * Business validation:
 *
 * - Admin onboarding is successful, admin is active
 * - Each result in summary page matches IShoppingMallAiBackendCart.ISummary
 * - Pagination metadata is present and valid
 * - Edge/error/unauth test cases covered
 */
export async function test_api_admin_cart_search_compliance_audit(
  connection: api.IConnection,
) {
  // 1. Admin registration + authentication context
  const createAdmin = {
    username: RandomGenerator.name(1),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: createAdmin,
  });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin is active",
    adminAuth.admin.is_active === true,
  );

  // 2a. Broad search as admin (no filter)
  const broad = await api.functional.shoppingMallAiBackend.admin.carts.index(
    connection,
    { body: {} satisfies IShoppingMallAiBackendCart.IRequest },
  );
  typia.assert(broad);
  TestValidator.predicate(
    "pagination present",
    typeof broad.pagination === "object" && broad.pagination !== null,
  );
  TestValidator.predicate(
    "cart summary list present",
    Array.isArray(broad.data),
  );
  // Validate summary element(s)
  broad.data.forEach((item) => typia.assert(item));

  // 2b. Filtered/paginated search
  const filterReq: IShoppingMallAiBackendCart.IRequest = {
    status: RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    created_at_min: new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 7,
    ).toISOString(),
    created_at_max: new Date().toISOString(),
    limit: 2,
    page: 1,
  };
  const filtered = await api.functional.shoppingMallAiBackend.admin.carts.index(
    connection,
    { body: filterReq },
  );
  typia.assert(filtered);
  filtered.data.forEach((s) => typia.assert(s));
  TestValidator.predicate(
    "filter: data array present",
    Array.isArray(filtered.data),
  );
  TestValidator.predicate("filter: limit respected", filtered.data.length <= 2);
  TestValidator.equals("filter: current page", filtered.pagination.current, 1);

  // 2c. Edge: unknown customer_id (expect empty or minimal)
  const edge = await api.functional.shoppingMallAiBackend.admin.carts.index(
    connection,
    { body: { customer_id: typia.random<string & tags.Format<"uuid">>() } },
  );
  typia.assert(edge);
  TestValidator.predicate(
    "unknown customer_id returns 0 or empty",
    Array.isArray(edge.data) && edge.data.length === 0,
  );

  // 2d. Error: negative page rejected
  await TestValidator.error("negative page param rejected", async () => {
    await api.functional.shoppingMallAiBackend.admin.carts.index(connection, {
      body: { page: -1 },
    });
  });

  // 2e. Security case: unauthenticated access must fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated cart search forbidden",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.carts.index(unauthConn, {
        body: {},
      });
    },
  );
}

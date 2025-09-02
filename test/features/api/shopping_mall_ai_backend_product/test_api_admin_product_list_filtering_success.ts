import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IPageIShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProduct";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_product_list_filtering_success(
  connection: api.IConnection,
) {
  /**
   * Validate successful admin product list retrieval with advanced filtering
   * and pagination.
   *
   * This test covers:
   *
   * 1. Registering and auto-login as an admin.
   * 2. Creating at least two products with distinct titles and business_status
   *    values (e.g., 'draft', 'active').
   * 3. Filtering product list by business_status.
   * 4. Filtering product list by partial title (substring).
   * 5. Pagination functionality validation (limit = 1 per page).
   * 6. Verification that every product summary includes all required
   *    business/compliance fields.
   */

  // 1. Register an admin (auto-login) for context
  const adminUsername = RandomGenerator.alphabets(8);
  const adminEmail = `${RandomGenerator.alphabets(6)}@company.com`;
  const passwordHash = RandomGenerator.alphaNumeric(32); // Use a generated hash (test context)
  const adminJoinResp = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: passwordHash,
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinResp);

  // 2. Insert two products with different titles and business_status
  const [prod1Title, prod2Title] = [
    RandomGenerator.paragraph({ sentences: 2 }),
    RandomGenerator.paragraph({ sentences: 3 }),
  ];
  const [prod1Status, prod2Status] = ["draft", "active"] as const;
  const prod1Slug = RandomGenerator.alphaNumeric(10);
  const prod2Slug = RandomGenerator.alphaNumeric(10);
  const commonType = "physical";
  const prod1 =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: prod1Title,
          slug: prod1Slug,
          description: RandomGenerator.content({ paragraphs: 2 }),
          product_type: commonType,
          business_status: prod1Status,
          min_order_quantity: 1,
          max_order_quantity: 10,
          tax_code: "GEN1",
          sort_priority: 10,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(prod1);
  const prod2 =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: {
          title: prod2Title,
          slug: prod2Slug,
          description: RandomGenerator.content({ paragraphs: 3 }),
          product_type: commonType,
          business_status: prod2Status,
          min_order_quantity: 2,
          max_order_quantity: 8,
          tax_code: "GEN1",
          sort_priority: 9,
        } satisfies IShoppingMallAiBackendProduct.ICreate,
      },
    );
  typia.assert(prod2);

  // 3. List products filtered by business_status
  const byStatus =
    await api.functional.shoppingMallAiBackend.admin.products.index(
      connection,
      {
        body: {
          business_status: prod1Status,
          limit: 10,
          page: 1,
        } satisfies IShoppingMallAiBackendProduct.IRequest,
      },
    );
  typia.assert(byStatus);
  TestValidator.predicate(
    "all returned products have status matching filter",
    byStatus.data.every((x) => x.business_status === prod1Status),
  );
  TestValidator.predicate(
    "at least one product returned for status filter",
    byStatus.data.length > 0,
  );
  TestValidator.predicate(
    "pagination meta present in status filter",
    typeof byStatus.pagination.current === "number" &&
      typeof byStatus.pagination.limit === "number",
  );

  // 4. List products filtered by partial title
  const partialTitle = prod2Title.split(" ").slice(0, 1).join(" ");
  const byTitle =
    await api.functional.shoppingMallAiBackend.admin.products.index(
      connection,
      {
        body: {
          title: partialTitle,
          limit: 10,
          page: 1,
        } satisfies IShoppingMallAiBackendProduct.IRequest,
      },
    );
  typia.assert(byTitle);
  TestValidator.predicate(
    "all returned products have title including filter",
    byTitle.data.every((x) => x.title.includes(partialTitle)),
  );
  TestValidator.predicate(
    "at least one product returned for title filter",
    byTitle.data.length > 0,
  );
  TestValidator.predicate(
    "pagination meta present in title filter",
    typeof byTitle.pagination.current === "number" &&
      typeof byTitle.pagination.limit === "number",
  );

  // 5. Basic list with pagination (unfiltered, limit 1)
  const unfiltered =
    await api.functional.shoppingMallAiBackend.admin.products.index(
      connection,
      {
        body: {
          limit: 1,
          page: 1,
        } satisfies IShoppingMallAiBackendProduct.IRequest,
      },
    );
  typia.assert(unfiltered);
  TestValidator.predicate(
    "pagination holds: at most 1 product per page",
    unfiltered.data.length <= 1,
  );
  TestValidator.predicate(
    "pagination total pages >= 1",
    unfiltered.pagination.pages >= 1,
  );

  // 6. Structural validation: product summary compliance fields (for every product summary)
  for (const prod of unfiltered.data) {
    TestValidator.predicate("summary id exists", typeof prod.id === "string");
    TestValidator.predicate(
      "summary title exists",
      typeof prod.title === "string",
    );
    TestValidator.predicate(
      "summary slug exists",
      typeof prod.slug === "string",
    );
    TestValidator.predicate(
      "summary product_type exists",
      typeof prod.product_type === "string",
    );
    TestValidator.predicate(
      "summary business_status exists",
      typeof prod.business_status === "string",
    );
    TestValidator.predicate(
      "summary tax_code exists",
      typeof prod.tax_code === "string",
    );
    TestValidator.predicate(
      "summary min_order_quantity exists",
      typeof prod.min_order_quantity === "number",
    );
    TestValidator.predicate(
      "summary max_order_quantity exists",
      typeof prod.max_order_quantity === "number",
    );
    TestValidator.predicate(
      "summary created_at exists",
      typeof prod.created_at === "string",
    );
    TestValidator.predicate(
      "summary updated_at exists",
      typeof prod.updated_at === "string",
    );
  }
}

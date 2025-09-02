import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";

export async function test_api_admin_product_category_create_success(
  connection: api.IConnection,
) {
  /**
   * Validate successful creation of a product category as admin.
   *
   * This test covers:
   *
   * 1. Registering a new admin and authenticating via join
   * 2. Creating a new, unique product category with all required properties
   * 3. Asserting all required and server-managed response attributes for
   *    completeness and correctness
   *
   * Steps:
   *
   * - Register admin and obtain Authorization
   * - Generate valid category attributes (unique name, code, sort order)
   * - Submit category creation
   * - Assert type safety and value correctness of all critical fields, including
   *   nullable handling
   */

  // 1. Register admin (obtains Authorization for subsequent API calls)
  const adminUsername: string = RandomGenerator.alphaNumeric(10);
  const adminEmail: string = `${RandomGenerator.alphaNumeric(8)}@business.com`;
  const passwordHash: string = RandomGenerator.alphaNumeric(32); // Simulated hash for e2e
  const adminName: string = RandomGenerator.name(2);
  const adminPhone: string = RandomGenerator.mobile();

  const adminResult = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: passwordHash,
      name: adminName,
      email: adminEmail,
      phone_number: adminPhone,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminResult);
  TestValidator.equals(
    "admin username matches input",
    adminResult.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "admin name matches input",
    adminResult.admin.name,
    adminName,
  );
  TestValidator.equals(
    "admin email matches input",
    adminResult.admin.email,
    adminEmail,
  );
  TestValidator.equals(
    "admin account enabled",
    adminResult.admin.is_active,
    true,
  );
  TestValidator.predicate(
    "admin id is uuid",
    typeof adminResult.admin.id === "string" &&
      adminResult.admin.id.length >= 30,
  );

  // 2. Create a new unique product category
  const categoryName: string = RandomGenerator.name(3);
  const categoryCode: string = RandomGenerator.alphaNumeric(12);
  const sortOrder: number = typia.random<number & tags.Type<"int32">>();
  const categoryCreate = {
    category_name: categoryName,
    category_code: categoryCode,
    sort_order: sortOrder,
    is_active: true,
  } satisfies IShoppingMallAiBackendProductCategory.ICreate;

  const category =
    await api.functional.shoppingMallAiBackend.admin.productCategories.create(
      connection,
      {
        body: categoryCreate,
      },
    );
  typia.assert(category);
  // 3. Assert correctness and all required and defaulted output fields
  TestValidator.equals(
    "category_name matches input",
    category.category_name,
    categoryName,
  );
  TestValidator.equals(
    "category_code matches input",
    category.category_code,
    categoryCode,
  );
  TestValidator.equals(
    "sort_order matches input",
    category.sort_order,
    sortOrder,
  );
  TestValidator.equals(
    "category enabled flag matches input",
    category.is_active,
    true,
  );
  TestValidator.predicate(
    "category id is a uuid",
    typeof category.id === "string" && category.id.length >= 30,
  );
  TestValidator.predicate(
    "created_at is ISO 8601",
    typeof category.created_at === "string" &&
      category.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601",
    typeof category.updated_at === "string" &&
      category.updated_at.includes("T"),
  );
  TestValidator.equals(
    "deleted_at is null or undefined after creation",
    category.deleted_at ?? null,
    null,
  );
  TestValidator.predicate(
    "category depth is an integer",
    Number.isInteger(category.category_depth),
  );
  // parent_id is omitted: must be returned as null/undefined (root category)
  TestValidator.equals(
    "parent_id is null or undefined after creation",
    category.parent_id ?? null,
    null,
  );
}

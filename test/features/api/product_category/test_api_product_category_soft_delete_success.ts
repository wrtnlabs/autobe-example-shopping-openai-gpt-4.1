import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductCategory";

export async function test_api_product_category_soft_delete_success(
  connection: api.IConnection,
) {
  /**
   * Validates the successful soft deletion (logical deletion) of a product
   * category by an admin user.
   *
   * Business context: Admins can perform soft deletion of product categories,
   * which sets the deleted_at field (without fully removing the record for
   * audit/evidence purposes). The DELETE request should be idempotent – issuing
   * it repeatedly should not cause error, nor should it alter state beyond
   * initial deletion.
   *
   * Test Steps:
   *
   * 1. Register a new admin account and acquire authentication context.
   * 2. Create a new product category to be deleted.
   * 3. Invoke soft delete (erase) on the category. No output means success.
   * 4. Invoke erase a second time to ensure idempotency (must not error).
   *
   * Note: Since category retrieval/search APIs are not included, direct
   * confirmation that deleted_at was set or that the category is excluded from
   * listing cannot be performed. When such endpoints become available, add
   * validation to check deleted_at or absence from listing.
   */

  // 1. Register an admin
  const adminUsername: string = RandomGenerator.alphabets(8);
  const adminEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphabets(8)}@example.com` as string &
      tags.Format<"email">;
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const joinResult: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: adminPassword,
        name: RandomGenerator.name(),
        email: adminEmail,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(joinResult);
  TestValidator.predicate(
    "admin account successfully registered",
    !!joinResult.admin.id,
  );

  // 2. Create a product category
  const categoryCode: string = RandomGenerator.alphaNumeric(8);
  const productCategory: IShoppingMallAiBackendProductCategory =
    await api.functional.shoppingMallAiBackend.admin.productCategories.create(
      connection,
      {
        body: {
          category_name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          category_code: categoryCode,
          is_active: true,
          sort_order: 1,
        } satisfies IShoppingMallAiBackendProductCategory.ICreate,
      },
    );
  typia.assert(productCategory);
  TestValidator.predicate(
    "product category successfully created",
    !!productCategory.id,
  );

  // 3. Soft-delete the product category via erase (first call)
  await api.functional.shoppingMallAiBackend.admin.productCategories.erase(
    connection,
    {
      categoryId: productCategory.id,
    },
  );

  // 4. Soft-delete again to confirm idempotency (must not error)
  await api.functional.shoppingMallAiBackend.admin.productCategories.erase(
    connection,
    {
      categoryId: productCategory.id,
    },
  );

  // Finished: If no errors are thrown, soft-delete and idempotency checks pass for the implemented scenario.
}

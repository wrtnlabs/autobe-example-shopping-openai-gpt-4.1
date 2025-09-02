import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

export async function test_api_admin_product_update_success(
  connection: api.IConnection,
) {
  /**
   * 1. Register an admin account to obtain authentication.
   *
   * Uses a unique username and email each run. The password_hash is simulated
   * as a random string, representing a hashed value. After join, connection is
   * authenticated for admin context.
   */
  const adminUsername: string = RandomGenerator.alphaNumeric(8);
  const adminEmail: string = `${adminUsername}@company.com`;
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const joinResult = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword,
      name: RandomGenerator.name(),
      email: adminEmail,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(joinResult);
  const admin = joinResult.admin;

  /**
   * 2. Create a product as admin. This is the resource to later update.
   *
   * Uses minimal required and valid business values; certain enum values are
   * assumed permissible.
   */
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({ paragraphs: 1 }),
    product_type: "physical",
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: "VAT10",
    sort_priority: 100,
  };
  const product =
    await api.functional.shoppingMallAiBackend.admin.products.create(
      connection,
      {
        body: productInput,
      },
    );
  typia.assert(product);

  /**
   * 3. Update several mutable fields (title, description, min_order_quantity).
   *
   * Create distinct update values to easily validate changes. Do not update
   * slug/max_order_quantity (immutables here).
   */
  const updateInput: IShoppingMallAiBackendProduct.IUpdate = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    min_order_quantity: product.min_order_quantity + 2,
  };
  const updated =
    await api.functional.shoppingMallAiBackend.admin.products.update(
      connection,
      {
        productId: product.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  /**
   * 4. Validate update response.
   *
   * The updated fields must change, updated_at must advance, and all
   * non-updated fields remain unchanged.
   */
  TestValidator.notEquals(
    "updated_at timestamp increases after update",
    updated.updated_at,
    product.updated_at,
  );
  TestValidator.equals("title updated", updated.title, updateInput.title);
  TestValidator.equals(
    "description updated",
    updated.description,
    updateInput.description,
  );
  TestValidator.equals(
    "min_order_quantity updated",
    updated.min_order_quantity,
    updateInput.min_order_quantity,
  );

  TestValidator.equals("id remains unchanged", updated.id, product.id);
  TestValidator.equals("slug remains unchanged", updated.slug, product.slug);
  TestValidator.equals(
    "max_order_quantity unchanged",
    updated.max_order_quantity,
    product.max_order_quantity,
  );
  TestValidator.equals(
    "product_type unchanged",
    updated.product_type,
    product.product_type,
  );
  TestValidator.equals(
    "business_status unchanged",
    updated.business_status,
    product.business_status,
  );
  TestValidator.equals(
    "tax_code unchanged",
    updated.tax_code,
    product.tax_code,
  );
  TestValidator.equals(
    "sort_priority unchanged",
    updated.sort_priority,
    product.sort_priority,
  );
}

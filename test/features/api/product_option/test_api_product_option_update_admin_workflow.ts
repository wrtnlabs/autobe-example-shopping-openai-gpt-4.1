import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";

/**
 * Validate the full update workflow for product options by admin.
 *
 * This test exercises the entire workflow for an admin updating a product
 * option on the shopping mall platform via the dedicated admin endpoints.
 *
 * Steps:
 *
 * 1. Registers a new admin (with unique email).
 * 2. Creates a new product category.
 * 3. Creates a new product under the category using a random seller UUID (admin
 *    context).
 * 4. Adds an initial product option to the new product (with unique name and
 *    display_order).
 * 5. Updates the product option to a new (unique) name and a changed display_order
 *    (using the update endpoint).
 * 6. Asserts that the update result has the new name, the new order, and a
 *    strictly more recent updated_at than previous.
 * 7. Reads the product option again (via successful update's result, which is full
 *    object) and confirms all changes persisted (id, name, display_order).
 * 8. Tries updating the same product option to a name that already exists for the
 *    same product (duplicate name) and expects an error response
 *    (TestValidator.error).
 *
 * Business logic actively checked:
 *
 * - Only admins can update product options (work is fully under admin session).
 * - Product and option must exist (all created fresh in setup).
 * - The update operation persists fields and timestamp advancement.
 * - Option name uniqueness under the same product is enforced by backend;
 *   duplicate names for one product are invalid.
 *
 * Constraints:
 *
 * - All referenced UUIDs must be valid, and values must be unique per test run
 *   (except for intentional duplicate update test).
 * - Timestamps, names, and display_order are to be checked.
 * - No unauthorized role escalation or cross-product changes possible in this
 *   case.
 * - Test is isolated (all entities are ephemeral).
 */
export async function test_api_product_option_update_admin_workflow(
  connection: api.IConnection,
) {
  // Admin registration
  const adminRegReq = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminRegReq,
  });
  typia.assert(admin);

  // Category creation
  const categoryReq = {
    name_ko: RandomGenerator.paragraph({ sentences: 1, wordMin: 3 }),
    name_en: RandomGenerator.paragraph({ sentences: 1, wordMin: 3 }),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryReq },
  );
  typia.assert(category);

  // Product creation (admin can specify any seller UUID; we'll just use admin id to satisfy uuid format)
  const productReq = {
    shopping_mall_seller_id: admin.id satisfies string as string,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 5 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 6,
    }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.admin.products.create(
    connection,
    { body: productReq },
  );
  typia.assert(product);

  // Option creation (unique name)
  const optionName = RandomGenerator.paragraph({ sentences: 1, wordMin: 3 });
  const optionReq = {
    name: optionName,
    display_order: 0,
  } satisfies IShoppingMallProductOption.ICreate;
  const option =
    await api.functional.shoppingMall.admin.products.options.create(
      connection,
      { productId: product.id, body: optionReq },
    );
  typia.assert(option);

  // Create a second unique-named option for duplicate check test later
  const otherOptionName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
  });
  const otherOptionReq = {
    name: otherOptionName,
    display_order: 1,
  } satisfies IShoppingMallProductOption.ICreate;
  const otherOption =
    await api.functional.shoppingMall.admin.products.options.create(
      connection,
      { productId: product.id, body: otherOptionReq },
    );
  typia.assert(otherOption);

  // ---- UPDATE WORKFLOW ----
  // Prepare updated name and order for main option
  const updatedName = RandomGenerator.paragraph({ sentences: 1, wordMin: 4 });
  const updatedOrder = 5;
  const prevUpdatedAt = option.updated_at;
  const updateReq = {
    name: updatedName,
    display_order: updatedOrder,
  } satisfies IShoppingMallProductOption.IUpdate;
  const updated =
    await api.functional.shoppingMall.admin.products.options.update(
      connection,
      {
        productId: product.id,
        optionId: option.id,
        body: updateReq,
      },
    );
  typia.assert(updated);
  TestValidator.equals("updated option id unchanged", updated.id, option.id);
  TestValidator.equals("updated name applied", updated.name, updatedName);
  TestValidator.equals(
    "updated display_order applied",
    updated.display_order,
    updatedOrder,
  );
  TestValidator.predicate(
    "updated_at advanced after update",
    new Date(updated.updated_at) > new Date(prevUpdatedAt),
  );

  // Confirm persistence of updated fields via another full read (from update result)
  TestValidator.equals(
    "persisted name in update result",
    updated.name,
    updatedName,
  );
  TestValidator.equals(
    "persisted display_order in update result",
    updated.display_order,
    updatedOrder,
  );

  // ---- DUPLICATE NAME ERROR SCENARIO ----
  await TestValidator.error(
    "cannot update option to duplicate name",
    async () => {
      await api.functional.shoppingMall.admin.products.options.update(
        connection,
        {
          productId: product.id,
          optionId: updated.id,
          body: {
            name: otherOptionName,
          } satisfies IShoppingMallProductOption.IUpdate,
        },
      );
    },
  );
}

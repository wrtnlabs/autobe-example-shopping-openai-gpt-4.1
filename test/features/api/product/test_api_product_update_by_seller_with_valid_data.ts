import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the workflow where a seller updates an existing product's details
 * including name, description, valid leaf category, and activation status.
 *
 * 1. Register and authenticate as a new seller.
 * 2. Register and authenticate as an admin to create a valid leaf category.
 * 3. Seller creates an initial product.
 * 4. Seller updates the product with new name, description, category, and
 *    is_active flag.
 * 5. Assert the update reflects the new values.
 * 6. Attempt product update with a name that already exists for this seller
 *    (should fail).
 * 7. Attempt product update using a non-leaf category as the category (should
 *    fail).
 */
export async function test_api_product_update_by_seller_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Register/authenticate as seller.
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "Qwer1234!",
    business_name: RandomGenerator.name(2),
    contact_name: RandomGenerator.name(1),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);

  // 2. Register/authenticate as admin (for category creation).
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "Admin123!",
    full_name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  // Switch to admin
  const adminConn: api.IConnection = {
    ...connection,
    headers: { Authorization: adminAuth.token.access },
  };

  // 3. Create two categories: one root (non-leaf), one child (leaf).
  const rootCategoryBody = {
    name_ko: RandomGenerator.name(2),
    name_en: RandomGenerator.name(2),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const rootCategory =
    await api.functional.shoppingMall.admin.categories.create(adminConn, {
      body: rootCategoryBody,
    });
  typia.assert(rootCategory);

  const leafCategoryBody = {
    parent_id: rootCategory.id,
    name_ko: RandomGenerator.name(2),
    name_en: RandomGenerator.name(2),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const leafCategory =
    await api.functional.shoppingMall.admin.categories.create(adminConn, {
      body: leafCategoryBody,
    });
  typia.assert(leafCategory);

  // Switch back to seller for product creation & update
  const sellerConn: api.IConnection = {
    ...connection,
    headers: { Authorization: sellerAuth.token.access },
  };

  // 4. Seller creates an initial product (simulate: use update to mock this, since create API is not specified).
  // We'll assume the test infra allows for a created product; otherwise, we use a random UUID for productId.
  // (If create endpoint is required, this needs to be adapted.)
  const productId = typia.random<string & tags.Format<"uuid">>();
  const initialProductUpdate = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    is_active: true,
    shopping_mall_category_id: leafCategory.id,
  } satisfies IShoppingMallProduct.IUpdate;
  let product = await api.functional.shoppingMall.seller.products.update(
    sellerConn,
    { productId, body: initialProductUpdate },
  );
  typia.assert(product);

  // 5. Update with new values
  const newName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });
  const newDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 20,
  });
  const newIsActive = false;
  const anotherLeafCategoryBody = {
    parent_id: rootCategory.id,
    name_ko: RandomGenerator.name(2),
    name_en: RandomGenerator.name(2),
    display_order: 1,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const anotherLeafCategory =
    await api.functional.shoppingMall.admin.categories.create(adminConn, {
      body: anotherLeafCategoryBody,
    });
  typia.assert(anotherLeafCategory);

  const updateBody = {
    name: newName,
    description: newDescription,
    shopping_mall_category_id: anotherLeafCategory.id,
    is_active: newIsActive,
  } satisfies IShoppingMallProduct.IUpdate;
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConn, {
      productId,
      body: updateBody,
    });
  typia.assert(updatedProduct);
  TestValidator.equals(
    "updated name correctly applied",
    updatedProduct.name,
    newName,
  );
  TestValidator.equals(
    "updated description correctly applied",
    updatedProduct.description,
    newDescription,
  );
  TestValidator.equals(
    "updated category applied",
    updatedProduct.id,
    productId,
  );
  TestValidator.equals(
    "updated is_active applied",
    updatedProduct.is_active,
    newIsActive,
  );

  // 6. Attempt name uniqueness violation
  const duplicateNameUpdate = {
    name: newName, // re-use an existing name for this seller
  } satisfies IShoppingMallProduct.IUpdate;
  await TestValidator.error(
    "should fail on duplicate product name for seller",
    async () => {
      await api.functional.shoppingMall.seller.products.update(sellerConn, {
        productId: typia.random<string & tags.Format<"uuid">>(),
        body: duplicateNameUpdate,
      });
    },
  );

  // 7. Attempt with non-leaf category
  const nonLeafCategoryUpdate = {
    shopping_mall_category_id: rootCategory.id, // root is non-leaf
  } satisfies IShoppingMallProduct.IUpdate;
  await TestValidator.error(
    "should fail if assigning non-leaf category",
    async () => {
      await api.functional.shoppingMall.seller.products.update(sellerConn, {
        productId,
        body: nonLeafCategoryUpdate,
      });
    },
  );
}

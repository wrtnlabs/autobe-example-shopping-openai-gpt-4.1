import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that the seller cannot soft-delete a SKU if it belongs to a
 * pending/active order.
 *
 * Steps:
 *
 * 1. Seller joins with valid business data (randomized for test).
 * 2. Admin creates a new product category.
 * 3. Admin creates the required SELLER role (or equivalent).
 * 4. Seller creates a product in the category.
 * 5. Seller creates a SKU variant for the product. [NOTE: Simulating "pending
 *    order referencing SKU" is not possible with exposed APIs.]
 * 6. Seller attempts to erase (soft-delete) the SKU.
 * 7. The system must prohibit the operation, raising a business error.
 * 8. Optionally, verify the SKU record was not deleted (API not exposed in allowed
 *    set).
 */
export async function test_api_sku_soft_delete_by_seller_blocked_by_pending_order(
  connection: api.IConnection,
) {
  // 1. Seller joins
  const sellerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinInput,
  });
  typia.assert(seller);

  // 2. Admin creates product category
  const categoryInput = {
    name_ko: RandomGenerator.name(),
    name_en: RandomGenerator.name(),
    display_order: 0,
    is_active: true,
  } satisfies Partial<IShoppingMallCategory.ICreate> as IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        ...categoryInput,
        // Required fields checked above; optional left as default
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Admin creates 'SELLER' role
  const roleInput = {
    role_name: "SELLER",
    description: "Seller role for e-commerce platform.",
  } satisfies IShoppingMallRole.ICreate;
  const role = await api.functional.shoppingMall.admin.roles.create(
    connection,
    {
      body: roleInput,
    },
  );
  typia.assert(role);

  // 4. Seller creates product
  const productInput = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 16,
    }),
    is_active: true,
  } satisfies Partial<IShoppingMallProduct.ICreate> as IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        ...productInput,
        // 'main_image_url' omitted for simplicity
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 5. Seller creates SKU
  const skuInput = {
    sku_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    price: 19999,
    status: "active",
  } satisfies Partial<IShoppingMallProductSku.ICreate> as IShoppingMallProductSku.ICreate;
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        ...skuInput,
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku);

  // 6. Seller attempts to soft-delete SKU (expected to fail due to "pending order")
  await TestValidator.error(
    "seller should be prohibited from soft-deleting SKU associated with pending order",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.erase(connection, {
        productId: product.id,
        skuId: sku.id,
      });
    },
  );
}

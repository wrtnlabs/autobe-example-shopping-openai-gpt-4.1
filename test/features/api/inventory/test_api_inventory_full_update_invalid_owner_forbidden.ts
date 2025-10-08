import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that a seller cannot modify SKU inventory for a SKU they do not own.
 * Ensures strict authorization on inventory update endpoint:
 *
 * 1. Admin creates product category and seller roles.
 * 2. Seller A registers and creates product under their account.
 * 3. Seller A creates a SKU under product.
 * 4. Seller B registers as a different seller.
 * 5. Seller A loads the inventory record "before" state.
 * 6. Seller B attempts to PUT full inventory update (forbidden).
 * 7. TestValidator.error verifies forbidden error.
 * 8. Switch back to Seller A and confirm inventory state is unchanged.
 */
export async function test_api_inventory_full_update_invalid_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Admin creates product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.name(2),
        name_en: RandomGenerator.name(2),
        description_ko: RandomGenerator.paragraph({ sentences: 3 }),
        description_en: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 2. Admin creates SELLER role
  const role = await api.functional.shoppingMall.admin.roles.create(
    connection,
    {
      body: {
        role_name: "SELLER" + RandomGenerator.alphaNumeric(4).toUpperCase(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IShoppingMallRole.ICreate,
    },
  );
  typia.assert(role);

  // 3. Seller A registration & login
  const sellerA_email = typia.random<string & tags.Format<"email">>();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerA_email,
      password: "A-password-123!",
      business_name: RandomGenerator.name(2),
      contact_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      kyc_document_uri: null,
      business_registration_number: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);

  // 4. Seller A creates product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerA.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 6 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 5. Seller A creates SKU
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: "SKU" + RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        price: 95000,
        status: "active",
        low_stock_threshold: 5,
        main_image_url: null,
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku);

  // 6. Seller B registration & login
  const sellerB_email = typia.random<string & tags.Format<"email">>();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerB_email,
      password: "B-password-123!",
      business_name: RandomGenerator.name(2),
      contact_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      kyc_document_uri: null,
      business_registration_number: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);

  // 7. Seller A (owner) performs a valid read for pre-state of inventory
  //    First, try a valid PUT so state is known
  const put_initial =
    await api.functional.shoppingMall.seller.products.skus.inventory.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          quantity_available: 42,
          quantity_reserved: 7,
          quantity_sold: 3,
          low_stock_threshold: 5,
          status: "in_stock",
        } satisfies IShoppingMallInventoryRecord.IUpdate,
      },
    );
  typia.assert(put_initial);

  // 8. Seller B attempts forbidden update
  // Switch to Seller B with their JWT context
  // (SDK automatically manages connection headers after join)
  await TestValidator.error(
    "forbidden: Seller B PUT on Seller A's SKU inventory",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.inventory.update(
        connection,
        {
          productId: product.id,
          skuId: sku.id,
          body: {
            quantity_available: 99, // attempt overwrite
            quantity_reserved: 1,
            quantity_sold: 10,
            low_stock_threshold: 2,
            status: "reserved",
          } satisfies IShoppingMallInventoryRecord.IUpdate,
        },
      );
    },
  );

  // 9. Switch back to Seller A and verify inventory unchanged
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerA_email,
      password: "A-password-123!",
      business_name: sellerA.business_name,
      contact_name: sellerA.contact_name,
      phone: sellerA.phone,
      kyc_document_uri: null,
      business_registration_number: sellerA.business_registration_number,
    } satisfies IShoppingMallSeller.IJoin,
  });

  const after =
    await api.functional.shoppingMall.seller.products.skus.inventory.update(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          quantity_available: 42,
          quantity_reserved: 7,
          quantity_sold: 3,
          low_stock_threshold: 5,
          status: "in_stock",
        } satisfies IShoppingMallInventoryRecord.IUpdate,
      },
    );
  typia.assert(after);
  TestValidator.equals(
    "inventory unchanged after forbidden PUT attempt",
    after,
    put_initial,
    (key) => key === "updated_at", // Allow for updated_at diff, but check all other fields
  );
}

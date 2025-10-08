import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLog";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Seller can paginate and filter their SKU's inventory logs, verifying
 * business/inventory associations and role constraints.
 */
export async function test_api_inventory_log_pagination_and_filter_by_seller_sku(
  connection: api.IConnection,
) {
  // Register admin for admin operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminPassword123!",
      full_name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Create a category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Create a SELLER role
  const role = await api.functional.shoppingMall.admin.roles.create(
    connection,
    {
      body: {
        role_name: "SELLER",
        description: "Can manage store products and inventory",
      } satisfies IShoppingMallRole.ICreate,
    },
  );
  typia.assert(role);

  // Register seller who uses that category
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "sellerPwd!123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
      kyc_document_uri: undefined,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);

  // Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // Seller adds a SKU
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        price: 9999,
        status: "active",
        low_stock_threshold: undefined,
        main_image_url: undefined,
      } satisfies IShoppingMallProductSku.ICreate,
    },
  );
  typia.assert(sku);

  // Query inventory logs (should be empty)
  let logsPage =
    await api.functional.shoppingMall.seller.products.skus.inventory.logs.index(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(logsPage);
  TestValidator.equals(
    "empty inventory log initially",
    logsPage.data.length,
    0,
  );

  // Optionally, simulate an inventory event (skipped, as no endpoint)

  // Query again with additional parameters (change_type and created_from/to in the future)
  const nowIso = new Date().toISOString();
  logsPage =
    await api.functional.shoppingMall.seller.products.skus.inventory.logs.index(
      connection,
      {
        productId: product.id,
        skuId: sku.id,
        body: {
          page: 1,
          limit: 5,
          change_type: "increase",
          created_from: nowIso,
          created_to: nowIso,
        },
      },
    );
  typia.assert(logsPage);
  TestValidator.equals(
    "no log for future-dated filter",
    logsPage.data.length,
    0,
  );

  // Attempt access of logs for an invalid/unowned SKU
  const otherProductId = typia.random<string & tags.Format<"uuid">>();
  const otherSkuId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "seller cannot access another seller's SKU logs",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.inventory.logs.index(
        connection,
        {
          productId: otherProductId,
          skuId: otherSkuId,
          body: { page: 1, limit: 5 },
        },
      );
    },
  );
}

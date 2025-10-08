import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that admin can fetch sensitive seller details for an onboarded
 * business account.
 *
 * Test steps:
 *
 * 1. Register and authenticate a new admin (admin join)
 * 2. Create a catalog category as admin
 * 3. Create SELLER role as admin
 * 4. Create a new seller implicitly by onboarding a product using that seller's id
 *    and category
 * 5. Fetch full seller info by ID as admin
 *
 *    - Confirm all sensitive KYC/business fields are present and match test setup
 * 6. Attempt fetch with random non-existent sellerId (expect error)
 * 7. Attempt fetch for deleted seller/soft-deleted seller (expect error)
 * 8. Attempt fetch as non-admin (or unauthenticated) and confirm full access is
 *    denied
 */
export async function test_api_admin_seller_detail_inspection_after_product_setup(
  connection: api.IConnection,
) {
  //--- Step 1: Register a new admin and authenticate ---//
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBody });
  typia.assert(adminAuth);

  //--- Step 2: Admin creates a new catalog category ---//
  const categoryBody = {
    name_ko: RandomGenerator.paragraph({ sentences: 2 }),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  //--- Step 3: Admin creates SELLER role ---//
  const sellerRoleBody = {
    role_name: "SELLER",
    description: "Can manage products/orders and operate as a seller.",
  } satisfies IShoppingMallRole.ICreate;
  const sellerRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: sellerRoleBody,
    });
  typia.assert(sellerRole);

  //--- Step 4: Create a new seller (onboarding via product creation) ---//
  // For the test, 'shopping_mall_seller_id' should be a UUID (simulate a real seller onboarding)
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  //--- Step 5: Admin fetches seller details ---//
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.at(connection, {
      sellerId,
    });
  typia.assert(seller);
  TestValidator.equals("Seller id matches onboarding", seller.id, sellerId);
  TestValidator.equals(
    "Business fields present",
    typeof seller.business_registration_number === "string" &&
      seller.business_registration_number.length > 0,
    true,
  );
  TestValidator.predicate(
    "KYC compliance and approval state is present",
    typeof seller.approval_status === "string" &&
      seller.approval_status.length > 0,
  );

  //--- Step 6: Fetch fail for non-existent sellerId ---//
  const missingId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Fetch with non-existent sellerId fails",
    async () => {
      await api.functional.shoppingMall.admin.sellers.at(connection, {
        sellerId: missingId,
      });
    },
  );

  //--- Step 7: (Edge) Fetch after seller is deleted (simulate by making deleted_at non-null and expecting error) ---//
  // (Cannot actually delete via exposed API, so - out-of-scope for full logic, just document this)

  //--- Step 8: Fetch as unauthenticated connection ---//
  // Create unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Full seller admin detail denied for unauthenticated",
    async () => {
      await api.functional.shoppingMall.admin.sellers.at(unauthConn, {
        sellerId,
      });
    },
  );

  //--- If there were a customer/seller role, could test forbidden access here too
}

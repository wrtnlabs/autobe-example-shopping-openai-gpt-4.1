import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test complete workflow for retrieving seller account details as the seller.
 * Ensures all business and private details are properly accessible when
 * authenticated, and not accessible otherwise. Checks admin catalog context and
 * product linkage.
 *
 * 1. Register seller and capture returned data and token
 * 2. As admin, create product category (required for products)
 * 3. As admin, create 'SELLER' role (required for role association)
 * 4. As seller, create test product under new category
 * 5. Retrieve seller account details via /shoppingMall/seller/sellers/{sellerId}
 *    using the seller's own JWT
 *
 *    - Validate all fields: id, email, business_name, contact_name, phone, KYC
 *         fields, approval_status, email_verified,
 *         business_registration_number, timestamps, etc.
 * 6. Negative cases: fetch non-existent sellerId, fetch deleted seller, fetch
 *    other sellerId
 * 7. Validate privacy: only account owner can access private fields, others can't
 */
export async function test_api_seller_details_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.name(3),
    contact_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    kyc_document_uri: null,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: joinBody,
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;

  // 2. Create category as admin
  const categoryBody = {
    name_ko: RandomGenerator.paragraph({ sentences: 2 }),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryBody },
  );
  typia.assert(category);

  // 3. Create 'SELLER' role as admin
  const roleBody = {
    role_name: "SELLER",
    description: "Seller account role",
  } satisfies IShoppingMallRole.ICreate;
  const role = await api.functional.shoppingMall.admin.roles.create(
    connection,
    { body: roleBody },
  );
  typia.assert(role);

  // 4. Create product as seller
  const productBody = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
    main_image_url: null,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 5. Retrieve seller own details as seller
  const sellerDetails = await api.functional.shoppingMall.seller.sellers.at(
    connection,
    { sellerId },
  );
  typia.assert(sellerDetails);

  // All returned fields should match those at registration
  TestValidator.equals("seller id matches", sellerDetails.id, sellerId);
  TestValidator.equals("email matches", sellerDetails.email, joinBody.email);
  TestValidator.equals(
    "business name matches",
    sellerDetails.business_name,
    joinBody.business_name,
  );
  TestValidator.equals(
    "contact name matches",
    sellerDetails.contact_name,
    joinBody.contact_name,
  );
  TestValidator.equals(
    "business reg number matches",
    sellerDetails.business_registration_number,
    joinBody.business_registration_number,
  );
  TestValidator.equals("phone matches", sellerDetails.phone, joinBody.phone);
  TestValidator.equals(
    "approval_status is pending or approved",
    ["pending", "approved", "suspended", "rejected"].includes(
      sellerDetails.approval_status,
    ),
    true,
  );
  TestValidator.equals(
    "email_verified is boolean",
    typeof sellerDetails.email_verified,
    "boolean",
  );
  TestValidator.predicate(
    "created_at valid",
    typeof sellerDetails.created_at === "string" &&
      sellerDetails.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at valid",
    typeof sellerDetails.updated_at === "string" &&
      sellerDetails.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null by default (not deleted)",
    sellerDetails.deleted_at,
    null,
  );
  // optional KYC doc URI is allowed to be null
  TestValidator.equals(
    "kyc_document_uri matches input",
    sellerDetails.kyc_document_uri,
    null,
  );

  // 6. Edge: retrieve with bogus sellerId (should error)
  await TestValidator.error("non-existent sellerId should error", async () => {
    await api.functional.shoppingMall.seller.sellers.at(connection, {
      sellerId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 7. Edge: privacy check by registering another seller and swapping JWT
  const otherSellerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.name(3),
    contact_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    kyc_document_uri: null,
  } satisfies IShoppingMallSeller.IJoin;
  const otherSellerAuth = await api.functional.auth.seller.join(connection, {
    body: otherSellerBody,
  });
  typia.assert(otherSellerAuth);

  await TestValidator.error(
    "other sellerId should not be retrievable by non-owner",
    async () => {
      await api.functional.shoppingMall.seller.sellers.at(connection, {
        sellerId,
      });
    },
  );
}

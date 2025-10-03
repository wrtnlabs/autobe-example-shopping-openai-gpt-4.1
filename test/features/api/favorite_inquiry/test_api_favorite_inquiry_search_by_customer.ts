import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallFavoriteInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFavoriteInquiry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteInquiry";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInquiry";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/** Test customer favorite inquiry search, filtering, privacy, and paging. */
export async function test_api_favorite_inquiry_search_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Register seller
  const sellerChannelId = typia.random<string & tags.Format<"uuid">>();
  const sellerSectionId = typia.random<string & tags.Format<"uuid">>();
  const sellerCategoryId = typia.random<string & tags.Format<"uuid">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = {
    email: sellerEmail,
    password: "strongPw-1234",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    shopping_mall_channel_id: sellerChannelId,
    shopping_mall_section_id: sellerSectionId,
    profile_name: RandomGenerator.name(),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoin });
  typia.assert(seller);

  // Step 2: Seller creates product
  const productData = {
    shopping_mall_seller_id: seller.id,
    shopping_mall_channel_id: sellerChannelId,
    shopping_mall_section_id: sellerSectionId,
    shopping_mall_category_id: sellerCategoryId,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData,
    });
  typia.assert(product);

  // Step 3: Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = {
    shopping_mall_channel_id: sellerChannelId,
    email: customerEmail,
    password: "customerPW12345",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerJoin });
  typia.assert(customer);

  // Step 4: Customer creates a product inquiry
  const inquiryBody = {
    body: RandomGenerator.paragraph({ sentences: 5 }),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    is_private: false,
  } satisfies IShoppingMallProductInquiry.ICreate;
  const inquiry: IShoppingMallProductInquiry =
    await api.functional.shoppingMall.customer.products.inquiries.create(
      connection,
      {
        productId: product.id,
        body: inquiryBody,
      },
    );
  typia.assert(inquiry);

  // Step 5: Customer favorites the inquiry with notification and label
  const favLabel = RandomGenerator.name(1);
  const favCreateBody = {
    shopping_mall_product_inquiry_id: inquiry.id,
    notification_enabled: true,
    batch_label: favLabel,
  } satisfies IShoppingMallFavoriteInquiry.ICreate;
  const favorite: IShoppingMallFavoriteInquiry =
    await api.functional.shoppingMall.customer.favoriteInquiries.create(
      connection,
      { body: favCreateBody },
    );
  typia.assert(favorite);

  // Step 6: Register another customer and favorite their own inquiry
  const otherCustomerEmail = typia.random<string & tags.Format<"email">>();
  const otherCustomerJoin = {
    shopping_mall_channel_id: sellerChannelId,
    email: otherCustomerEmail,
    password: "OtherPW-9876",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const otherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: otherCustomerJoin,
    });
  typia.assert(otherCustomer);

  // new inquiry by other customer
  const otherInquiryBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    title: RandomGenerator.paragraph({ sentences: 1 }),
    is_private: false,
  } satisfies IShoppingMallProductInquiry.ICreate;
  const otherInquiry: IShoppingMallProductInquiry =
    await api.functional.shoppingMall.customer.products.inquiries.create(
      connection,
      {
        productId: product.id,
        body: otherInquiryBody,
      },
    );
  typia.assert(otherInquiry);

  // favorite by other customer
  const otherFavLabel = RandomGenerator.name(1);
  const otherFavBody = {
    shopping_mall_product_inquiry_id: otherInquiry.id,
    notification_enabled: false,
    batch_label: otherFavLabel,
  } satisfies IShoppingMallFavoriteInquiry.ICreate;
  // Switch to other customer
  await api.functional.auth.customer.join(connection, {
    body: otherCustomerJoin,
  });
  const otherFavorite: IShoppingMallFavoriteInquiry =
    await api.functional.shoppingMall.customer.favoriteInquiries.create(
      connection,
      { body: otherFavBody },
    );
  typia.assert(otherFavorite);

  // Switch back to original customer for all favorite inquiry checks
  await api.functional.auth.customer.join(connection, { body: customerJoin });

  // Step 7: Query favorite inquiries with various filters
  // 7a: Unfiltered (should return their one favorite)
  const unfiltered: IPageIShoppingMallFavoriteInquiry =
    await api.functional.shoppingMall.customer.favoriteInquiries.index(
      connection,
      { body: {} satisfies IShoppingMallFavoriteInquiry.IRequest },
    );
  typia.assert(unfiltered);
  TestValidator.predicate(
    "unfiltered returns 1 result",
    unfiltered.data.length === 1,
  );
  TestValidator.equals(
    "unfiltered has correct favorite id",
    unfiltered.data[0].id,
    favorite.id,
  );

  // 7b: Filter by inquiry id
  const byInquiry: IPageIShoppingMallFavoriteInquiry =
    await api.functional.shoppingMall.customer.favoriteInquiries.index(
      connection,
      {
        body: {
          productId: product.id,
        } satisfies IShoppingMallFavoriteInquiry.IRequest,
      },
    );
  typia.assert(byInquiry);
  TestValidator.equals(
    "filter by product.id result",
    byInquiry.data[0].id,
    favorite.id,
  );

  // 7c: Filter by notification_enabled
  const notifTrue: IPageIShoppingMallFavoriteInquiry =
    await api.functional.shoppingMall.customer.favoriteInquiries.index(
      connection,
      {
        body: {
          notification_enabled: true,
        } satisfies IShoppingMallFavoriteInquiry.IRequest,
      },
    );
  typia.assert(notifTrue);
  TestValidator.equals(
    "notification_enabled true filter returns favorite",
    notifTrue.data[0].id,
    favorite.id,
  );
  TestValidator.equals(
    "favorite notification_enabled is true",
    notifTrue.data[0].notification_enabled,
    true,
  );

  // 7d: Filter by batch_label
  const byLabel: IPageIShoppingMallFavoriteInquiry =
    await api.functional.shoppingMall.customer.favoriteInquiries.index(
      connection,
      {
        body: {
          batch_label: favLabel,
        } satisfies IShoppingMallFavoriteInquiry.IRequest,
      },
    );
  typia.assert(byLabel);
  TestValidator.equals(
    "batch_label filter returns favorite",
    byLabel.data[0].id,
    favorite.id,
  );
  TestValidator.equals(
    "favorite batch_label is correct",
    byLabel.data[0].batch_label,
    favLabel,
  );

  // 8: Paging tests (limit 1, page 1)
  const paging: IPageIShoppingMallFavoriteInquiry =
    await api.functional.shoppingMall.customer.favoriteInquiries.index(
      connection,
      {
        body: {
          limit: 1,
          page: 1,
        } satisfies IShoppingMallFavoriteInquiry.IRequest,
      },
    );
  typia.assert(paging);
  TestValidator.equals("paging returns 1 favorite", paging.data.length, 1);
  TestValidator.equals("paging got correct id", paging.data[0].id, favorite.id);

  // 9: Ensure other customer's favorite is NOT present
  const allFavoriteIds = unfiltered.data.map((fav) => fav.id);
  TestValidator.predicate(
    "other user's favorite is not in result",
    allFavoriteIds.indexOf(otherFavorite.id) === -1,
  );
}

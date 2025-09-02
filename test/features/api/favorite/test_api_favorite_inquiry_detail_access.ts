import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import type { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import type { IShoppingMallAiBackendFavoriteInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteInquiry";
import type { IShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteFolder";

export async function test_api_favorite_inquiry_detail_access(
  connection: api.IConnection,
) {
  /**
   * End-to-end test for retrieving the snapshot and metadata of a customer's
   * favorited inquiry by its ID under a favorite folder.
   *
   * This test covers the following business workflow:
   *
   * 1. Register and authenticate a new customer.
   * 2. Create a favorite folder to organize bookmarks for the customer.
   * 3. Post a new inquiry as the customer.
   * 4. Create a favorite bookmark for this inquiry in the folder.
   * 5. Link the inquiry to the favorite by creating a favorite-inquiry mapping.
   * 6. Retrieve the favorite-inquiry mapping (detail snapshot) using favoriteId
   *    and inquiryId.
   *
   * Each step is validated with type assertions and business logic checks to
   * ensure correct linkage and data integrity.
   */

  // 1. Register a new customer and authenticate
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassw0rd!",
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
    phone_number: RandomGenerator.mobile(),
  };
  const joinAuth = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinAuth);
  TestValidator.equals(
    "customer email matches",
    joinAuth.customer.email,
    joinInput.email,
  );

  // 2. Create a favorite folder for bookmarks
  const folderInput: IShoppingMallAiBackendFavoriteFolder.ICreate = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  };
  const folder =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.createFavoriteFolder(
      connection,
      {
        body: folderInput,
      },
    );
  typia.assert(folder);
  TestValidator.equals("folder name", folder.name, folderInput.name);

  // 3. Post a new inquiry as the customer
  const inquiryInput: IShoppingMallAiBackendInquiry.ICreate = {
    customer_id: joinAuth.customer.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
    private: RandomGenerator.pick([true, false] as const),
    status: RandomGenerator.pick(["open", "answered", "closed"] as const),
  };
  const inquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      {
        body: inquiryInput,
      },
    );
  typia.assert(inquiry);
  TestValidator.equals("inquiry title", inquiry.title, inquiryInput.title);
  TestValidator.equals(
    "inquiry customer",
    inquiry.customer_id,
    joinAuth.customer.id,
  );

  // 4. Create a favorite for the inquiry in the folder
  const favoriteInput: IShoppingMallAiBackendFavorite.ICreate = {
    shopping_mall_ai_backend_customer_id: joinAuth.customer.id,
    shopping_mall_ai_backend_favorite_folder_id: folder.id,
    title_snapshot: inquiry.title,
    target_type: "inquiry",
    target_id_snapshot: inquiry.id,
  };
  const favorite =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      {
        body: favoriteInput,
      },
    );
  typia.assert(favorite);
  TestValidator.equals(
    "favorite target is inquiry",
    favorite.target_type,
    "inquiry",
  );
  TestValidator.equals(
    "favorite folder",
    favorite.shopping_mall_ai_backend_favorite_folder_id,
    folder.id,
  );
  TestValidator.equals(
    "favorite title snapshot",
    favorite.title_snapshot,
    inquiry.title,
  );

  // 5. Link the inquiry to the favorite by creating a favorite-inquiry record
  const favInquiryInput: IShoppingMallAiBackendFavoriteInquiry.ICreate = {
    shopping_mall_ai_backend_favorite_id: favorite.id,
    shopping_mall_ai_backend_inquiry_id: inquiry.id,
    inquiry_snapshot: inquiry.title,
  };
  const favInquiry =
    await api.functional.shoppingMallAiBackend.customer.favorites.inquiries.createFavoriteInquiry(
      connection,
      {
        favoriteId: favorite.id,
        body: favInquiryInput,
      },
    );
  typia.assert(favInquiry);
  TestValidator.equals(
    "favorite inquiry's favorite ID",
    favInquiry.shopping_mall_ai_backend_favorite_id,
    favorite.id,
  );
  TestValidator.equals(
    "favorite inquiry's inquiry ID",
    favInquiry.shopping_mall_ai_backend_inquiry_id,
    inquiry.id,
  );

  // 6. Retrieve the favorited inquiry's details by favoriteId and inquiryId
  const detail =
    await api.functional.shoppingMallAiBackend.customer.favorites.inquiries.atFavoriteInquiry(
      connection,
      {
        favoriteId: favorite.id,
        inquiryId: inquiry.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "retrieved favorite inquiry ID matches",
    detail.id,
    favInquiry.id,
  );
  TestValidator.equals(
    "retrieved favorite inquiry's favorite ID",
    detail.shopping_mall_ai_backend_favorite_id,
    favorite.id,
  );
  TestValidator.equals(
    "retrieved favorite inquiry's inquiry ID",
    detail.shopping_mall_ai_backend_inquiry_id,
    inquiry.id,
  );
  TestValidator.equals(
    "retrieved inquiry snapshot matches",
    detail.inquiry_snapshot,
    favInquiry.inquiry_snapshot,
  );
}

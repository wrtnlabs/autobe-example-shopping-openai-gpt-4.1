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

/**
 * Test access control for favorited inquiry detail: unauthorized/non-owner
 * access is denied
 *
 * This function verifies security/enforcement of customer-specific
 * favorite/inquiry associations. It creates two customers:
 *
 * - Customer 1 creates a favorite folder, posts an inquiry, favorites that
 *   inquiry, and links it
 * - Customer 2 registers (non-owner) and attempts to access Customer 1's
 *   favorite-inquiry detail
 *
 * Steps:
 *
 * 1. Register and authenticate Customer 1 (the owner)
 * 2. Customer 1 creates a favorite folder
 * 3. Customer 1 posts an inquiry
 * 4. Customer 1 creates a favorite for the inquiry in their folder
 * 5. Customer 1 links the inquiry as a favorite
 * 6. Register and authenticate Customer 2 (non-owner)
 * 7. Customer 2 tries to access the favorite-inquiry detail belonging to
 *    Customer 1
 * 8. Assert that the access is denied for unauthorized users (error must be
 *    thrown)
 */
export async function test_api_favorite_inquiry_detail_unauthorized_or_wrong_owner(
  connection: api.IConnection,
) {
  // 1. Register and auth Customer 1
  const joinInput1 = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const authorized1 = await api.functional.auth.customer.join(connection, {
    body: joinInput1,
  });
  typia.assert(authorized1);
  const customer1 = authorized1.customer;

  // 2. Customer 1 creates a favorite folder
  const folderInput = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallAiBackendFavoriteFolder.ICreate;
  const favoriteFolder =
    await api.functional.shoppingMallAiBackend.customer.favoriteFolders.createFavoriteFolder(
      connection,
      { body: folderInput },
    );
  typia.assert(favoriteFolder);

  // 3. Customer 1 posts an inquiry
  const inquiryInput = {
    customer_id: customer1.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    private: true,
    status: "open",
  } satisfies IShoppingMallAiBackendInquiry.ICreate;
  const inquiry =
    await api.functional.shoppingMallAiBackend.customer.inquiries.create(
      connection,
      { body: inquiryInput },
    );
  typia.assert(inquiry);

  // 4. Customer 1 creates a favorite for the inquiry (using above folder)
  const favoriteInput = {
    shopping_mall_ai_backend_customer_id: customer1.id,
    shopping_mall_ai_backend_favorite_folder_id: favoriteFolder.id,
    title_snapshot: inquiry.title,
    target_type: "inquiry",
    target_id_snapshot: inquiry.id,
  } satisfies IShoppingMallAiBackendFavorite.ICreate;
  const favorite =
    await api.functional.shoppingMallAiBackend.customer.favorites.create(
      connection,
      { body: favoriteInput },
    );
  typia.assert(favorite);

  // 5. Customer 1 links the inquiry to the favorite
  const favoriteInquiryInput = {
    shopping_mall_ai_backend_favorite_id: favorite.id,
    shopping_mall_ai_backend_inquiry_id: inquiry.id,
    inquiry_snapshot: inquiry.title,
  } satisfies IShoppingMallAiBackendFavoriteInquiry.ICreate;
  const favoriteInquiry =
    await api.functional.shoppingMallAiBackend.customer.favorites.inquiries.createFavoriteInquiry(
      connection,
      {
        favoriteId: favorite.id,
        body: favoriteInquiryInput,
      },
    );
  typia.assert(favoriteInquiry);

  // 6. Register and authenticate Customer 2 (non-owner)
  const joinInput2 = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const authorized2 = await api.functional.auth.customer.join(connection, {
    body: joinInput2,
  });
  typia.assert(authorized2);

  // 7. Non-owner attempts to fetch the favorited inquiry detail
  await TestValidator.error(
    "non-owner cannot access another customer's favorite-inquiry detail",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.favorites.inquiries.atFavoriteInquiry(
        connection,
        {
          favoriteId: favorite.id,
          inquiryId: inquiry.id,
        },
      );
    },
  );
}

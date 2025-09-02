import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavoriteInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteInquiry";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Add an inquiry to the customer's favorites list for Q&A/bookmarking purposes.
 *
 * Registers a new favorite-inquiry association. Only available to authenticated
 * customers; verifies that the favorite group is owned by the requesting
 * customer and that the mapping does not already exist. Returns metadata for
 * auditing and compliance.
 *
 * @param props - Request properties, including:
 *
 *   - Customer: The authenticated customer (CustomerPayload)
 *   - FavoriteId: The favorite group/folder UUID
 *   - Body: The input for the association
 *       (IShoppingMallAiBackendFavoriteInquiry.ICreate)
 *
 * @returns The newly created favorite-inquiry mapping with all metadata
 * @throws {Error} If favorite group is not owned by customer
 * @throws {Error} If inquiry does not exist
 * @throws {Error} If favorite-inquiry mapping already exists
 */
export async function post__shoppingMallAiBackend_customer_favorites_$favoriteId_inquiries(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendFavoriteInquiry.ICreate;
}): Promise<IShoppingMallAiBackendFavoriteInquiry> {
  const { customer, favoriteId, body } = props;

  // Validate favorite group ownership
  const favorite =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.findFirst({
      where: {
        id: favoriteId,
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
    });
  if (favorite === null) {
    throw new Error(
      "Favorite group not found or not owned by current customer.",
    );
  }

  // Validate inquiry existence
  const inquiry =
    await MyGlobal.prisma.shopping_mall_ai_backend_inquiries.findFirst({
      where: {
        id: body.shopping_mall_ai_backend_inquiry_id,
        deleted_at: null,
      },
    });
  if (inquiry === null) {
    throw new Error("Inquiry not found");
  }

  // Check for duplicate mapping
  const existing =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorite_inquiries.findFirst(
      {
        where: {
          shopping_mall_ai_backend_favorite_id: favoriteId,
          shopping_mall_ai_backend_inquiry_id:
            body.shopping_mall_ai_backend_inquiry_id,
        },
      },
    );
  if (existing !== null) {
    throw new Error(
      "This inquiry is already a favorite in the specified folder",
    );
  }

  // Insert favorite-inquiry mapping
  const id: string & tags.Format<"uuid"> = v4();
  const created_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorite_inquiries.create({
      data: {
        id,
        shopping_mall_ai_backend_favorite_id: favoriteId,
        shopping_mall_ai_backend_inquiry_id:
          body.shopping_mall_ai_backend_inquiry_id,
        inquiry_snapshot: body.inquiry_snapshot ?? null,
        created_at,
      },
    });

  return {
    id,
    shopping_mall_ai_backend_favorite_id: favoriteId,
    shopping_mall_ai_backend_inquiry_id:
      body.shopping_mall_ai_backend_inquiry_id,
    inquiry_snapshot: created.inquiry_snapshot ?? null,
    created_at,
  };
}

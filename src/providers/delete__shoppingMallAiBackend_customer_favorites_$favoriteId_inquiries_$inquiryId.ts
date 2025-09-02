import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Remove an inquiry from the customer's bookmarked favorites folder/group.
 *
 * Deletes a single inquiry association from a customer's favorites group or
 * folder, removing only the bookmark/reference and leaving the original inquiry
 * intact. This operation leverages the composite (favoriteId, inquiryId) key to
 * uniquely identify the favorite-inquiry record.
 *
 * Only the authenticated owner may delete their favorites; if not owned by the
 * requesting customer, or if the association does not exist, an error is
 * raised. Deletion is hard (no soft-delete column), and the original inquiry
 * remains intact. All audit and evidence is preserved per database and platform
 * rules.
 *
 * @param props - Function properties
 * @param props.customer - Authenticated customer payload (must be the owner of
 *   the favorite)
 * @param props.favoriteId - Unique identifier for the favorite entity or group
 * @param props.inquiryId - Unique identifier for the inquiry to unfavorite
 * @returns Void - No return value on success
 * @throws {Error} If the favorite-inquiry mapping does not exist or is not
 *   owned by the customer
 */
export async function delete__shoppingMallAiBackend_customer_favorites_$favoriteId_inquiries_$inquiryId(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
  inquiryId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, favoriteId, inquiryId } = props;

  // Step 1: Attempt to find the mapping by composite unique key
  const mapping =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorite_inquiries.findUnique(
      {
        where: {
          shopping_mall_ai_backend_favorite_id_shopping_mall_ai_backend_inquiry_id:
            {
              shopping_mall_ai_backend_favorite_id: favoriteId,
              shopping_mall_ai_backend_inquiry_id: inquiryId,
            },
        },
      },
    );
  if (!mapping) {
    throw new Error(
      "Favorite-inquiry mapping not found or already deleted: cannot remove inquiry from favorites.",
    );
  }

  // Step 2: Ownership authorization - only customer owner may delete
  const favorite =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.findUnique({
      where: { id: favoriteId },
      select: { shopping_mall_ai_backend_customer_id: true },
    });
  if (
    !favorite ||
    favorite.shopping_mall_ai_backend_customer_id !== customer.id
  ) {
    throw new Error(
      "Unauthorized: This favorite does not belong to the authenticated customer.",
    );
  }

  // Step 3: Delete the mapping (no soft-delete on this model)
  await MyGlobal.prisma.shopping_mall_ai_backend_favorite_inquiries.delete({
    where: {
      shopping_mall_ai_backend_favorite_id_shopping_mall_ai_backend_inquiry_id:
        {
          shopping_mall_ai_backend_favorite_id: favoriteId,
          shopping_mall_ai_backend_inquiry_id: inquiryId,
        },
    },
  });
  // No response value (void)
}

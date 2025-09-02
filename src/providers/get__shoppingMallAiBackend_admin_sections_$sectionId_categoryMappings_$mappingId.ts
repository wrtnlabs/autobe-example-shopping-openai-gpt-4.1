import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendChannelCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategoryMapping";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get detailed channel section-category mapping by mappingId.
 *
 * Retrieve all details pertaining to a specific section-to-category mapping,
 * identified by mappingId, under a given sectionId. This API is instrumental
 * for admins or operators managing channel navigation structures, analytics
 * configurations, or synchronizations. Security considerations require
 * authorization as an admin or system operator. If mapping does not exist, a
 * 404 is returned.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin making the request
 *   (authorization checked)
 * @param props.sectionId - Unique identifier for the channel section (UUID)
 * @param props.mappingId - Unique identifier for the section/category mapping
 *   (UUID)
 * @returns Full details of the section-category mapping, including both section
 *   and category references
 * @throws {Error} If admin is not authorized or not active, or if mapping does
 *   not exist
 */
export async function get__shoppingMallAiBackend_admin_sections_$sectionId_categoryMappings_$mappingId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  mappingId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendChannelCategoryMapping> {
  const { admin, sectionId, mappingId } = props;

  // Authorization: Ensure admin is active and not soft-deleted
  const adminRecord =
    await MyGlobal.prisma.shopping_mall_ai_backend_admins.findFirst({
      where: {
        id: admin.id,
        is_active: true,
        deleted_at: null,
      },
    });
  if (!adminRecord) {
    throw new Error(
      "Unauthorized: Admin account is not active or does not exist",
    );
  }

  // Retrieve the mapping, matching both section and mapping PK for strict scoping
  const mapping =
    await MyGlobal.prisma.shopping_mall_ai_backend_channel_category_mappings.findFirst(
      {
        where: {
          id: mappingId,
          shopping_mall_ai_backend_channel_section_id: sectionId,
        },
        select: {
          id: true,
          shopping_mall_ai_backend_channel_section_id: true,
          shopping_mall_ai_backend_channel_category_id: true,
          created_at: true,
        },
      },
    );
  if (!mapping) {
    throw new Error("Mapping not found");
  }

  return {
    id: mapping.id,
    shopping_mall_ai_backend_channel_section_id:
      mapping.shopping_mall_ai_backend_channel_section_id,
    shopping_mall_ai_backend_channel_category_id:
      mapping.shopping_mall_ai_backend_channel_category_id,
    created_at: toISOStringSafe(mapping.created_at),
  };
}

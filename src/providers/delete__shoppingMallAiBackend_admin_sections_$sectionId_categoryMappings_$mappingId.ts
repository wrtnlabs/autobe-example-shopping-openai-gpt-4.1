import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Soft delete a channel section-category mapping by mappingId.
 *
 * Removes an existing mapping between a channel section and category by
 * mappingId, using a soft delete (sets deleted_at). Only accessible by admins.
 * Throws 404 if not found.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin performing the operation
 * @param props.sectionId - Unique identifier for the channel section (UUID)
 * @param props.mappingId - Unique identifier for the mapping (UUID)
 * @returns Void
 * @throws {Error} When the mapping does not exist or is already deleted
 */
export async function delete__shoppingMallAiBackend_admin_sections_$sectionId_categoryMappings_$mappingId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  mappingId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, sectionId, mappingId } = props;
  const result =
    await MyGlobal.prisma.shopping_mall_ai_backend_channel_category_mappings.updateMany(
      {
        where: {
          id: mappingId,
          shopping_mall_ai_backend_channel_section_id: sectionId,
          // DO NOT include deleted_at in where clause
        },
        data: {
          deleted_at: toISOStringSafe(new Date()),
        },
      },
    );

  if (result.count === 0) {
    throw new Error("Channel section-category mapping not found");
  }
  // Success returns void
}

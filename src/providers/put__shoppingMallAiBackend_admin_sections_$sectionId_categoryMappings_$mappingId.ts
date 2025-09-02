import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendChannelCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategoryMapping";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a channel section-category mapping by mappingId.
 *
 * Update details of a specific section-to-category mapping identified by
 * mappingId within a given sectionId. This operation permits modification of
 * mapping keys or associated properties to reflect evolving business rules.
 * Authorization by admin required. Changes are audited for evidence and
 * compliance. Not available for public users.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing the update
 * @param props.sectionId - The UUID of the channel section to scope the mapping
 *   by
 * @param props.mappingId - The UUID of the section-category mapping (row
 *   primary key)
 * @param props.body - Data containing optional new section/category
 *   reference(s)
 * @returns Updated mapping information after the update is applied
 * @throws {Error} When the target mapping is not found or does not belong to
 *   the specified section
 * @throws {Error} When update violates business or referential integrity (e.g.,
 *   non-existent section/category)
 */
export async function put__shoppingMallAiBackend_admin_sections_$sectionId_categoryMappings_$mappingId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  mappingId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendChannelCategoryMapping.IUpdate;
}): Promise<IShoppingMallAiBackendChannelCategoryMapping> {
  const { admin, sectionId, mappingId, body } = props;

  // Find mapping by id and sectionId to ensure the mapping is scoped correctly
  const mapping =
    await MyGlobal.prisma.shopping_mall_ai_backend_channel_category_mappings.findFirst(
      {
        where: {
          id: mappingId,
          shopping_mall_ai_backend_channel_section_id: sectionId,
        },
      },
    );
  if (!mapping) throw new Error("Mapping not found");

  // Update only allowed fields from the body if they're present
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_channel_category_mappings.update(
      {
        where: { id: mappingId },
        data: {
          shopping_mall_ai_backend_channel_section_id:
            body.shopping_mall_ai_backend_channel_section_id ?? undefined,
          shopping_mall_ai_backend_channel_category_id:
            body.shopping_mall_ai_backend_channel_category_id ?? undefined,
        },
      },
    );

  // Return DTO with branded created_at
  return {
    id: updated.id,
    shopping_mall_ai_backend_channel_section_id:
      updated.shopping_mall_ai_backend_channel_section_id,
    shopping_mall_ai_backend_channel_category_id:
      updated.shopping_mall_ai_backend_channel_category_id,
    created_at: toISOStringSafe(updated.created_at),
  };
}

import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendChannelCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategoryMapping";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new channel section-category mapping.
 *
 * Create a new mapping between the channel section identified by sectionId and
 * a target channel category or business entity. Used by administrators to
 * extend navigation, enable analytics-specific taxonomies, or create
 * channel-specific category overlays. Authorization required (admin only). If
 * mapping with the same composite keys exists, an error is returned.
 *
 * @param props - Request payload
 * @param props.admin - Authenticated admin user (required for admin
 *   authorization)
 * @param props.sectionId - Unique identifier of the parent channel section
 *   (UUID).
 * @param props.body - Information needed to create a new mapping between the
 *   channel section and the target category.
 * @returns Details of the newly created channel section-category mapping
 * @throws {Error} If the mapping already exists for the given section and
 *   category
 * @throws {Error} If the referenced channel section or category does not exist
 */
export async function post__shoppingMallAiBackend_admin_sections_$sectionId_categoryMappings(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendChannelCategoryMapping.ICreate;
}): Promise<IShoppingMallAiBackendChannelCategoryMapping> {
  const { admin, sectionId, body } = props;

  // Check for existing mapping to enforce uniqueness constraint
  const duplicate =
    await MyGlobal.prisma.shopping_mall_ai_backend_channel_category_mappings.findFirst(
      {
        where: {
          shopping_mall_ai_backend_channel_section_id: sectionId,
          shopping_mall_ai_backend_channel_category_id:
            body.shopping_mall_ai_backend_channel_category_id,
        },
      },
    );
  if (duplicate) {
    throw new Error(
      "Mapping already exists for this section and category. Duplicate mappings are not allowed.",
    );
  }

  // Explicitly check that both the section and category exist for clearer errors
  const [section, category] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_channel_sections.findUnique({
      where: { id: sectionId },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_channel_categories.findUnique({
      where: { id: body.shopping_mall_ai_backend_channel_category_id },
    }),
  ]);

  if (!section) {
    throw new Error("Channel section not found");
  }
  if (!category) {
    throw new Error("Channel category not found");
  }

  // Insert the new mapping
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_channel_category_mappings.create(
      {
        data: {
          id: v4(),
          shopping_mall_ai_backend_channel_section_id: sectionId,
          shopping_mall_ai_backend_channel_category_id:
            body.shopping_mall_ai_backend_channel_category_id,
          created_at: now,
        },
      },
    );

  // Map result to API DTO, converting Date to iso string via toISOStringSafe
  return {
    id: created.id,
    shopping_mall_ai_backend_channel_section_id:
      created.shopping_mall_ai_backend_channel_section_id,
    shopping_mall_ai_backend_channel_category_id:
      created.shopping_mall_ai_backend_channel_category_id,
    created_at: toISOStringSafe(created.created_at),
  };
}

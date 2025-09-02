import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendChannelSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelSection";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Adds a new nested or root section to a sales channel.
 *
 * Creates a new storefront section under a specified channel, configuring
 * homepage, category, or feature areas. This operation allows administrators to
 * add new navigation or presentation areas on the sales channel. The section is
 * organized according to the tree structure in the
 * shopping_mall_ai_backend_channel_sections table. Only authorized
 * administrators can create sections. The section will be included in
 * subsequent storefront navigation and configuration listings.
 *
 * @param props - Request properties
 * @param props.admin - System operators with elevated permissions for managing
 *   users, maintaining compliance, and setting global configurations.
 * @param props.channelId - Parent channel's unique identifier (UUID)
 * @param props.body - New section's business and configuration parameters
 * @returns The newly created channel section record (all fields populated)
 * @throws {Error} When duplicate section code (per channel), invalid parent
 *   section, or insufficient permissions
 */
export async function post__shoppingMallAiBackend_admin_channels_$channelId_sections(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendChannelSection.ICreate;
}): Promise<IShoppingMallAiBackendChannelSection> {
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;
  try {
    const created =
      await MyGlobal.prisma.shopping_mall_ai_backend_channel_sections.create({
        data: {
          id,
          shopping_mall_ai_backend_channel_id: props.channelId,
          code: props.body.code,
          name: props.body.name,
          parent_id: props.body.parent_id ?? null,
          description: props.body.description ?? null,
          order: props.body.order,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    return {
      id: created.id as string & tags.Format<"uuid">,
      shopping_mall_ai_backend_channel_id:
        created.shopping_mall_ai_backend_channel_id as string &
          tags.Format<"uuid">,
      code: created.code,
      name: created.name,
      parent_id: created.parent_id ?? null,
      description: created.description ?? null,
      order: created.order,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (err) {
    // Error handling can be improved (e.g., for Prisma unique constraint or FK errors)
    throw err;
  }
}

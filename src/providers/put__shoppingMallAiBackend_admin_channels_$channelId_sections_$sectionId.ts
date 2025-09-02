import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendChannelSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelSection";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update a sales channel section's business details (name, code, parent, order,
 * description).
 *
 * Updates a specific channel section for a given channelId and sectionId.
 * Allows admins to modify display name, code, order, parent (hierarchical
 * tree), and business description. Performs uniqueness and reference checks (no
 * code collision, no dangling parent, no cyclic parent, all in the same
 * channel, no referencing deleted nodes). This supports maintenance of channel
 * navigation, taxonomy, and personalization.
 *
 * @param props Request properties
 * @param props.admin Admin user context with elevated permissions to perform
 *   the update
 * @param props.channelId Target channel's unique identifier (UUID)
 * @param props.sectionId Target section's unique identifier (UUID)
 * @param props.body Fields for updating the channel section (code, name,
 *   parent_id, description, order)
 * @returns The updated channel section entity
 * @throws {Error} When admin authentication is missing or invalid
 * @throws {Error} When section does not exist, has been deleted, or the
 *   code/parent constraints are violated
 */
export async function put__shoppingMallAiBackend_admin_channels_$channelId_sections_$sectionId(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  sectionId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendChannelSection.IUpdate;
}): Promise<IShoppingMallAiBackendChannelSection> {
  const { admin, channelId, sectionId, body } = props;

  if (!admin || admin.type !== "admin") {
    throw new Error("Unauthorized: admin required");
  }

  // Step 1: Fetch existing section (must not be soft-deleted)
  const section =
    await MyGlobal.prisma.shopping_mall_ai_backend_channel_sections.findFirst({
      where: {
        id: sectionId,
        shopping_mall_ai_backend_channel_id: channelId,
        deleted_at: null,
      },
    });
  if (!section) {
    throw new Error("Section not found or has been deleted");
  }

  // Step 2: Code uniqueness validation (if updating code)
  if (body.code && body.code !== section.code) {
    const codeExists =
      await MyGlobal.prisma.shopping_mall_ai_backend_channel_sections.findFirst(
        {
          where: {
            shopping_mall_ai_backend_channel_id: channelId,
            code: body.code,
            id: { not: sectionId },
            deleted_at: null,
          },
        },
      );
    if (codeExists) {
      throw new Error("Section code must be unique within the channel");
    }
  }

  // Step 3: Parent validation (if updating parent_id)
  if (body.parent_id !== undefined) {
    if (body.parent_id === sectionId) {
      throw new Error("A section cannot be its own parent");
    }
    if (body.parent_id !== null) {
      const parent =
        await MyGlobal.prisma.shopping_mall_ai_backend_channel_sections.findFirst(
          {
            where: {
              id: body.parent_id,
              shopping_mall_ai_backend_channel_id: channelId,
              deleted_at: null,
            },
          },
        );
      if (!parent) {
        throw new Error(
          "Parent section not found, deleted, or belongs to a different channel",
        );
      }
    }
  }

  // Step 4: Update section with only supplied fields (immutable, functional structure)
  const updated =
    await MyGlobal.prisma.shopping_mall_ai_backend_channel_sections.update({
      where: { id: sectionId },
      data: {
        code: body.code ?? undefined,
        name: body.name ?? undefined,
        parent_id: body.parent_id ?? undefined,
        description: body.description ?? undefined,
        order: body.order ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Step 5: Map DB result to DTO, branding all date fields and propagating nullable
  return {
    id: updated.id,
    shopping_mall_ai_backend_channel_id:
      updated.shopping_mall_ai_backend_channel_id,
    parent_id: typeof updated.parent_id === "string" ? updated.parent_id : null,
    code: updated.code,
    name: updated.name,
    description: updated.description ?? null,
    order: updated.order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}

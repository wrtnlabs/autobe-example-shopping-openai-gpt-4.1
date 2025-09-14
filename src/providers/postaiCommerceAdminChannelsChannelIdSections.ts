import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSection";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new section for a given sales channel (ai_commerce_sections).
 *
 * Creates a merchandising or discovery section entity in the target channel,
 * enforcing code and name uniqueness under the channel scope. If a section with
 * the same code or name exists (soft-deleted excluded), the operation will
 * fail. Upon successful creation, an audit log is persisted to the system audit
 * log table. Only admin-level users may perform this operation.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user payload
 * @param props.channelId - UUID of the channel under which to create the new
 *   section
 * @param props.body - New section creation details adhering to
 *   IAiCommerceSection.ICreate structure
 * @returns The newly created section as stored in the ai_commerce_sections
 *   table
 * @throws {Error} If code or name are not unique within the channel
 */
export async function postaiCommerceAdminChannelsChannelIdSections(props: {
  admin: AdminPayload;
  channelId: string & tags.Format<"uuid">;
  body: IAiCommerceSection.ICreate;
}): Promise<IAiCommerceSection> {
  // Uniqueness check: code OR name uniqueness required per channel, excluding soft-deleted records
  const uniquenessConflict =
    await MyGlobal.prisma.ai_commerce_sections.findFirst({
      where: {
        ai_commerce_channel_id: props.channelId,
        deleted_at: null,
        OR: [{ code: props.body.code }, { name: props.body.name }],
      },
    });
  if (uniquenessConflict !== null) {
    throw new Error(
      "A section with the same code or name already exists within the specified channel.",
    );
  }

  // Prepare ids and timestamps (UUID type is satisfied naturally by v4 return type)
  const id = v4();
  const now = toISOStringSafe(new Date());

  // Create the new section
  const newSection = await MyGlobal.prisma.ai_commerce_sections.create({
    data: {
      id,
      ai_commerce_channel_id: props.channelId,
      code: props.body.code,
      name: props.body.name,
      is_active: props.body.is_active,
      business_status: props.body.business_status,
      sort_order: props.body.sort_order,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Audit log system event for compliance and traceability
  await MyGlobal.prisma.ai_commerce_audit_logs_system.create({
    data: {
      id: v4(),
      event_type: "CREATE_SECTION",
      actor_id: props.admin.id,
      target_table: "ai_commerce_sections",
      target_id: id,
      before: null,
      after: JSON.stringify({
        id: newSection.id,
        ai_commerce_channel_id: newSection.ai_commerce_channel_id,
        code: newSection.code,
        name: newSection.name,
        is_active: newSection.is_active,
        business_status: newSection.business_status,
        sort_order: newSection.sort_order,
        created_at: newSection.created_at,
        updated_at: newSection.updated_at,
        deleted_at: newSection.deleted_at ?? null,
      }),
      created_at: now,
    },
  });

  // Respond with normalized object matching IAiCommerceSection structure and date/uuid types
  return {
    id: newSection.id,
    ai_commerce_channel_id: newSection.ai_commerce_channel_id,
    code: newSection.code,
    name: newSection.name,
    is_active: newSection.is_active,
    business_status: newSection.business_status,
    sort_order: newSection.sort_order,
    created_at: newSection.created_at,
    updated_at: newSection.updated_at,
    deleted_at: newSection.deleted_at ?? null,
  };
}

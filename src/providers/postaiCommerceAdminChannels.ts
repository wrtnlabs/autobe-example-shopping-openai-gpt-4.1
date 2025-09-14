import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new aiCommerce sales channel (admin only).
 *
 * This operation enables platform administrators to onboard a new sales channel
 * (such as a web/app portal or external partner) to the aiCommerce system. It
 * requires a unique business code, display name, locale/region, activation
 * flag, and initial business workflow status. Only authenticated admins may
 * perform this action.
 *
 * The created channel is persisted with a new UUID primary key, all date fields
 * are set to the current instant, and the record is initialized with deleted_at
 * as null (active). The returned object contains all persisted channel fields,
 * formatted according to platform contract.
 *
 * @param props - Object containing:
 *
 *   - Admin: AdminPayload for authentication/authorization
 *   - Body: IAiCommerceChannel.ICreate (required: code, name, locale, is_active,
 *       business_status)
 *
 * @returns The persisted channel as IAiCommerceChannel with all fields
 *   populated
 * @throws {Error} If channel with duplicate code exists or other schema
 *   constraints fail
 */
export async function postaiCommerceAdminChannels(props: {
  admin: AdminPayload;
  body: IAiCommerceChannel.ICreate;
}): Promise<IAiCommerceChannel> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.ai_commerce_channels.create({
    data: {
      id: v4(),
      code: props.body.code,
      name: props.body.name,
      locale: props.body.locale,
      is_active: props.body.is_active,
      business_status: props.body.business_status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    code: created.code,
    name: created.name,
    locale: created.locale,
    is_active: created.is_active,
    business_status: created.business_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ?? null,
  };
}

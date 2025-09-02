import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new sales channel for a web, app, or affiliate storefront.
 *
 * This operation creates a new sales channel representing a separate business
 * storefront, localized entity, or operational domain. The request must provide
 * a unique code, name, region configuration, language, and legal compliance
 * data. Only administrative users are permitted to create channels.
 *
 * Upon successful channel creation, returns the full entity as stored in the
 * shopping_mall_ai_backend_channels table. Enforces business validation such as
 * unique code per channel, region compliance, and configuration completeness.
 * Handles error scenarios including duplicate codes, validation failures, or
 * lack of authorization.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user performing the operation
 * @param props.body - Information and configuration for the new sales channel
 * @returns Information of the newly created sales channel
 * @throws {Error} When the channel code is already used, or if authorization
 *   requirements are not met
 */
export async function post__shoppingMallAiBackend_admin_channels(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendChannel.ICreate;
}): Promise<IShoppingMallAiBackendChannel> {
  const { admin, body } = props;

  // Check for unique channel code among non-deleted channels
  const duplicate =
    await MyGlobal.prisma.shopping_mall_ai_backend_channels.findFirst({
      where: {
        code: body.code,
        deleted_at: null,
      },
    });
  if (duplicate) {
    throw new Error("Channel code already exists");
  }

  // Assign all fields, convert all dates to string & tags.Format<'date-time'>
  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.shopping_mall_ai_backend_channels.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        country: body.country,
        currency: body.currency,
        language: body.language,
        timezone: body.timezone,
        created_at: now,
        updated_at: now,
      },
    });

  // Return all API contract fields, converting dates if needed
  return {
    id: created.id,
    code: created.code,
    name: created.name,
    description: created.description,
    country: created.country,
    currency: created.currency,
    language: created.language,
    timezone: created.timezone,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}

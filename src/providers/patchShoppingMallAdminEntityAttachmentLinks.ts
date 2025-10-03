import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallEntityAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEntityAttachmentLink";
import { IPageIShoppingMallEntityAttachmentLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallEntityAttachmentLink";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminEntityAttachmentLinks(props: {
  admin: AdminPayload;
  body: IShoppingMallEntityAttachmentLink.IRequest;
}): Promise<IPageIShoppingMallEntityAttachmentLink> {
  const { body } = props;

  // Prepare pagination
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 25;
  const skip = (page - 1) * limit;

  // Sorting
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (body.sort) {
    let sortField = body.sort;
    let sortOrder: "asc" | "desc" = "desc";
    if (typeof sortField === "string" && sortField.startsWith("-")) {
      sortField = sortField.slice(1);
      sortOrder = "desc";
    } else if (typeof sortField === "string" && sortField.startsWith("+")) {
      sortField = sortField.slice(1);
      sortOrder = "asc";
    } else {
      sortOrder = "asc";
    }
    // Only allow sort fields that exist in schema
    if (
      [
        "id",
        "shopping_mall_attachment_id",
        "entity_type",
        "entity_id",
        "linked_by_user_id",
        "purpose",
        "visible_to_roles",
        "created_at",
        "deleted_at",
      ].includes(sortField)
    ) {
      orderBy = { [sortField]: sortOrder };
    }
  }

  // Filtering (where)
  const where: Record<string, any> = {
    ...(body.entity_type !== undefined && { entity_type: body.entity_type }),
    ...(body.entity_id !== undefined && { entity_id: body.entity_id }),
    ...(body.attachment_id !== undefined && {
      shopping_mall_attachment_id: body.attachment_id,
    }),
    ...(body.purpose !== undefined && { purpose: body.purpose }),
    ...(body.visible_to_roles !== undefined && {
      visible_to_roles: body.visible_to_roles,
    }),
    // Deleted state
    ...(body.deleted_state === "deleted"
      ? { deleted_at: { not: null } }
      : body.deleted_state === "all"
        ? {}
        : { deleted_at: null }),
  };

  // Fetch paginated and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_entity_attachment_links.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_entity_attachment_links.count({ where }),
  ]);

  // Map and convert types
  const data: IShoppingMallEntityAttachmentLink[] = rows.map((row) => ({
    id: row.id,
    shopping_mall_attachment_id: row.shopping_mall_attachment_id,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    linked_by_user_id: row.linked_by_user_id,
    purpose: row.purpose ?? undefined,
    visible_to_roles: row.visible_to_roles ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  const pagination: IPage.IPagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil((total || 1) / (limit || 1)),
  };

  return { pagination, data };
}

import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAttachment";
import { IPageIShoppingMallAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAttachments(props: {
  admin: AdminPayload;
  body: IShoppingMallAttachment.IRequest;
}): Promise<IPageIShoppingMallAttachment> {
  const { body } = props;
  const page = typeof body.page === "number" && body.page > 0 ? body.page : 1;
  const limit =
    typeof body.limit === "number" && body.limit > 0 ? body.limit : 20;

  if (limit > 100) {
    throw new HttpException("limit must not exceed 100", 400);
  }

  // Parse sort (default: created_at desc)
  let sortField: "created_at" | "filename" | "file_extension" | "size_bytes" =
    "created_at";
  let sortOrder: "asc" | "desc" = "desc";
  if (body.sort) {
    const [field, order] = body.sort.split(" ");
    if (
      ["created_at", "filename", "file_extension", "size_bytes"].includes(field)
    ) {
      sortField = field as typeof sortField;
    }
    if (["asc", "desc"].includes((order || "").toLowerCase())) {
      sortOrder = order.toLowerCase() as "asc" | "desc";
    }
  }

  const where: Record<string, any> = {
    ...(body.filename !== undefined &&
      body.filename.length > 0 && {
        filename: { contains: body.filename },
      }),
    ...(body.file_extension !== undefined &&
      body.file_extension.length > 0 && {
        file_extension: { contains: body.file_extension },
      }),
    ...(body.mime_type !== undefined &&
      body.mime_type.length > 0 && {
        mime_type: { contains: body.mime_type },
      }),
    ...(body.permission_scope !== undefined &&
      body.permission_scope.length > 0 && {
        permission_scope: { contains: body.permission_scope },
      }),
    ...(body.logical_source !== undefined &&
      body.logical_source.length > 0 && {
        logical_source: { contains: body.logical_source },
      }),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined && {
              gte: body.created_at_from,
            }),
            ...(body.created_at_to !== undefined && {
              lte: body.created_at_to,
            }),
          },
        }
      : {}),
    ...(body.deleted_at === true && {
      deleted_at: { not: null },
    }),
    ...(body.deleted_at === false && {
      deleted_at: null,
    }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_attachments.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_attachments.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    filename: row.filename,
    file_extension: row.file_extension,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    server_url: row.server_url,
    public_accessible: row.public_accessible,
    permission_scope:
      typeof row.permission_scope === "string"
        ? row.permission_scope
        : undefined,
    logical_source:
      typeof row.logical_source === "string" ? row.logical_source : undefined,
    hash_md5: row.hash_md5,
    description:
      typeof row.description === "string" ? row.description : undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== null ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}

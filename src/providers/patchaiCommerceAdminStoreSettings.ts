import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStoreSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStoreSetting";
import { IPageIAiCommerceStoreSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceStoreSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a paginated list of store settings
 * (ai_commerce_store_settings).
 *
 * Retrieves configuration entries for stores, supporting advanced admin-driven
 * filtering, search, and sorted pagination. Each result summarizes the
 * setting's id, key, value, and timestamps. Results can be filtered by store,
 * active status, key/value substring, and paginated or sorted as requested.
 * Only accessible by admins (authorization required). Query accesses are
 * subject to audit logging and enforced by business rules, with strict field
 * validation and safety for all supported database engines.
 *
 * @param props - Operation props with authenticated admin and
 *   search/filter/pagination body
 * @param props.admin - The authenticated admin user making the request
 * @param props.body - Search and filter parameters (store_id, active, key,
 *   value, page, limit, sort)
 * @returns Paginated summary DTO of matched store settings with type-safe
 *   pagination
 * @throws {Error} If any database or access error occurs
 */
export async function patchaiCommerceAdminStoreSettings(props: {
  admin: AdminPayload;
  body: IAiCommerceStoreSetting.IRequest;
}): Promise<IPageIAiCommerceStoreSetting.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build filtering logic
  const where = {
    deleted_at: null,
    ...(body.store_id !== undefined &&
      body.store_id !== null && { store_id: body.store_id }),
    ...(body.active !== undefined &&
      body.active !== null && { active: body.active }),
    // key/value are in settings_json, will filter below
  };

  // Sort parsing: Accepts 'field direction', defaults to 'created_at desc'
  let orderByField: "created_at" | "updated_at" = "created_at";
  let orderByDir: "asc" | "desc" = "desc";
  if (typeof body.sort === "string") {
    const parts = body.sort.trim().split(/\s+/);
    if (
      parts.length === 2 &&
      (parts[0] === "created_at" || parts[0] === "updated_at") &&
      (parts[1].toLowerCase() === "asc" || parts[1].toLowerCase() === "desc")
    ) {
      orderByField = parts[0] as typeof orderByField;
      orderByDir = parts[1].toLowerCase() as typeof orderByDir;
    }
  }

  // Query for raw settings
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_store_settings.findMany({
      where,
      orderBy: { [orderByField]: orderByDir },
      skip,
      take: limit,
      select: {
        id: true,
        settings_json: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_store_settings.count({ where }),
  ]);

  // Now, filter key/value in JavaScript if requested
  const filtered = rows.filter((row) => {
    let isMatch = true;
    let parsed: { key?: string; value?: string } = {};
    try {
      parsed = JSON.parse(row.settings_json ?? "{}");
    } catch {
      parsed = {};
    }
    if (
      body.key &&
      (typeof parsed.key !== "string" || !parsed.key.includes(body.key))
    )
      isMatch = false;
    if (
      body.value &&
      (typeof parsed.value !== "string" || !parsed.value.includes(body.value))
    )
      isMatch = false;
    return isMatch;
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: filtered.length,
      pages: Math.ceil(filtered.length / limit),
    },
    data: filtered.map((row) => {
      let parsed: { key?: string; value?: string } = {};
      try {
        parsed = JSON.parse(row.settings_json ?? "{}");
      } catch {
        parsed = {};
      }
      return {
        id: row.id,
        key: typeof parsed.key === "string" ? parsed.key : "",
        value: typeof parsed.value === "string" ? parsed.value : "",
        created_at: toISOStringSafe(row.created_at),
        updated_at: toISOStringSafe(row.updated_at),
      };
    }),
  };
}

import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCodebook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCodebook";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new codebook for structuring a business dictionary or lookup values.
 *
 * Admin users provide code, name, and optional description/details. System
 * validates uniqueness of code and stores the entity with full timestamps. This
 * enables dynamic, admin-managed extension of business logic dictionaries.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing codebook creation
 * @param props.body - The codebook creation details (code, name, description)
 * @returns Newly created codebook metadata with all fields populated
 * @throws {Error} If admin is missing (unauthorized)
 * @throws {Error} If code is not unique (duplicate code constraint violation)
 */
export async function post__shoppingMallAiBackend_admin_codebooks(props: {
  admin: AdminPayload;
  body: IShoppingMallAiBackendCodebook.ICreate;
}): Promise<IShoppingMallAiBackendCodebook> {
  const { admin, body } = props;
  if (!admin) throw new Error("Unauthorized: admin required");

  const id: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  try {
    const created =
      await MyGlobal.prisma.shopping_mall_ai_backend_codebooks.create({
        data: {
          id,
          code: body.code,
          name: body.name,
          description: body.description ?? null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    return {
      id: created.id,
      code: created.code,
      name: created.name,
      description: created.description ?? null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      Array.isArray(err.meta?.target) &&
      err.meta?.target.includes("code")
    ) {
      throw new Error("Codebook code must be unique");
    }
    throw err;
  }
}

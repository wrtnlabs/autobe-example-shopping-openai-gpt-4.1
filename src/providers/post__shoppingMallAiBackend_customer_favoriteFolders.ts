import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavoriteFolder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteFolder";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Creates a new customer-defined favorite folder for organizing favorite
 * products, addresses, inquiries, or bookmarks.
 *
 * This endpoint is restricted to authenticated customers. It enforces that
 * folder names must be unique per customer, and records creation and update
 * timestamps along with folder group metadata. If a folder with the same name
 * already exists for the customer, throws an error.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer payload
 * @param props.body - Folder creation request (name: required, description:
 *   optional)
 * @returns Newly created favorite folder's full metadata and configuration for
 *   the customer's account
 * @throws {Error} If the folder name already exists for this customer (unique
 *   constraint violation)
 */
export async function post__shoppingMallAiBackend_customer_favoriteFolders(props: {
  customer: CustomerPayload;
  body: IShoppingMallAiBackendFavoriteFolder.ICreate;
}): Promise<IShoppingMallAiBackendFavoriteFolder> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  try {
    const created =
      await MyGlobal.prisma.shopping_mall_ai_backend_favorite_folders.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          shopping_mall_ai_backend_customer_id: props.customer.id,
          name: props.body.name,
          description: props.body.description ?? null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    return {
      id: created.id,
      shopping_mall_ai_backend_customer_id:
        created.shopping_mall_ai_backend_customer_id,
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
      Array.isArray(
        (err.meta as Record<string, unknown> | undefined)?.target,
      ) &&
      ((err.meta as Record<string, unknown>)?.target as string[]).includes(
        "shopping_mall_ai_backend_customer_id",
      ) &&
      ((err.meta as Record<string, unknown>)?.target as string[]).includes(
        "name",
      )
    ) {
      throw new Error(
        "A favorite folder with this name already exists for this customer.",
      );
    }
    throw err;
  }
}

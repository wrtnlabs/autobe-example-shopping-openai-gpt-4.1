import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendMileageTransaction";
import { IPageIShoppingMallAiBackendMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendMileageTransaction";
import { IPage_IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage_IPagination";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Paginate and search the full transaction history for a single mileage ledger.
 *
 * Returns a paginated and filterable ledger of all transaction (accrual, usage,
 * manual/admin/incident) records for a specific mileage ledger, referenced by
 * mileageId. Displayed transaction history supports customer, seller, admin,
 * and support workflows for rewards program management and auditing. Underlying
 * schema: shopping_mall_ai_backend_mileage_transactions. Only ledgers owned
 * by—or visible to—the authenticated customer, seller, or admin may be queried.
 * Designed for dashboards, dispute handling, and program analytics.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer requesting their own
 *   mileage transactions
 * @param props.mileageId - UUID of the mileage ledger for which to fetch
 *   transactions
 * @param props.body - Pagination and filtering input (page, limit)
 * @returns Paginated transaction summary for all events in the mileage ledger,
 *   only if owned by the customer
 * @throws {Error} When mileage ledger does not exist, is deleted, or is not
 *   owned by this customer
 */
export async function patch__shoppingMallAiBackend_customer_mileages_$mileageId_transactions(props: {
  customer: CustomerPayload;
  mileageId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendMileageTransaction.IRequest;
}): Promise<IPageIShoppingMallAiBackendMileageTransaction.ISummary> {
  const { customer, mileageId, body } = props;

  // 1. Access control: verify ownership
  const mileage =
    await MyGlobal.prisma.shopping_mall_ai_backend_mileages.findFirst({
      where: {
        id: mileageId,
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
    });
  if (!mileage) {
    throw new Error(
      "Forbidden: You do not own this mileage ledger or it does not exist",
    );
  }

  // Pagination: use provided values or defaults
  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 20;
  const page = Number(pageRaw);
  const limit = Number(limitRaw);
  const offset = (page - 1) * limit;

  // Query data and count
  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_mileage_transactions.findMany({
      where: {
        shopping_mall_ai_backend_mileage_id: mileageId,
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        shopping_mall_ai_backend_mileage_id: true,
        change_type: true,
        amount: true,
        transaction_reference: true,
        mileage_before: true,
        mileage_after: true,
        reason_code: true,
        description: true,
        created_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_mileage_transactions.count({
      where: {
        shopping_mall_ai_backend_mileage_id: mileageId,
        deleted_at: null,
      },
    }),
  ]);

  return {
    pagination: {
      current: page as number & tags.Type<"int32">,
      limit: limit as number & tags.Type<"int32">,
      records: total as number & tags.Type<"int32">,
      pages: Math.ceil(total / limit) as number & tags.Type<"int32">,
    },
    data: items.map((row) => ({
      id: row.id,
      shopping_mall_ai_backend_mileage_id:
        row.shopping_mall_ai_backend_mileage_id,
      change_type: row.change_type,
      amount: row.amount,
      transaction_reference: row.transaction_reference ?? null,
      mileage_before: row.mileage_before,
      mileage_after: row.mileage_after,
      reason_code: row.reason_code ?? null,
      description: row.description ?? null,
      created_at: toISOStringSafe(row.created_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}

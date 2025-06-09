import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ISellerVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ISellerVerification";

export async function test_api_sellerVerifications_eraseById(
  connection: api.IConnection,
) {
  const output: ISellerVerification.ISoftDeleteResult =
    await api.functional.sellerVerifications.eraseById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}

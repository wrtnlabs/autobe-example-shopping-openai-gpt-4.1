import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IRefund";

export async function test_api_refunds_eraseById(connection: api.IConnection) {
  const output: IRefund = await api.functional.refunds.eraseById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}

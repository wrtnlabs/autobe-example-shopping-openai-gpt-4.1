import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IRefund";

export async function test_api_refunds_post(connection: api.IConnection) {
  const output: IRefund = await api.functional.refunds.post(connection, {
    body: typia.random<IRefund.ICreate>(),
  });
  typia.assert(output);
}

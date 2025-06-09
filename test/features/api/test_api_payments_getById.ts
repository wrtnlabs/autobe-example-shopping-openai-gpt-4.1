import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPayment";

export async function test_api_payments_getById(connection: api.IConnection) {
  const output: IPayment = await api.functional.payments.getById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}

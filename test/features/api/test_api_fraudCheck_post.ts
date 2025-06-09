import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IFraudCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IFraudCheck";

export async function test_api_fraudCheck_post(connection: api.IConnection) {
  const output: IFraudCheck = await api.functional.fraudCheck.post(connection, {
    body: typia.random<IFraudCheck.ICreate>(),
  });
  typia.assert(output);
}

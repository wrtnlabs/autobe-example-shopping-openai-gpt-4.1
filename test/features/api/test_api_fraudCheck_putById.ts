import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IFraudCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IFraudCheck";

export async function test_api_fraudCheck_putById(connection: api.IConnection) {
  const output: IFraudCheck = await api.functional.fraudCheck.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IFraudCheck.IUpdate>(),
    },
  );
  typia.assert(output);
}

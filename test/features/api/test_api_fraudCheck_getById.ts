import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IFraudCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IFraudCheck";

export async function test_api_fraudCheck_getById(connection: api.IConnection) {
  const output: IFraudCheck = await api.functional.fraudCheck.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}

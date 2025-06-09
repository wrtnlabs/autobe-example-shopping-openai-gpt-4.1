import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDonation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDonation";

export async function test_api_donations_putById(connection: api.IConnection) {
  const output: IDonation = await api.functional.donations.putById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
    body: typia.random<IDonation.IUpdate>(),
  });
  typia.assert(output);
}

import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IDonation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDonation";

export async function test_api_donations_getById(connection: api.IConnection) {
  const output: IDonation = await api.functional.donations.getById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}

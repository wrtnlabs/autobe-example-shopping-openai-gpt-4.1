import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShipment";

export async function test_api_shipments_putById(connection: api.IConnection) {
  const output: IShipment = await api.functional.shipments.putById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
    body: typia.random<IShipment.IUpdate>(),
  });
  typia.assert(output);
}

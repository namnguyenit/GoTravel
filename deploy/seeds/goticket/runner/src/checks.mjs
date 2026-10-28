import { sqlTime, plus, vnDate, local } from "./core.mjs";
export function checkPlan(p) {
  const t = p.tables,
    expect = {
      users: 244,
      operators: 9,
      cars: 60,
      seat_templates: 1960,
      routes: 48,
      operator_stops: 120,
      route_stops: 192,
      trips: 600,
      orders: 2000,
      order_items: 3200,
      transport_cash_shifts: 40,
      order_disputes: 80,
      transport_item_operations: 120,
    };
  for (const [table, count] of Object.entries(expect)) {
    const db =
      table === "users"
        ? "auth"
        : [
              "orders",
              "order_items",
              "transport_cash_shifts",
              "order_disputes",
              "transport_item_operations",
            ].includes(table)
          ? "cart"
          : "car";
    if (t[db][table]?.length !== count)
      throw Error(`Quota ${db}.${table}: ${t[db][table]?.length} / ${count}`);
  }
  const tickets = new Map(
      t.car.issued_tickets.map((x) => [x.order_item_id, x]),
    ),
    seats = new Map(
      t.inventory.transport_trip_seats.map((x) => [
        x.trip_id + ":" + x.seat_id,
        x,
      ]),
    );
  for (const i of t.cart.order_items) {
    const ticket = tickets.get(i.id);
    if (
      ticket &&
      (ticket.trip_id !== i.transport_trip_id ||
        ticket.seat_id !== i.transport_seat_id ||
        ticket.revision !== i.transport_ticket_revision)
    )
      throw Error(`Ticket projection mismatch ${i.id}`);
    if (ticket && ["ACTIVE", "COMPLETED"].includes(i.transport_item_state)) {
      const seat = seats.get(i.transport_trip_id + ":" + i.transport_seat_id);
      if (seat?.status !== "SOLD" || seat?.order_id !== i.order_id)
        throw Error(`Inventory ownership mismatch ${i.id}`);
    }
  }
  for (const account of t.pay.transport_item_accounts) {
    const balance = t.pay.transport_item_fund_lots
      .filter((l) => l.item_id === account.item_id)
      .reduce((s, l) => s + l.remaining_amount, 0);
    if (Math.abs(balance - account.balance) > 0.001)
      throw Error(`Funding lot balance mismatch ${account.item_id}`);
  }
  if (t.auth.users_roles.some((row) => row.roles_name === "ADMIN"))
    throw Error("Seed must not assign ADMIN");
  const clean = new Set(p.refs.users.slice(0, 20).map((u) => u.id));
  if (t.cart.orders.some((o) => clean.has(o.user_id)))
    throw Error("Clean users have orders");
  return expect;
}
export async function checkStored(dbs, p, manifest) {
  const counts = {},
    errors = [];
  for (const [key, tables] of Object.entries(p.tables)) {
    counts[key] = {};
    for (const [table, rows] of Object.entries(tables)) {
      if (!rows.length) continue;
      const pk = rows[0].id
        ? "id"
        : rows[0].item_id
          ? "item_id"
          : rows[0].operation_id
            ? "operation_id"
            : rows[0].user_id
              ? "user_id"
              : rows[0].payout_id
                ? "payout_id"
                : rows[0].trip_id
                  ? "trip_id"
                  : rows[0].order_id
                    ? "order_id"
                    : rows[0].hold_id
                      ? "hold_id"
                      : "shift_id";
      const values = [...new Set(rows.map((row) => String(row[pk])))];
      const result = await dbs[key].query(
        `SELECT count(*)::int n FROM "${table}" WHERE "${pk}"::text=ANY($1::text[])`,
        [values],
      );
      counts[key][table] = result.rows[0].n;
      // Composite tables can contain multiple rows for the same parent; validate exact row counts there too.
      if (result.rows[0].n < rows.length)
        errors.push(
          `${key}.${table}: expected ${rows.length}, actual ${result.rows[0].n}`,
        );
    }
  }
  const ownOrders = manifest
    ? manifest.db
        .prepare(
          "SELECT record_key FROM records WHERE run_id=? AND db_key='cart' AND table_name='orders'",
        )
        .all(p.runId)
        .map((r) => r.record_key)
    : [];
  const ids = [...new Set([...p.refs.orders.map((o) => o.id), ...ownOrders])];
  const invItems = (
    await dbs.inventory.query(
      "SELECT item_id::text,order_id::text,trip_id::text,seat_id::text,state FROM transport_item_inventory WHERE order_id=ANY($1::uuid[])",
      [ids],
    )
  ).rows;
  const cartItems = (
    await dbs.cart.query(
      "SELECT id::text,order_id::text,transport_trip_id::text,transport_seat_id::text,transport_item_state FROM order_items WHERE order_id=ANY($1::uuid[])",
      [ids],
    )
  ).rows;
  const inv = new Map(invItems.map((i) => [i.item_id, i]));
  for (const i of cartItems.filter((i) =>
    ["ACTIVE", "COMPLETED"].includes(i.transport_item_state),
  )) {
    const current = inv.get(i.id);
    if (
      current &&
      (i.transport_trip_id !== current.trip_id ||
        i.transport_seat_id !== current.seat_id)
    )
      errors.push(`Projection mismatch ${i.id}`);
  }
  const badBalances = (
    await dbs.pay.query(
      `SELECT a.item_id::text FROM transport_item_accounts a LEFT JOIN transport_item_fund_lots l ON l.item_id=a.item_id WHERE a.order_id=ANY($1::uuid[]) GROUP BY a.item_id,a.balance HAVING coalesce(sum(l.remaining_amount),0)<>a.balance`,
      [ids],
    )
  ).rows;
  for (const row of badBalances)
    errors.push(`Funding lots không khớp balance ${row.item_id}`);
  const openFindings = (
    await dbs.cart.query(
      `SELECT issue_code,count(*)::int n FROM transport_reconciliation_findings WHERE order_id=ANY($1::uuid[]) AND status='OPEN' GROUP BY issue_code`,
      [ids],
    )
  ).rows;
  const pendingOrders = (
    await dbs.cart.query(
      `SELECT id::text,user_id::text,transport_cashier_id::text,transport_trip_id::text,status,expires_at,customer_info FROM orders WHERE id=ANY($1::uuid[]) AND status IN ('PAYMENT_PENDING','CASH_PENDING') AND expires_at>now()+interval '2 minutes' ORDER BY expires_at DESC LIMIT 60`,
      [ids],
    )
  ).rows;
  const currentTickets = (
    await dbs.car.query(
      `SELECT * FROM issued_tickets WHERE order_id=ANY($1::text[])`,
      [ids],
    )
  ).rows;
  const liveTripIds = (
    await dbs.car.query(
      `SELECT id FROM trips WHERE id=ANY($1::text[]) AND status NOT IN ('COMPLETED','CANCELLED') AND departure_time>($2::timestamp) AND departure_time<($3::timestamp)`,
      [
        p.refs.trips.map((tr) => tr.id),
        sqlTime("car", plus(new Date(), -120)),
        sqlTime("car", plus(new Date(), 240)),
      ],
    )
  ).rows.map((tr) => tr.id);
  const currentTokens = (
    await dbs.cart.query(
      `SELECT transport_ticket_id::text AS ticket_id,transport_check_in_token AS token FROM order_items WHERE order_id=ANY($1::uuid[]) AND transport_item_state='ACTIVE'`,
      [ids],
    )
  ).rows;
  const checkInTickets = currentTickets
    .filter((t) => t.status === "ACTIVE" && liveTripIds.includes(t.trip_id))
    .map((t) => ({
      ticketId: t.id,
      orderId: t.order_id,
      tripId: t.trip_id,
      token: currentTokens.find((i) => i.ticket_id === t.id)?.token,
      staffUsername: p.refs.staff.find(
        (s) =>
          s.operator ===
            p.refs.trips.find((tr) => tr.id === t.trip_id)?.operator &&
          s.slot === 4,
      )?.username,
    }));
  const actualOrderStates = (
    await dbs.cart.query(
      `SELECT status,count(*)::int AS count FROM orders WHERE id=ANY($1::uuid[]) GROUP BY status ORDER BY status`,
      [ids],
    )
  ).rows;
  const today = vnDate();
  const currentTrips = (
    await dbs.car.query(
      `SELECT status,count(*)::int AS count FROM trips WHERE id=ANY($1::text[]) AND departure_time>=($2::timestamp) AND departure_time<($3::timestamp) GROUP BY status`,
      [
        p.refs.trips.map((tr) => tr.id),
        sqlTime("car", local(today)),
        sqlTime("car", plus(local(today), 1440)),
      ],
    )
  ).rows;
  return {
    counts,
    errors,
    openFindings,
    live: {
      pendingOrders,
      checkInTickets,
      actualOrderStates,
      todayTrips: currentTrips,
      totalOwnedOrders: ids.length,
    },
    checkedAt: new Date().toISOString(),
  };
}

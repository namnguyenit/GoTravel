import {
  id,
  sha,
  token,
  vnDate,
  plus,
  local,
  sqlTime,
  stamp,
} from "./core.mjs";

export function buildOrders(p) {
  const { runId, calendarDateVietnam: day, refs: r, tables: t, commission } = p;
  const now = new Date(p.startedAtUtc),
    ID = (k, n) => id(runId, k, n),
    J = (d) => sqlTime("cart", d),
    C = (d) => sqlTime("car", d);
  const add = (db, table, row) => (t[db][table] ??= []).push(row);
  const rate = Number(commission.rate),
    ver = commission.version,
    money = (n) => Math.round(n * 100) / 100;
  const evidence = "https://gocar.nonnet123.io.vn/demo/transport-document.svg";
  const itemSeats = new Map(
    (t.inventory.transport_trip_seats || []).map((s) => [
      s.trip_id + ":" + s.seat_id,
      s,
    ]),
  );
  const cashActors = r.staff.filter((s) => s.canSellCash);
  for (let n = 0; n < 40; n++) {
    const open = n >= 28,
      actor = cashActors[open ? n - 28 : n % cashActors.length],
      v = r.vendors[actor.vendor - 1];
    const opened = open
      ? plus(now, -120)
      : plus(local(day), -(10 - Math.floor(n / 16)) * 1440 + (n % 16) * 5);
    const closed = open ? null : plus(opened, 240);
    const shift = {
      id: ID("shift", n + 1),
      actor_id: actor.id,
      operator_id: v.id,
      commission_rate: rate,
      commission_version: ver,
      opened_at: J(opened),
      closed_at: closed ? J(closed) : null,
      gross_amount: null,
      cash_refund_amount: null,
      expected_amount: null,
      counted_amount: null,
      variance: null,
      commission_due: null,
      settlement_sent_at: null,
    };
    add("cart", "transport_cash_shifts", shift);
    r.shifts.push({
      id: shift.id,
      vendor: v.n,
      actor: actor.id,
      open,
      opened: stamp(opened),
      closed: closed ? stamp(closed) : null,
      row: shift,
    });
  }
  const distribution = [
    ["CONFIRMED", 630, 270],
    ["COMPLETED", 420, 180],
    ["CANCELLED", 177, 73],
    ["REFUNDED", 105, 45],
    ["REFUND_PENDING", 28, 12],
    ["PAYMENT_PENDING", 40, 0],
    ["CASH_PENDING", 0, 20],
  ];
  let orderN = 0,
    itemN = 0;
  const cursors = {};
  function selectTrip(status, seats, method) {
    let choices = r.trips.filter(
      (tr) =>
        tr.status !== "DRAFT" &&
        tr.route.listingStatus === "ACTIVE" &&
        (status === "COMPLETED"
          ? tr.kind === "past"
          : tr.status === "ON_SALE" &&
            new Date(tr.departure) > plus(now, 45)) &&
        tr.car.seats.length - tr.used.length >= seats + 4 &&
        (status !== "CASH_PENDING" ||
          r.shifts.some((s) => s.vendor === tr.vendor && s.open)),
    );
    if (!choices.length) throw Error(`Không còn chỗ cho ${status}/${seats}`);
    // Stable round robin, including live check-in trips for first confirmed orders.
    const key = status + method,
      cursor = cursors[key] || 0;
    cursors[key] = cursor + 1;
    return choices[cursor % choices.length];
  }
  for (const [status, online, cash] of distribution)
    for (const [method, count] of [
      ["ONLINE", online],
      ["CASH", cash],
    ])
      for (let j = 0; j < count; j++) {
        const n = ++orderN,
          seats = n % 10 < 6 ? 1 : n % 10 < 9 ? 2 : 4,
          tr = selectTrip(status, seats, method),
          v = r.vendors[tr.vendor - 1];
        let userIdx;
        if (status === "COMPLETED") userIdx = 140 + (j % 20);
        else if (status === "REFUNDED" || status === "REFUND_PENDING")
          userIdx = 110 + (j % 30);
        else if (method === "CASH") userIdx = 80 + (j % 30);
        else userIdx = j % 5 === 0 ? 160 + (j % 20) : 20 + (j % 60);
        const user = r.users[userIdx];
        const paid = !["CANCELLED", "PAYMENT_PENDING", "CASH_PENDING"].includes(
            status,
          ),
          pending = ["PAYMENT_PENDING", "CASH_PENDING"].includes(status),
          released = ["CANCELLED", "REFUNDED", "REFUND_PENDING"].includes(
            status,
          );
        const orderId = ID("order", n),
          holdId = ID("hold", n);
        let shift = null;
        if (method === "CASH")
          shift = r.shifts.filter(
            (s) => s.vendor === tr.vendor && (pending ? s.open : true),
          )[
            j %
              r.shifts.filter(
                (s) => s.vendor === tr.vendor && (pending ? s.open : true),
              ).length
          ];
        // Vendors without an open shift use their closed historical shift only for paid history.
        if (method === "CASH" && !shift) {
          const candidate = r.trips.find(
            (x) =>
              x.vendor <= 6 &&
              x.status === "ON_SALE" &&
              new Date(x.departure) > plus(now, 45) &&
              x.car.seats.length - x.used.length >= seats + 4,
          );
          if (!candidate) throw Error("Thiếu chuyến cho CASH_PENDING");
          // Select before creating references instead of changing ownership mid-order.
          orderN--;
          throw Error(
            "CASH_PENDING chọn chuyến thiếu ca; cần lọc vendor có ca mở",
          );
        }
        let created = plus(new Date(tr.departure), -3 * 1440);
        if (pending) created = now;
        else if (shift) created = plus(new Date(shift.opened), 10 + (j % 30));
        if (created > now) created = plus(now, -120);
        const items = [];
        for (let k = 0; k < seats; k++) {
          const seat = tr.car.seats[tr.used.length];
          tr.used.push(seat.id);
          const itemId = ID("item", ++itemN),
            ticketId = paid ? ID("ticket", itemN) : null,
            price = tr.price + (seat.seatClass === "VIP" ? 50000 : 0),
            checkToken = paid ? token(ticketId, itemId) : null;
          let boarding =
            status === "COMPLETED"
              ? itemN % 6 === 0
                ? "NO_SHOW"
                : "CHECKED_IN"
              : released
                ? "VOID"
                : "ACTIVE";
          if (status === "CONFIRMED" && tr.live && j % 8 === 0)
            boarding = "CHECKED_IN";
          const state =
            status === "COMPLETED"
              ? "COMPLETED"
              : status === "REFUNDED"
                ? "REFUNDED"
                : status === "REFUND_PENDING"
                  ? "REFUND_PENDING"
                  : status === "CANCELLED"
                    ? "VOID"
                    : "ACTIVE";
          const item = {
            id: itemId,
            order_id: orderId,
            listing_id: tr.route.listingId,
            host_id: v.owner,
            listing_title: `${tr.route.origin} – ${tr.route.destination} · DEMO`,
            thumbnail_url: null,
            start_date: vnDate(new Date(tr.departure)),
            end_date: vnDate(new Date(tr.arrival)),
            time_slot: plus(tr.departure, 420).toISOString().slice(11, 16),
            quantity: 1,
            unit_price: price,
            total_price: price,
            transport_trip_id: tr.id,
            transport_seat_id: seat.id,
            transport_seat_code: seat.code,
            passenger_name:
              k === 0
                ? user.fullName
                : `${user.fullName.split(" · ")[0]} / Người đi ${k + 1}`,
            pickup_stop_id: tr.route.stops[0].id,
            dropoff_stop_id: tr.route.stops.at(-1).id,
            transport_ticket_id: ticketId,
            transport_check_in_token: checkToken,
            transport_boarding_status:
              paid && ["CHECKED_IN", "NO_SHOW"].includes(boarding)
                ? boarding
                : null,
            transport_ticket_revision: 1,
            transport_item_state: state,
            transport_original_amount: price,
            transport_departure_at: J(tr.departure),
            transport_refund_total: status === "REFUNDED" ? price : 0,
          };
          items.push(item);
          tr.items.push(item.id);
          add("cart", "order_items", item);
          if (paid) {
            const checked = boarding === "CHECKED_IN";
            add("car", "issued_tickets", {
              id: ticketId,
              order_id: orderId,
              order_item_id: itemId,
              trip_id: tr.id,
              seat_id: seat.id,
              passenger_name: item.passenger_name,
              pickup_stop_id: item.pickup_stop_id,
              dropoff_stop_id: item.dropoff_stop_id,
              token_hash: sha(checkToken),
              status: boarding,
              token_generation: 1,
              revision: 1,
              checked_in_at: checked
                ? C(
                    status === "COMPLETED"
                      ? plus(tr.departure, -15)
                      : plus(now, -5),
                  )
                : null,
              checked_in_by: checked ? v.staff[3].id : null,
              created_at: C(created),
              updated_at: C(created),
            });
            add("inventory", "transport_item_inventory", {
              item_id: itemId,
              order_id: orderId,
              trip_id: tr.id,
              seat_id: seat.id,
              reservation_id: holdId,
              state: released ? "CANCELLED" : "SOLD",
            });
            if (!released)
              add("pay", "transport_item_accounts", {
                item_id: itemId,
                order_id: orderId,
                operator_user_id: v.owner,
                method,
                original_amount: price,
                balance: status === "REFUNDED" ? 0 : price,
                revision: status === "REFUNDED" ? 2 : 1,
                reserved_by: null,
                commission_rate: rate,
                commission_version: ver,
                cash_shift_id: shift?.id || null,
              });
            if (!released)
              add("pay", "transport_item_fund_lots", {
                id: ID("lot", itemId),
                item_id: itemId,
                source_operation_id: null,
                cash_shift_id: shift?.id || null,
                commission_rate: rate,
                commission_version: ver,
                remaining_amount: status === "REFUNDED" ? 0 : price,
                created_at: J(created),
              });
          }
          add("inventory", "transport_hold_seats", {
            hold_id: holdId,
            seat_id: seat.id,
          });
          if (!released) {
            const target = itemSeats.get(tr.id + ":" + seat.id);
            Object.assign(target, {
              status: pending ? "HELD" : "SOLD",
              order_id: orderId,
              hold_id: holdId,
              expires_at: pending ? J(plus(now, 15)) : null,
            });
          }
        }
        const total = items.reduce((s, i) => s + i.total_price, 0),
          refund = ["REFUNDED", "REFUND_PENDING"].includes(status) ? total : 0;
        const order = {
          id: orderId,
          user_id: user.id,
          host_id: v.owner,
          order_kind: "GOCAR_TICKET",
          payment_method: method,
          transport_trip_id: tr.id,
          transport_hold_id: holdId,
          transport_idempotency_key: `${runId}-order-${n}`,
          transport_request_hash: sha(`${runId}:order:${n}`),
          transport_cashier_id: shift?.actor || null,
          transport_cash_shift_id: shift?.id || null,
          transport_departure_at: J(tr.departure),
          transport_policy_version: "demo-v1",
          transport_full_refund_hours: 24,
          transport_partial_refund_hours: 6,
          transport_partial_fee_rate: 0.3,
          transport_cancellation_fee: 0,
          transport_refund_due: refund,
          transport_cancellation_reason: released
            ? "DEMO: khách thay đổi kế hoạch"
            : null,
          order_number: `GTD-${p.slug.toUpperCase()}-${String(n).padStart(4, "0")}`,
          status,
          total_amount: total,
          currency: "VND",
          customer_info: {
            fullName: user.fullName,
            email: user.email,
            phone: "0900000000",
          },
          expires_at: pending ? J(plus(now, 15)) : null,
          ticket_email_sent: false,
          ticket_email_sent_at: null,
          ticket_email_recipient: user.email,
          ticket_email_attempts: 0,
          created_at: J(created),
          updated_at: J(status === "REFUND_PENDING" ? now : created),
        };
        add("cart", "orders", order);
        add("inventory", "transport_seat_holds", {
          id: holdId,
          order_id: orderId,
          trip_id: tr.id,
          status: released ? "CANCELLED" : pending ? "HELD" : "SOLD",
          expires_at: J(pending ? plus(now, 15) : plus(created, 15)),
        });
        if (paid)
          add("cart", "transport_notification_outbox", {
            id: ID("mail", orderId),
            order_id: orderId,
            kind: released ? "CANCELLED" : "TICKET",
            event_key: "legacy",
            status: "SKIPPED",
            attempts: 0,
            last_error: "DEMO_SNAPSHOT_RESERVED_DOMAIN_NO_DELIVERY",
            created_at: J(created),
            delivered_at: null,
          });
        if (method === "ONLINE") {
          const payId = ID("payment", n),
            payStatus =
              status === "REFUNDED"
                ? "REFUNDED"
                : paid
                  ? "COMPLETED"
                  : pending
                    ? "PENDING"
                    : "EXPIRED";
          add("pay", "payment_requests", {
            id: payId,
            order_id: orderId,
            user_id: user.id,
            host_id: v.owner,
            payment_code: `GTD${p.slug.toUpperCase()}${String(n).padStart(4, "0")}`,
            amount: total,
            status: payStatus,
            provider: "MOCK",
            order_kind: "GOCAR_TICKET",
            qr_url: null,
            bank_account: null,
            bank_name: null,
            expires_at: pending ? J(plus(now, 15)) : null,
            paid_at: paid ? J(plus(created, 1)) : null,
            created_at: J(created),
            updated_at: J(created),
          });
          if (paid) {
            add("pay", "payment_transactions", {
              id: ID("transaction", n),
              payment_request_id: payId,
              sepay_id: null,
              gateway: "MOCK",
              transaction_date: J(plus(created, 1)),
              sender_account: "DEMO-NO-BANK-TRANSFER",
              amount: total,
              content: `DEMO SNAPSHOT ${order.order_number}`,
              reference_code: `DEMO-${runId}-${n}`,
              created_at: J(plus(created, 1)),
            });
            add("pay", "payment_order_notifications", {
              order_id: orderId,
              created_at: J(plus(created, 1)),
              delivered_at: J(plus(created, 2)),
              successful: true,
            });
            const payoutId = ID("payout", n),
              commissionAmount = money(total * rate),
              payoutStatus = ["REFUNDED", "REFUND_PENDING"].includes(status)
                ? "CANCELLED"
                : status === "COMPLETED"
                  ? j < 40
                    ? "PAID"
                    : j < 80
                      ? "REQUESTED"
                      : "PENDING"
                  : "PENDING";
            add("pay", "host_payouts", {
              id: payoutId,
              payment_request_id: payId,
              order_id: orderId,
              host_id: v.owner,
              provider_type: "TRANSPORT",
              total_amount: ["REFUNDED", "REFUND_PENDING"].includes(status)
                ? 0
                : total,
              commission_rate: rate,
              commission_amount: ["REFUNDED", "REFUND_PENDING"].includes(status)
                ? 0
                : commissionAmount,
              host_amount: ["REFUNDED", "REFUND_PENDING"].includes(status)
                ? 0
                : money(total - commissionAmount),
              status: payoutStatus,
              paid_at:
                payoutStatus === "PAID"
                  ? J(
                      new Date(
                        Math.min(
                          new Date(tr.arrival).getTime() + 60 * 60000,
                          now.getTime() - 10 * 60000,
                        ),
                      ),
                    )
                  : null,
              created_at: J(created),
              updated_at: J(created),
            });
            add("pay", "transport_payout_bases", {
              payout_id: payoutId,
              order_id: orderId,
              original_amount: total,
              original_commission: commissionAmount,
              created_at: J(created),
            });
            if (payoutStatus === "PAID")
              add("pay", "transport_payout_proofs", {
                payout_id: payoutId,
                order_id: orderId,
                actor_id: p.adminId,
                amount: money(total - commissionAmount),
                reference: `DEMO-PAYOUT-${runId}-${n}`,
                evidence_url: evidence,
                recorded_at: J(
                  new Date(
                    Math.min(
                      new Date(tr.arrival).getTime() + 60 * 60000,
                      now.getTime() - 10 * 60000,
                    ),
                  ),
                ),
              });
            if (status === "REFUNDED")
              add("pay", "transport_manual_refunds", {
                id: ID("manual-refund", n),
                order_id: orderId,
                amount: total,
                fee_amount: 0,
                fee_commission: 0,
                fee_operator_amount: 0,
                reference: `DEMO-REFUND-${runId}-${n}`,
                evidence_url: evidence,
                recorded_by: p.adminId,
                recorded_at: J(plus(created, 30)),
              });
          }
        } else if (paid) {
          add("cart", "transport_cash_receipts", {
            id: ID("receipt", n),
            receipt_no: `DEMO-CASH-${runId}-${n}`,
            order_id: orderId,
            shift_id: shift.id,
            actor_id: shift.actor,
            operator_id: v.id,
            amount: total,
            currency: "VND",
            received_at: J(plus(created, 1)),
          });
          if (status === "REFUNDED") {
            add("pay", "transport_cash_refund_adjustments", {
              order_id: orderId,
              shift_id: shift.id,
              operator_id: v.id,
              refund_amount: total,
              commission_reversal: money(total * rate),
              commission_rate: rate,
              commission_version: ver,
              recorded_at: J(plus(created, 30)),
            });
            add("cart", "transport_cash_refund_outbox", {
              order_id: orderId,
              delivered_at: J(plus(created, 30)),
            });
          }
        }
        if (status === "REFUNDED")
          add("cart", "transport_refund_confirmations", {
            id: ID("refund-proof", n),
            order_id: orderId,
            amount: total,
            reference: `DEMO-REFUND-${runId}-${n}`,
            evidence_url: evidence,
            payment_method: method,
            recorded_by: method === "CASH" ? shift.actor : p.adminId,
            recorded_at: J(plus(created, 30)),
          });
        r.orders.push({
          n,
          id: orderId,
          method,
          status,
          user: user.id,
          trip: tr.id,
          vendor: tr.vendor,
          items: items.map((i) => i.id),
          row: order,
          shift: shift?.id || null,
        });
      }
  // 80 tickets for customer support, one active dispute per order.
  const eligible = r.orders.filter(
    (o) =>
      t.cart.orders
        .find((x) => x.id === o.id)
        .customer_info.email.includes("_user_16") ||
      t.cart.orders
        .find((x) => x.id === o.id)
        .customer_info.email.includes("_user_17"),
  );
  const support =
    eligible.length >= 80
      ? eligible.slice(0, 80)
      : r.orders.filter((o) => o.status === "CONFIRMED").slice(0, 80);
  const reasons = [
    "Xác nhận điểm đón",
    "Cần hỗ trợ thông tin hành khách",
    "Chưa thấy email vé",
    "Theo dõi khoản hoàn tiền",
  ];
  for (let n = 0; n < 80; n++) {
    const o = support[n],
      status =
        n < 48
          ? "OPEN"
          : n < 64
            ? "IN_REVIEW"
            : n < 74
              ? "RESOLVED"
              : "REJECTED";
    add("cart", "order_disputes", {
      id: ID("dispute", n + 1),
      order_id: o.id,
      user_id: o.user,
      reason: reasons[n % 4],
      description: `DEMO ${n + 1}: ${reasons[n % 4]} cho đơn ${o.row.order_number}. Khách đề nghị kiểm tra và phản hồi.`,
      status,
      admin_note:
        n >= 48
          ? `DEMO: ${status === "IN_REVIEW" ? "Đã tiếp nhận, đang kiểm tra với nhà xe." : status === "RESOLVED" ? "Đã xác nhận thông tin và hướng dẫn khách." : "Không đủ cơ sở yêu cầu; đã giải thích cho khách."}`
          : null,
      resolved_by: n >= 64 ? p.adminId : null,
      resolved_at: n >= 64 ? J(plus(now, -10)) : null,
      created_at: J(plus(now, -120)),
      updated_at: J(plus(now, -10)),
    });
  }
  p.itemSeats = undefined;
  return p;
}

export function finishCash(p) {
  const { tables: t, refs: r, commission } = p,
    rate = Number(commission.rate),
    J = (d) => sqlTime("cart", d),
    now = new Date(p.startedAtUtc);
  let varianceN = 0;
  for (const shift of r.shifts) {
    if (shift.open) continue;
    const gross =
      (t.cart.transport_cash_receipts || [])
        .filter((x) => x.shift_id === shift.id)
        .reduce((s, x) => s + x.amount, 0) +
      (t.cart.transport_operation_cash_proofs || [])
        .filter((x) => x.shift_id === shift.id)
        .reduce((s, x) => s + x.amount, 0);
    const refunds =
      (t.pay.transport_cash_refund_adjustments || [])
        .filter((x) => x.shift_id === shift.id)
        .reduce((s, x) => s + x.refund_amount, 0) +
      (t.cart.transport_operation_refund_proofs || [])
        .filter((x) => x.shift_id === shift.id)
        .reduce((s, x) => s + x.amount, 0);
    const expected = gross - refunds,
      variance = varianceN++ < 6 ? 10000 : 0,
      due = Math.round(Math.max(0, expected) * rate * 100) / 100;
    Object.assign(shift.row, {
      gross_amount: gross,
      cash_refund_amount: refunds,
      expected_amount: expected,
      counted_amount: expected + variance,
      variance,
      commission_due: due,
      settlement_sent_at: J(plus(shift.closed, 1)),
    });
    (t.pay.transport_cash_settlements ??= []).push({
      shift_id: shift.id,
      operator_id: shift.row.operator_id,
      gross_amount: gross,
      commission_due: due,
      commission_rate: rate,
      commission_version: commission.version,
      recorded_at: J(plus(shift.closed, 1)),
    });
    if (varianceN % 3 === 0)
      (t.pay.transport_cash_commission_payments ??= []).push({
        id: id(p.runId, "commission-proof", shift.id),
        shift_id: shift.id,
        amount: due,
        reference: `DEMO-COMMISSION-${p.runId}-${varianceN}`,
        evidence_url:
          "https://gocar.nonnet123.io.vn/demo/transport-document.svg",
        recorded_by: p.adminId,
        recorded_at: J(plus(shift.closed, 5)),
      });
  }
}

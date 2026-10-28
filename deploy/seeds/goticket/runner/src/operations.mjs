import { id, sha, token, plus, sqlTime, vnDate, stamp } from "./core.mjs";

export function buildOperations(p) {
  const { tables: t, refs: r, runId, commission } = p,
    ID = (k, n) => id(runId, k, n),
    now = new Date(p.startedAtUtc),
    J = (d) => sqlTime("cart", d),
    C = (d) => sqlTime("car", d),
    rate = Number(commission.rate),
    ver = commission.version;
  const evidence = "https://gocar.nonnet123.io.vn/demo/transport-document.svg",
    add = (db, table, row) => (t[db][table] ??= []).push(row);
  const items = new Map(t.cart.order_items.map((x) => [x.id, x])),
    tickets = new Map(t.car.issued_tickets.map((x) => [x.order_item_id, x])),
    inventory = new Map(
      t.inventory.transport_item_inventory.map((x) => [x.item_id, x]),
    ),
    accounts = new Map(
      t.pay.transport_item_accounts.map((x) => [x.item_id, x]),
    ),
    seats = new Map(
      t.inventory.transport_trip_seats.map((x) => [
        x.trip_id + ":" + x.seat_id,
        x,
      ]),
    ),
    lots = new Map(t.pay.transport_item_fund_lots.map((x) => [x.item_id, x]));
  const groups = [
    ["EQUAL", 20, "ONLINE"],
    ["TOPUP_ONLINE", 20, "ONLINE"],
    ["TOPUP_CASH", 10, "CASH"],
    ["CHEAPER_DONE", 15, "CASH"],
    ["CHEAPER_PENDING", 10, "CASH"],
    ["CANCEL_DONE", 20, "ONLINE"],
    ["CANCEL_PENDING", 10, "ONLINE"],
    ["ABORT_EMPTY", 5, "ONLINE"],
    ["ABORT_DONE", 5, "ONLINE"],
    ["ABORT_PENDING", 5, "ONLINE"],
  ];
  const used = new Set();
  let n = 0;
  for (const [scenario, count, method] of groups)
    for (let j = 0; j < count; j++) {
      const source = r.orders.find(
        (o) =>
          o.status === "CONFIRMED" &&
          o.method === method &&
          !used.has(o.id) &&
          o.items.length >= 2 &&
          new Date(r.trips.find((tr) => tr.id === o.trip).departure) >
            plus(now, 1440) &&
          tickets.get(o.items[0]).status === "ACTIVE" &&
          (method !== "CASH" ||
            r.shifts.some((s) => s.vendor === o.vendor && s.open)),
      );
      if (!source) throw Error(`Thiếu fixture ${scenario}`);
      used.add(source.id);
      const item = items.get(source.items[0]),
        ticket = tickets.get(item.id),
        account = accounts.get(item.id),
        lot = lots.get(item.id),
        oldTrip = r.trips.find((tr) => tr.id === item.transport_trip_id),
        opId = ID("operation", ++n),
        aborted = scenario.startsWith("ABORT"),
        cancel = scenario.startsWith("CANCEL"),
        pending = scenario.endsWith("PENDING"),
        cheaper = scenario.startsWith("CHEAPER"),
        topup = scenario.startsWith("TOPUP") || aborted;
      const old = item.total_price,
        next = cancel ? 0 : topup ? old + 50000 : cheaper ? old - 50000 : old,
        fee = 0,
        extra = Math.max(next - old, 0),
        refund = aborted
          ? scenario === "ABORT_EMPTY"
            ? 0
            : extra
          : Math.max(old - next, 0),
        funded = !aborted || scenario !== "ABORT_EMPTY",
        doneRefund = refund > 0 && !pending;
      let target = null,
        newSeat = null;
      if (!cancel) {
        target = r.trips.find(
          (tr) =>
            tr.vendor === oldTrip.vendor &&
            tr.status === "ON_SALE" &&
            tr.id !== oldTrip.id &&
            new Date(tr.departure) > plus(now, 1440) &&
            tr.car.seats.length - tr.used.length > 6,
        );
        if (!target) throw Error("Thiếu chuyến đổi");
        newSeat = target.car.seats[target.used.length];
        target.used.push(newSeat.id);
      }
      const expiry = plus(now, -60),
        created = plus(now, -75),
        cashShift =
          method === "CASH"
            ? r.shifts.find((s) => s.vendor === source.vendor && s.open)
            : null,
        actor = method === "CASH" ? cashShift.actor : source.user;
      const plan = {
        operationId: opId,
        orderId: source.id,
        itemId: item.id,
        actorId: actor,
        kind: cancel ? "CANCEL" : "EXCHANGE",
        requestHash: sha(`DEMO:${runId}:${scenario}:${n}`),
        oldTicketId: ticket.id,
        expectedRevision: 1,
        oldTripId: oldTrip.id,
        oldSeatId: item.transport_seat_id,
        newTripId: target?.id || null,
        newSeatId: newSeat?.id || null,
        passengerName: item.passenger_name,
        pickupStopId: target?.route.stops[0].id || null,
        dropoffStopId: target?.route.stops.at(-1).id || null,
        newSeatCode: newSeat?.code || null,
        newListingId: target?.route.listingId || null,
        newRouteTitle: target
          ? `${target.route.origin} – ${target.route.destination} · DEMO`
          : null,
        newDepartureAt: target?.departure || null,
        quoteId: target ? ID("operation-quote", n) : null,
        quoteHash: target ? sha(`${runId}:quote:${n}`) : null,
        operatorId: oldTrip.operator,
        ownerUserId: source.row.host_id,
        userId: source.user,
        paymentMethod: method,
        originalAmount: String(old),
        originalOrderAmount: String(source.row.total_amount),
        oldAmount: String(old),
        newAmount: String(next),
        fee: String(fee),
        topup: String(extra),
        refundDue: String(aborted ? 0 : refund),
        originalCashShiftId: source.shift,
        cashReceived: String(method === "CASH" ? source.row.total_amount : 0),
        commissionRate: method === "CASH" ? String(rate) : null,
        commissionVersion: method === "CASH" ? ver : null,
        expiresAt: stamp(expiry),
        forcedTripCancellation: false,
      };
      const state = aborted
        ? pending
          ? "ABORT_REFUND_PENDING"
          : "ABORTED"
        : pending
          ? "REFUND_PENDING"
          : "COMPLETED";
      const result = aborted
        ? { operationId: opId, state: "ABORTED" }
        : {
            operationId: opId,
            state: "COMMITTED",
            ticketId: ticket.id,
            revision: 2,
            ...(!cancel ? { checkInToken: token(ticket.id, item.id, 2) } : {}),
          };
      add("cart", "transport_item_operations", {
        id: opId,
        order_id: source.id,
        item_id: item.id,
        kind: plan.kind,
        request_hash: plan.requestHash,
        plan_json: JSON.stringify(plan),
        state,
        expires_at: J(expiry),
        abort_requested_by: aborted ? actor : null,
        abort_reason: aborted ? "DEMO: khách bỏ đổi vé" : null,
        result_json: aborted ? null : JSON.stringify(result),
        error: null,
        attempts: 0,
        created_at: J(created),
        updated_at: J(now),
      });
      add("car", "transport_item_operations", {
        id: opId,
        ticket_id: ticket.id,
        request_hash: plan.requestHash,
        status: aborted ? "ABORTED" : "COMMITTED",
        plan,
        previous_ticket: aborted ? null : { ...ticket },
        result: aborted ? null : result,
        created_at: C(created),
        updated_at: C(now),
      });
      add("inventory", "transport_item_inventory_operations", {
        operation_id: opId,
        order_id: source.id,
        item_id: item.id,
        kind: plan.kind,
        request_hash: plan.requestHash,
        old_trip_id: oldTrip.id,
        old_seat_id: plan.oldSeatId,
        new_trip_id: target?.id || null,
        new_seat_id: newSeat?.id || null,
        state: aborted ? "ABORTED" : "COMPLETED",
        expires_at: J(expiry),
        created_at: J(created),
      });
      add("pay", "transport_item_money_operations", {
        operation_id: opId,
        item_id: item.id,
        request_hash: plan.requestHash,
        old_amount: old,
        new_amount: aborted ? old : next,
        fee: 0,
        topup: extra,
        refund_due: refund,
        state,
        created_at: J(created),
        committed_at: aborted ? null : J(plus(created, 5)),
      });
      const event = (
        kind,
        amount,
        reference = null,
        evidenceUrl = null,
        actorId = actor,
        shiftId = null,
      ) =>
        add("pay", "transport_item_money_events", {
          id: ID("money-event", `${opId}:${kind}`),
          operation_id: opId,
          kind,
          amount,
          reference,
          evidence_url: evidenceUrl,
          actor_id: actorId,
          cash_shift_id: shiftId,
          created_at: J(plus(created, 5)),
        });
      if (extra && funded) {
        const ref = `DEMO-TOPUP-${runId}-${n}`;
        event(
          "TOPUP",
          extra,
          method === "CASH" ? "CASH:" + ref : ref,
          null,
          actor,
          cashShift?.id || null,
        );
        event("TOPUP_COMMISSION", Math.round(extra * rate * 100) / 100);
        if (cashShift)
          add("cart", "transport_operation_cash_proofs", {
            operation_id: opId,
            shift_id: cashShift.id,
            actor_id: cashShift.actor,
            amount: extra,
            reference: ref,
            received_at: J(plus(created, 2)),
          });
        else {
          const paymentId = ID("topup-payment", n);
          add("pay", "payment_requests", {
            id: paymentId,
            order_id: opId,
            user_id: source.user,
            host_id: source.row.host_id,
            payment_code: `GTDX${p.slug.toUpperCase()}${n}`,
            amount: extra,
            status: doneRefund && aborted ? "REFUNDED" : "COMPLETED",
            provider: "MOCK",
            order_kind: "GOCAR_EXCHANGE",
            qr_url: null,
            bank_account: null,
            bank_name: null,
            expires_at: null,
            paid_at: J(plus(created, 2)),
            created_at: J(created),
            updated_at: J(created),
          });
          add("pay", "payment_transactions", {
            id: ID("topup-transaction", n),
            payment_request_id: paymentId,
            sepay_id: null,
            gateway: "MOCK",
            transaction_date: J(plus(created, 2)),
            sender_account: "DEMO-NO-BANK-TRANSFER",
            amount: extra,
            content: `DEMO SNAPSHOT topup ${opId}`,
            reference_code: ref,
            created_at: J(plus(created, 2)),
          });
          add("pay", "payment_order_notifications", {
            order_id: opId,
            created_at: J(plus(created, 2)),
            delivered_at: J(plus(created, 3)),
            successful: true,
          });
        }
        add("pay", "transport_item_fund_lots", {
          id: ID("topup-lot", n),
          item_id: item.id,
          source_operation_id: opId,
          cash_shift_id: cashShift?.id || null,
          commission_rate: rate,
          commission_version: ver,
          remaining_amount: aborted ? 0 : extra,
          created_at: J(plus(created, 2)),
        });
      }
      if (!aborted) {
        event("CREDIT_TRANSFER", old);
        event("REPLACEMENT_DEBIT", next);
        event("FEE", 0);
        if (refund) {
          lot.remaining_amount -= refund;
          event(
            "COMMISSION_REVERSAL_DUE",
            Math.round(refund * rate * 100) / 100,
          );
          if (method === "CASH")
            add("pay", "transport_item_cash_refund_allocations", {
              operation_id: opId,
              shift_id: source.shift,
              amount: refund,
              commission_reversal: Math.round(refund * rate * 100) / 100,
            });
        }
        account.balance = next;
        account.revision = 2;
        const oldSeat = seats.get(oldTrip.id + ":" + plan.oldSeatId);
        Object.assign(oldSeat, {
          status: "AVAILABLE",
          order_id: null,
          hold_id: null,
          expires_at: null,
        });
        const inv = inventory.get(item.id);
        if (cancel) {
          item.transport_item_state = pending ? "REFUND_PENDING" : "REFUNDED";
          item.transport_boarding_status = null;
          item.transport_check_in_token = null;
          ticket.status = "VOID";
          inv.state = "CANCELLED";
        } else {
          Object.assign(seats.get(target.id + ":" + newSeat.id), {
            status: "SOLD",
            order_id: source.id,
            hold_id: opId,
            expires_at: null,
          });
          Object.assign(item, {
            transport_trip_id: target.id,
            transport_seat_id: newSeat.id,
            transport_seat_code: newSeat.code,
            pickup_stop_id: plan.pickupStopId,
            dropoff_stop_id: plan.dropoffStopId,
            listing_id: plan.newListingId,
            listing_title: plan.newRouteTitle,
            unit_price: next,
            total_price: next,
            transport_check_in_token: result.checkInToken,
            transport_departure_at: J(target.departure),
            start_date: vnDate(new Date(target.departure)),
            end_date: vnDate(new Date(target.arrival)),
          });
          Object.assign(ticket, {
            trip_id: target.id,
            seat_id: newSeat.id,
            pickup_stop_id: plan.pickupStopId,
            dropoff_stop_id: plan.dropoffStopId,
            token_hash: sha(result.checkInToken),
          });
          Object.assign(inv, {
            trip_id: target.id,
            seat_id: newSeat.id,
            reservation_id: opId,
          });
        }
        item.transport_ticket_revision = 2;
        ticket.revision = 2;
        ticket.token_generation = 2;
        ticket.updated_at = C(now);
      } else if (refund)
        event("COMMISSION_REVERSAL_DUE", Math.round(refund * rate * 100) / 100);
      if (doneRefund) {
        event(
          "REFUND",
          refund,
          `DEMO-OP-REFUND-${runId}-${n}`,
          evidence,
          p.adminId,
        );
        add("cart", "transport_operation_refund_proofs", {
          operation_id: opId,
          actor_id: p.adminId,
          amount: refund,
          reference: `DEMO-OP-REFUND-${runId}-${n}`,
          evidence_url: evidence,
          refund_method: "BANK_TRANSFER",
          shift_id: null,
          recorded_at: J(now),
        });
        item.transport_refund_total += refund;
      }
      add("car", "transport_audit", {
        id: ID("audit-operation", n),
        actor_id: actor,
        trip_id: oldTrip.id,
        action: aborted
          ? "ABORT_ITEM"
          : cancel
            ? "CANCEL_ITEM"
            : "EXCHANGE_ITEM",
        detail: {
          source: "DEMO_SNAPSHOT",
          runId,
          operationId: opId,
          itemId: item.id,
          scenario,
        },
        created_at: C(now),
      });
      r.operations.push({
        id: opId,
        scenario,
        orderId: source.id,
        itemId: item.id,
        state,
        method,
        oldToken: token(ticket.id, item.id, 1),
      });
    }
  // Net online payout follows immutable original basis and the current item money balances.
  for (const payout of t.pay.host_payouts) {
    if (payout.status === "CANCELLED") continue;
    const balance = t.pay.transport_item_accounts
      .filter((a) => a.order_id === payout.order_id)
      .reduce((s, a) => s + a.balance, 0);
    payout.total_amount = balance;
    payout.commission_amount = Math.round(balance * rate * 100) / 100;
    payout.host_amount =
      Math.round((balance - payout.commission_amount) * 100) / 100;
  }
  // Keep some genuinely blocked seats for visual availability, with an audit trail.
  for (const tr of r.trips.filter(
    (tr) => tr.live || (tr.kind === "future" && tr.n % 7 === 0),
  )) {
    const seat = tr.car.seats.at(-1),
      row = seats.get(tr.id + ":" + seat.id);
    if (!row || row.status !== "AVAILABLE") continue;
    row.status = "BLOCKED";
    add("inventory", "transport_seat_block_audit", {
      id: ID("seat-block", tr.id),
      trip_id: tr.id,
      seat_id: seat.id,
      actor_id: tr.owner,
      blocked: true,
      reason: "DEMO: ghế dành cho vận hành, có thể mở lại từ màn quản lý",
      created_at: J(now),
    });
  }
  // Persist complete frozen sale snapshots for exchange/check-in and trusted quotes.
  for (const tr of r.trips.filter((tr) => tr.status !== "DRAFT")) {
    const car = t.car.cars.find((x) => x.id === tr.car.id),
      v = r.vendors[tr.vendor - 1];
    const snapshot = {
      id: tr.id,
      operatorId: tr.operator,
      operatorUserId: tr.owner,
      routeId: tr.route.id,
      origin: tr.route.origin,
      destination: tr.route.destination,
      departureAt: tr.departure,
      arrivalAt: tr.arrival,
      priceVnd: String(tr.price),
      offerListingId: tr.route.listingId,
      status: tr.status,
      operatorStatus: "ACTIVE",
      inventorySyncPending: false,
      vehicle: {
        id: car.id,
        name: car.name,
        type: car.type,
        licensePlate: car.license_plate,
      },
      operatorProfile: {
        id: v.id,
        name: v.name + " DEMO",
        logoUrl: null,
        contactPhone: "0900000000",
      },
      totalSeats: car.total_seats,
      seats: t.car.seat_templates
        .filter((s) => s.car_id === car.id)
        .map((s) => ({
          id: s.id,
          code: s.code,
          level: s.level,
          seatClass: s.seat_class,
          row: s.row,
          column: s.column,
        })),
      classPrices: {
        STANDARD: String(tr.price),
        VIP: String(tr.price + 50000),
      },
      stops: tr.route.stops.map((s, i) => ({
        id: s.id,
        name: s.name,
        order: i,
        scheduledAt: stamp(plus(tr.departure, (i * tr.route.duration) / 3)),
        pickupAllowed: i < 3,
        dropoffAllowed: i > 0,
        address: s.address,
        province: s.province,
      })),
    };
    snapshot.version = sha(JSON.stringify(snapshot));
    t.car.trips.find((x) => x.id === tr.id).sale_snapshot = snapshot;
  }
  return p;
}

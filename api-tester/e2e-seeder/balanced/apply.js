// Additive balancing: preserve live inventory quantities, locks and all old prices.
const fs = require("fs"),
  path = require("path"),
  assert = require("assert/strict");
const { connect, accounts } = require("../expansion/db");
const { createPlan, dir } = require("./plan");
const { provinces } = require("./provinces");
const sql = require("./sql");
const snake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const payload = (rows) =>
  JSON.stringify(
    rows.map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [snake(k), v])),
    ),
  );
async function main() {
  const journalPath = path.join(dir, "journal.json");
  if (fs.existsSync(journalPath)) {
    const prior = JSON.parse(fs.readFileSync(journalPath, "utf8"));
    assert.ok(
      !String(prior.status).startsWith("inventory_committed"),
      "An interrupted cross-database commit needs reconciliation before another run",
    );
  }
  const plan = await createPlan();
  if (!process.argv.includes("--apply")) return;
  const skip =
    !plan.normalization.length &&
    !plan.landmarks.length &&
    !plan.complexes.length &&
    !plan.listings.length &&
    !plan.inventory.length &&
    !plan.inventoryIncomplete.length;
  if (skip) {
    console.log("Already complete: no seed writes required");
    return;
  }
  const users = new Map((await accounts()).map((u) => [u.id, u]));
  const manifest = require("../cloudinary-images.json");
  require("../image-store").configure();
  const verified = new Set(
    Object.values(manifest.assets)
      .filter((e) => e.state === "verified")
      .map((e) => e.secureUrl),
  );
  const own =
    "https://res.cloudinary.com/" + manifest.cloudName + "/image/upload/";
  const allIds = [
    ...plan.landmarks,
    ...plan.complexes,
    ...plan.listings,
    ...plan.reviews,
    ...plan.inventory,
  ].map((x) => x.id);
  assert.equal(new Set(allIds).size, allIds.length);
  const complexes = new Map(plan.complexes.map((x) => [x.id, x]));
  for (const x of [...plan.landmarks, ...plan.complexes, ...plan.listings]) {
    assert.ok(x.description.length > 300);
    assert.ok(
      x.latitude >= 8 &&
        x.latitude <= 24 &&
        x.longitude >= 102 &&
        x.longitude <= 111,
    );
    for (const u of [
      x.thumbnailUrl,
      ...(x.galleryUrls || x.attributes?.galleryUrls || []),
    ])
      assert.ok(
        u.startsWith(own) && verified.has(u),
        "Every image must be uploaded and verified",
      );
    assert.ok(!(x.title || x.name).includes("[Mẫu]"));
  }
  for (const l of plan.listings) {
    assert.ok(
      users
        .get(l.hostId)
        ?.roles.some((r) => r === "HOST" || r === "ENTERPRISE"),
    );
    const rr = plan.reviews.filter((r) => r.listingId === l.id);
    assert.equal(rr.length, 3);
    assert.equal(new Set(rr.map((r) => r.userId)).size, 3);
    assert.equal(
      Math.round((rr.reduce((a, r) => a + r.rating, 0) / 3) * 10) / 10,
      l.averageRating,
    );
    if (complexes.has(l.complexId))
      assert.equal(l.hostId, complexes.get(l.complexId).hostId);
  }
  for (const c of plan.complexes) {
    assert.ok(users.get(c.hostId)?.roles.includes("ENTERPRISE"));
    assert.ok(
      plan.listings.filter((l) => l.complexId === c.id).length >= 2,
      "Every new complex needs multiple actual children",
    );
  }
  const catalog = await connect("CatalogandListing"),
    booking = await connect("BookingandInventory");
  let bookingCommitted = false,
    catalogCommitted = false;
  const receipt = {
    batchId: plan.batchId,
    startedAt: new Date().toISOString(),
    provinces: provinces.length,
    targets: plan.targets,
    normalization: plan.normalization.length,
    added: {
      landmarks: plan.landmarks.length,
      complexes: plan.complexes.length,
      listings: plan.listings.length,
      reviews: plan.reviews.length,
      inventoryConfigs: plan.inventory.length,
    },
    status: "prepared",
  };
  fs.copyFileSync(
    path.join(dir, "plan.json"),
    path.join(dir, "applied-plan.json"),
  );
  fs.writeFileSync(
    path.join(dir, "journal.json"),
    JSON.stringify(receipt, null, 2),
  );
  try {
    await catalog.query("BEGIN");
    await booking.query("BEGIN");
    for (const c of [catalog, booking]) {
      await c.query("SET LOCAL lock_timeout='5s'");
      await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        plan.batchId,
      ]);
    }
    fs.writeFileSync(
      path.join(dir, "normalization-backup.json"),
      JSON.stringify(plan.normalization, null, 2),
      { mode: 0o600 },
    );
    for (const change of plan.normalization) {
      const r = await catalog.query(
        `UPDATE ${change.table} SET province=$2,updated_at=now() WHERE id=$1 AND province=$3`,
        [change.id, change.after, change.before],
      );
      assert.equal(r.rowCount, 1, "Province changed during planning");
    }
    for (const table of ["landmarks", "complexes", "listings", "reviews"])
      if (plan[table].length)
        await catalog.query(sql[table], [payload(plan[table])]);
    if (plan.inventory.length)
      await booking.query(sql.inventory_configs, [payload(plan.inventory)]);
    for (const table of ["landmarks", "complexes", "listings", "reviews"])
      if (plan[table].length)
        await catalog.query(
          `INSERT INTO seed_record_provenance(record_type,record_id,batch_id,origin,presentation_revision) SELECT $1,id,$2,$3,1 FROM jsonb_to_recordset($4::jsonb) AS x(id uuid) ON CONFLICT(record_type,record_id) DO NOTHING`,
          [
            table,
            plan.batchId,
            table === "landmarks" ? "public-sourced" : "synthetic",
            payload(plan[table]),
          ],
        );
    for (let i = 0; i < plan.inventoryIncomplete.length; i += 400) {
      const ids = plan.inventoryIncomplete.slice(i, i + 400);
      const r = await booking.query(
        `INSERT INTO inventory_calendars(id,listing_id,date,time_slot,available_quantity,status,version,created_at,updated_at) SELECT gen_random_uuid(),c.listing_id,$2::date+d.n,s.slot,s.quantity,'AVAILABLE',0,now(),now() FROM inventory_configs c CROSS JOIN generate_series(0,90) AS d(n) CROSS JOIN LATERAL jsonb_to_recordset(CASE WHEN c.category='STAY' THEN jsonb_build_array(jsonb_build_object('slot','ALL_DAY','quantity',c.schedule_config->'defaultQuantity')) ELSE c.schedule_config->'timeSlots' END) AS s(slot text,quantity integer) WHERE c.listing_id=ANY($1::uuid[]) AND c.is_active=true ON CONFLICT(listing_id,date,time_slot) DO NOTHING`,
        [ids, plan.inventoryStart],
      );
      receipt.added.calendars = (receipt.added.calendars || 0) + r.rowCount;
      console.log(
        "Inventory prepared " +
          Math.min(i + 400, plan.inventoryIncomplete.length) +
          "/" +
          plan.inventoryIncomplete.length,
      );
    }
    const grouped = (
      await catalog.query(
        "SELECT province,category,sub_category,attributes->'stayDetail'->>'propertyType' AS property_type,count(*)::int AS n FROM listings WHERE status='ACTIVE' GROUP BY 1,2,3,4",
      )
    ).rows;
    for (const province of provinces)
      for (const [kind, target] of Object.entries(plan.targets)) {
        if (kind === "COMPLEX") continue;
        const sum = grouped
          .filter(
            (r) =>
              r.province === province &&
              (r.category === "STAY"
                ? "STAY:" + r.property_type
                : r.category === "SVC"
                  ? "SVC:" + r.sub_category
                  : "EXP") === kind,
          )
          .reduce((a, r) => a + r.n, 0);
        assert.equal(sum, target, province + " " + kind + " is not balanced");
      }
    const cx = (
      await catalog.query(
        "SELECT province,count(*)::int AS n FROM complexes WHERE status='ACTIVE' GROUP BY province",
      )
    ).rows;
    assert.equal(cx.length, 34);
    for (const r of cx) assert.equal(r.n, plan.targets.COMPLEX);
    const missing = (
      await booking.query(
        "SELECT count(*)::int AS n FROM unnest($1::uuid[]) AS ids(id) WHERE NOT EXISTS(SELECT 1 FROM inventory_calendars cal WHERE cal.listing_id=ids.id AND cal.date=$2::date AND cal.status='AVAILABLE' AND cal.available_quantity>0)",
        [plan.listings.map((l) => l.id), plan.inventoryStart],
      )
    ).rows[0].n;
    assert.equal(
      missing,
      0,
      "All newly seeded listings need availability today; existing sold-out calendars are preserved",
    );
    await booking.query("COMMIT");
    bookingCommitted = true;
    receipt.status = "inventory_committed";
    fs.writeFileSync(
      path.join(dir, "journal.json"),
      JSON.stringify(receipt, null, 2),
    );
    await catalog.query("COMMIT");
    catalogCommitted = true;
    receipt.status = "committed";
    receipt.completedAt = new Date().toISOString();
    fs.writeFileSync(
      path.join(dir, "journal.json"),
      JSON.stringify(receipt, null, 2),
    );
    fs.writeFileSync(
      path.join(__dirname, "receipt.json"),
      JSON.stringify(receipt, null, 2) + "\n",
    );
    console.log(JSON.stringify(receipt));
  } catch (e) {
    if (!catalogCommitted) await catalog.query("ROLLBACK").catch(() => {});
    if (!bookingCommitted) await booking.query("ROLLBACK").catch(() => {});
    receipt.status =
      bookingCommitted && !catalogCommitted
        ? "inventory_committed_requires_reconciliation"
        : "rolled_back";
    receipt.error = e.message;
    fs.writeFileSync(
      path.join(dir, "journal.json"),
      JSON.stringify(receipt, null, 2),
    );
    throw e;
  } finally {
    await catalog.end();
    await booking.end();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});

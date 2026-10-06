// Read-only verification of the imported batch and province totals.
const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
const { connect } = require("../expansion/db");
const { provinces } = require("./provinces");
const { dir } = require("./plan");

async function main() {
  const journal = JSON.parse(
    fs.readFileSync(path.join(dir, "journal.json"), "utf8"),
  );
  assert.equal(
    journal.status,
    "committed",
    "The batch has not finished committing",
  );
  const plan = JSON.parse(
    fs.readFileSync(path.join(dir, "applied-plan.json"), "utf8"),
  );
  const catalog = await connect("CatalogandListing");
  const booking = await connect("BookingandInventory");
  const identity = await connect("Identity");
  try {
    const listings = (
      await catalog.query("SELECT * FROM listings WHERE status='ACTIVE'")
    ).rows;
    const complexes = (
      await catalog.query("SELECT * FROM complexes WHERE status='ACTIVE'")
    ).rows;
    const landmarks = (
      await catalog.query("SELECT * FROM landmarks WHERE status='ACTIVE'")
    ).rows;
    const users = (
      await identity.query("SELECT id,is_active,is_deleted FROM users")
    ).rows;
    const knownOwners = new Set(users.map((u) => u.id));
    const activeOwners = new Set(
      users.filter((u) => u.is_active && !u.is_deleted).map((u) => u.id),
    );
    const byId = new Map(listings.map((l) => [l.id, l]));
    const byComplex = new Map(complexes.map((c) => [c.id, c]));
    const counts = Object.fromEntries(
      provinces.map((province) => [
        province,
        {
          province,
          STAY: 0,
          EXP: 0,
          SVC: 0,
          COMPLEX: 0,
          landmarks: 0,
          kinds: {},
        },
      ]),
    );
    for (const l of listings) {
      assert.ok(
        counts[l.province],
        "Legacy/unrecognized province: " + l.province,
      );
      const c = counts[l.province];
      c[l.category]++;
      const key =
        l.category === "STAY"
          ? "STAY:" + l.attributes.stayDetail.propertyType
          : l.category === "SVC"
            ? "SVC:" + l.sub_category
            : "EXP";
      c.kinds[key] = (c.kinds[key] || 0) + 1;
    }
    for (const c of complexes) {
      assert.ok(counts[c.province]);
      counts[c.province].COMPLEX++;
    }
    for (const l of landmarks) {
      assert.ok(counts[l.province]);
      counts[l.province].landmarks++;
    }
    for (const province of provinces) {
      const c = counts[province];
      for (const [kind, expected] of Object.entries(plan.targets)) {
        assert.equal(
          kind === "COMPLEX" ? c.COMPLEX : c.kinds[kind],
          expected,
          province + ": " + kind,
        );
      }
      assert.ok(c.landmarks > 0);
    }
    for (const expected of plan.listings) {
      const actual = byId.get(expected.id);
      assert.ok(actual);
      assert.equal(actual.title, expected.title);
      assert.equal(actual.description, expected.description);
      assert.deepEqual(actual.attributes, expected.attributes);
      assert.ok(
        activeOwners.has(actual.host_id),
        "New owner must be an active real account",
      );
      assert.equal(actual.province, expected.province);
      assert.equal(actual.thumbnail_url, expected.thumbnailUrl);
      if (actual.complex_id) {
        const parent = byComplex.get(actual.complex_id);
        assert.ok(parent);
        assert.equal(actual.host_id, parent.host_id);
        assert.equal(actual.province, parent.province);
      }
    }
    for (const c of plan.complexes) {
      assert.ok(listings.filter((l) => l.complex_id === c.id).length >= 2);
    }
    const ids = plan.listings.map((l) => l.id);
    const reviews = (
      await catalog.query(
        `SELECT listing_id,count(*)::int AS n,
      count(DISTINCT user_id)::int AS users,round(avg(rating),1) AS rating,
      bool_and(comment LIKE '[Đánh giá giả lập]%' AND
        comment LIKE '%Không phải đánh giá của khách hàng thật%') AS labeled
      FROM reviews WHERE listing_id=ANY($1::uuid[]) GROUP BY listing_id`,
        [ids],
      )
    ).rows;
    assert.equal(reviews.length, ids.length);
    for (const r of reviews) {
      assert.equal(r.n, 3);
      assert.equal(r.users, 3);
      assert.ok(r.labeled);
      assert.equal(
        Number(r.rating),
        Number(byId.get(r.listing_id).average_rating),
      );
      assert.equal(byId.get(r.listing_id).total_reviews, r.n);
    }
    const activeIds = listings.map((l) => l.id);
    const configs = (
      await booking.query(
        "SELECT * FROM inventory_configs WHERE listing_id=ANY($1::uuid[])",
        [activeIds],
      )
    ).rows;
    assert.equal(configs.length, activeIds.length);
    const missingCalendars = (
      await booking.query(
        `SELECT count(*)::int AS n
      FROM inventory_configs c CROSS JOIN generate_series(0,90) AS d(n)
      CROSS JOIN LATERAL jsonb_to_recordset(CASE WHEN c.category='STAY'
        THEN jsonb_build_array(jsonb_build_object('slot','ALL_DAY'))
        ELSE c.schedule_config->'timeSlots' END) AS s(slot text)
      WHERE c.is_active=true AND c.listing_id=ANY($1::uuid[])
      AND NOT EXISTS(SELECT 1 FROM inventory_calendars cal WHERE cal.listing_id=c.listing_id
        AND cal.date=$2::date+d.n AND cal.time_slot=s.slot)`,
        [activeIds, plan.inventoryStart],
      )
    ).rows[0].n;
    assert.equal(missingCalendars, 0);
    const unavailableToday = (
      await booking.query(
        `SELECT ids.id FROM unnest($1::uuid[]) AS ids(id)
      WHERE NOT EXISTS(SELECT 1 FROM inventory_calendars cal WHERE cal.listing_id=ids.id
        AND cal.date=$2::date AND cal.status='AVAILABLE' AND cal.available_quantity>0)`,
        [activeIds, plan.inventoryStart],
      )
    ).rows;
    assert.ok(
      unavailableToday.every((x) => !ids.includes(x.id)),
      "Every new listing must have stock",
    );
    const imagePolicy = (
      await catalog.query(
        `SELECT
      (SELECT count(*)::int FROM listings WHERE NOT gotravel_owned_image_url(thumbnail_url,$1)
        OR NOT gotravel_owned_image_json(attributes,$1,false)) AS bad_listings,
      (SELECT count(*)::int FROM complexes WHERE NOT gotravel_owned_image_url(thumbnail_url,$1)
        OR NOT gotravel_owned_image_json(gallery_urls,$1,true)) AS bad_complexes,
      (SELECT count(*)::int FROM landmarks WHERE NOT gotravel_owned_image_url(thumbnail_url,$1)
        OR NOT gotravel_owned_image_json(gallery_urls,$1,true)) AS bad_landmarks`,
        [require("../cloudinary-images.json").cloudName],
      )
    ).rows[0];
    assert.ok(Object.values(imagePolicy).every((n) => n === 0));
    const totals = {};
    for (const table of ["listings", "complexes", "landmarks", "reviews"]) {
      totals[table] = (
        await catalog.query(`SELECT count(*)::int AS n FROM ${table}`)
      ).rows[0].n;
    }
    for (const table of [
      "inventory_configs",
      "inventory_calendars",
      "inventory_locks",
    ]) {
      totals[table] = (
        await booking.query(`SELECT count(*)::int AS n FROM ${table}`)
      ).rows[0].n;
    }
    const legacyOwnerIssues = {
      listingsWithUnknownOwner: listings.filter(
        (l) => !knownOwners.has(l.host_id),
      ).length,
      complexesWithUnknownOwner: complexes.filter(
        (c) => !knownOwners.has(c.host_id),
      ).length,
      distinctUnknownOwners: new Set(
        [...listings, ...complexes]
          .filter((l) => !knownOwners.has(l.host_id))
          .map((l) => l.host_id),
      ).size,
      newListingsWithUnknownOwner: plan.listings.filter(
        (l) => !knownOwners.has(l.hostId),
      ).length,
    };
    assert.equal(legacyOwnerIssues.newListingsWithUnknownOwner, 0);
    const report = {
      verifiedAt: new Date().toISOString(),
      batchId: plan.batchId,
      totals,
      balanced: true,
      provinces: Object.values(counts),
      newListingsVerified: ids.length,
      newReviewGroupsVerified: reviews.length,
      newComplexesVerified: plan.complexes.length,
      missingCalendars,
      preservedUnavailableToday: unavailableToday.length,
      imagePolicy,
      legacyOwnerIssues,
    };
    fs.writeFileSync(
      path.join(__dirname, "verification.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    fs.writeFileSync(
      path.join(__dirname, "province-counts.csv"),
      "\uFEFFprovince,STAY,EXP,SVC,COMPLEX,landmarks\n" +
        Object.values(counts)
          .map((c) =>
            [c.province, c.STAY, c.EXP, c.SVC, c.COMPLEX, c.landmarks].join(
              ",",
            ),
          )
          .join("\n") +
        "\n",
    );
    console.log(
      JSON.stringify({ ...report, provinces: report.provinces.length }),
    );
  } finally {
    await Promise.allSettled([catalog.end(), booking.end(), identity.end()]);
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});

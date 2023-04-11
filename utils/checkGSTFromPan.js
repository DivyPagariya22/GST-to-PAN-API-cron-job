import moment from "moment/moment.js";
import fetch from "node-fetch";
import { v4 } from "uuid";

import { fos_db, db } from "../app.config.js";

export async function findGSTFromPan() {
  try {
    const date = "2023-03-27 17:53:49.583"; // new Date();
    const startDate = moment(date)
      .startOf("day")
      .format("YYYY-MM-DD[T]HH:mm:ss[Z]");
    console.log(date, startDate);

    const storeVerifiedToday = await db.any(
      `select id, pan from store where pan_verification_status = 'VERIFIED' and pan_verified_at >= $1
     and pan_verified_at <= $2
    `,
      [startDate, date]
    );
    console.log("From Store Table", storeVerifiedToday);

    const storeNotPresentInPanInfoTable = await getFilteredStores(
      storeVerifiedToday
    );

    console.log(
      "Stores which were not present in pan_verified_table",
      storeNotPresentInPanInfoTable
    );

    // storeNotPresentInPanInfoTable.push({ id: 225, pan: "ACWPC8448A" });
    // storeNotPresentInPanInfoTable.push({ id: 225, pan: "ACWPC8448A" });
    // storeNotPresentInPanInfoTable.push({ id: 225, pan: "ACWPC8448A" });

    for (let i = 0; i < storeNotPresentInPanInfoTable.length; i++) {
      // SleepTime for every 5th iteration
      if (i !== 0 && i % 4 === 0) {
        console.log("in Sleep");
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }

      // extract Pan and store_id from filtered Stores
      const pan = storeNotPresentInPanInfoTable[i].pan;
      const id = storeNotPresentInPanInfoTable[i].id;

      // Check Pan Number
      const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
      if (pan.length != 0 && panRegex.test(pan)) {
        // Making API Call to MasterGst
        const response = await fetch(
          `https://blog-backend.mastersindia.co/api/v1/custom/search/name_and_pan/?keyword=${pan}`,
          { headers: { origin: "https://www.mastersindia.co" } }
        );
        const jsonResp = await response.json();
        //console.log(jsonResp);

        // Checking if we found any gst registering for that PAN
        let resData = {};
        if (pan.length > 0 && jsonResp.success) {
          console.log(`store id: ${id} - GSTIN: ${jsonResp.data[0].gstin}`);
          resData = {
            store_id: id,
            gstin: jsonResp.data[0].gstin,
            gst_json: jsonResp.data[0],
            pan: pan,
          };
        } else {
          console.log("NOT found GST!");
          notFoundGST++;
          resData = {
            store_id: id,
            gstin: null,
            gst_json: {},
            pan: store.pan,
          };
        }

        // Inserting Data into the DB
        await fos_db.any(
          `
            INSERT INTO pan_verified_gst_info
            (id, store_id, gstin, gst_json, pan) 
            VALUES
            ($1,$2,$3,$4::json,$5)
          `,
          [
            v4(),
            resData.store_id,
            resData.gstin,
            JSON.stringify(resData.gst_json),
            resData.pan,
          ]
        );
      }
    }
  } catch (err) {
    throw err;
  }
}

async function getFilteredStores(storeVerifiedToday) {
  let filteredStores = [];
  for (let i = 0; i < storeVerifiedToday.length; i++) {
    const { id, pan } = storeVerifiedToday[i];
    const isStorePresent = await fos_db.any(
      `SELECT EXISTS (SELECT 1 FROM pan_verified_gst_info WHERE pan = $1 AND store_id = $2);
        `,
      [pan, id]
    );
    if (!isStorePresent[0].exists) filteredStores.push({ pan, id });
  }

  return filteredStores;
}

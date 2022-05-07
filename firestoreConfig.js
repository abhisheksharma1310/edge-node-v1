//Configuration file for Firestore database access

var admin = require("firebase-admin"); //include firebase-admin

var serviceAccount = require("./serviceAccountKey.json"); //include service account private key json file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fir-production-client-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.firestore();  //firestore data base instance
const rtdb = admin.database(); //rtdb instance
const storage = admin.storage(); //storage instance

module.exports.db = db; //export db instance to use in other file
module.exports.rtdb = rtdb;
module.exports.storage = storage;

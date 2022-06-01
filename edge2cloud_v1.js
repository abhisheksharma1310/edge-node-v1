//Test code for raspberry pi to work as edge device

//All important modules
//const { DocumentSnapshot } = require('@google-cloud/firestore');
const firebase = require('./firebaseConfig'); //include configFirestore file as module
const key = require('./clientApiKey')
const schedule = require('node-schedule');
const fs = require('fs');
const db = firebase.db;

//other packages
const internetAvailable = require("internet-available");
const isOnline = require('is-online');
const botStatus = require('./botstatus');
const botStatusSample = require('./statusSample');
const scheduleTimeSaved = require('./scheduleTime');
const { SerialPort, ByteLengthParser } = require("serialport");
const shell = require('shelljs');

const port = new SerialPort({ path: "COM23", baudRate: 115200 }, (error) => { console.log(error); }); //dev/ttyACM0
const parser = port.pipe(new ByteLengthParser({ length: 72 }));

let date_ob = new Date();

//constant value
const today = ("0" + date_ob.getDate()).slice(-2) + '-' + ("0" + (date_ob.getMonth() + 1)).slice(-2) + '-' + date_ob.getFullYear();

//Firestore edgeInfo reference
let edgeId;
let siteRef;
let siteId;
const email = key.email;
const password = key.password;

//global variables
let ownerId;
let ownerSiteUpdateRef;
let ownerSiteBotsCommandRef;
let botStatusRtdb;

//other variables
let fleetStart, fleetStartEdge, panicButton, panicButtonEdge, fastCleaning;
let scheduleTime, scheduleRoutine, scheduleDay;
let scheduleLocal, scheduleNet;
let botStatusLive = false, botStatusLog = false, updateCloud = false;
let sessionId, rspRst = false;
let hour, minute;
let totalBots = 0, botCharging = 0, botRunning = 0, rfAlive = 0;
let startStop = 2;

//temp variable
let t_fleetStart, t_panicButton, t_fastCleaning;
let t_scheduleTime, t_scheduleRoutine, t_scheduleDay;
let t_scheduleLocal, t_scheduleNet;
let t_sessionId, t_rspRst;
let t_totalBots, t_botCharging, t_botRunning, t_rfAlive;
let t_net, t_validData;
let t_startStop = 2;

//Call InternetCheck First Function *Important
internetCheckFirst();

//Check Internet Availability
function internetCheckFirst() {
    internetAvailable({
        timeout: 6000,
        retries: 10,
    }).then(() => {
        console.log("Internet available");
        //call startAuth function
        startAuth();
        t_net = 1;
    }).catch(() => {
        console.log("No internet Available");
        internetCheckSecond();
        t_net = 0;
        //call localSchedule function
        localScheduleFunction();
    });
}

function internetCheckSecond() {
    internetAvailable({
        timeout: 6000,
        retries: 560,
    }).then(() => {
        console.log("Internet available!");
        internetCheckFirst();
    }).catch(() => {
        console.log("No internet Available");
        internetCheckFirst();
    });
}

//function for local schedule work
function localScheduleFunction() {
    scheduleTime = scheduleTimeSaved.scheduleTime;
    a = scheduleTimeSaved.scheduleDay.split(',');
    scheduleDay = a.map(myFunction)
    function myFunction(num) {
        return parseInt(num);
    }
    scheduleRoutine = scheduleTimeSaved.scheduleRoutime;
    scheduleLocal = scheduleTimeSaved.scheduleLocal;
    scheduleNet = scheduleTimeSaved.scheduleNet;
    console.log('Local function: ', 'scheduleTime: ', scheduleTime, 'scheduleDay: ', scheduleDay, 'scheduleRoutine: ', scheduleRoutine, scheduleLocal, scheduleNet);
    t_net == 0 ? scheduleStart() : null;
}

//function for start authentication with cloud
function startAuth() {
    firebase.auth.signInWithEmailAndPassword(email, password)
        .then((Credential) => {
            console.log(Credential.user.uid);
            edgeId = Credential.user.uid;
            if (edgeId != null) {
                siteRef = db.collection('edge_info').doc(edgeId);
                //call function to communicate with cloud
                startCloudFunction();
            }
        }).catch(function (error) {
            // Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            if (errorCode === 'auth/wrong-password') {
                console.log('Wrong password.');
            }
            if (errorCode === 'auth/network-request-failed') {
                console.log('Network Error');
                setTimeout(() => {
                    startAuth();
                }, 120000);
            }
            else {
                console.log(errorMessage);
            }
            console.log(error);
        });
}

//function to start cloud communication
function startCloudFunction() {
    //Read info from checkSiteId ref
    try {
        siteRef.get().then((DocumentSnapshot) => {
            siteId = DocumentSnapshot.get('siteId');
            ownerId = DocumentSnapshot.get('ownerId');
            //update status if ownerId found
            if (ownerId != null && siteId != null) {
                console.log('ownerId: ', ownerId, 'siteId', siteId);
                //set owner site update path
                ownerSiteUpdateRef = db.collection('owners').doc(ownerId).collection('sites').doc(siteId);
                //set owner site command path
                ownerSiteBotsCommandRef = ownerSiteUpdateRef;
                //set rtdb reference
                rtdbref = firebase.rtdb.ref('Edge/EdgeData/' + ownerId + '/' + siteId);
                botStatusRtdb = rtdbref;
                //call validateOwnerSiteRef
                communicateToOwnerSiteRef();
                //update presence
                updateEdgeOnlinePresence();
            }
        }).catch((error) => {
            console.log('Encountered error: ', error);
        })
    } catch (error) {
        console.log('Encountered error ownerUid: ', error);
    }
}

//update online presence
function updateEdgeOnlinePresence() {

    userStatusDatabaseRef = firebase.rtdb.ref('Edge/EdgePresenceInfo/' + edgeId);

    var isOfflineForDatabase = {
        state: 'offline',
        last_changed: Date.now(),
        ownerId: ownerId,
        siteId: siteId,
    };

    var isOnlineForDatabase = {
        state: 'online',
        last_changed: Date.now(),
        ownerId: ownerId,
        siteId: siteId,
    };

    // Create a reference to the special '.info/connected' path in 
    // Realtime Database. This path returns `true` when connected
    // and `false` when disconnected.
    firebase.rtdb.ref('.info/connected').on('value', function (snapshot) {
        // If we're not currently connected, don't do anything.
        if (snapshot.val() == false) {
            return;
        };
        console.log(snapshot.val() == true ? 'Site is now connected to the cloud' : 'Site is now offline');
        // If we are currently connected, then use the 'onDisconnect()' 
        // method to add a set which will only trigger once this 
        // client has disconnected by closing the app, 
        // losing internet, or any other means.
        userStatusDatabaseRef.onDisconnect().set(isOfflineForDatabase).then(function () {
            // The promise returned from .onDisconnect().set() will
            // resolve as soon as the server acknowledges the onDisconnect() 
            // request, NOT once we've actually disconnected:
            // https://firebase.google.com/docs/reference/js/firebase.database.OnDisconnect

            // We can now safely set ourselves as 'online' knowing that the
            // server will mark us as offline once we lose connection.
            userStatusDatabaseRef.set(isOnlineForDatabase);
        });
    });

}

//function for communicate to cloud
function communicateToOwnerSiteRef() {
    //call edgeStatusUpdate
    edgeStatusUpdate();
    //function call to update all bots status
    updateAllBotsStatus();
    //botStatus update to firebase rtdb
    botStatusLiveUpdateToRtdb(0);
    //update botStatus logs to rtdb 
    botStatusAsLogUpdateToRtdb(0, botStatus.id[0].status);
}

//function for edgeStatusUpdate
async function edgeStatusUpdate() {
    //update edge status
    var dateTime = Date.now();
    try {
        //update rspRst State false
        ownerSiteUpdateRef.update({ 'rspRst': false }).catch((error) => {
            console.log('Error:', error);
        });
        //update edgeStartTime
        ownerSiteUpdateRef.update({ 'rspStartTime': dateTime }).catch((error) => {
            console.log('Error:', error);
        });
        //cc uarts error
        port.isOpen == true ? reportCcAvailable() : reportCcUnavailable();

        //call checkCloudCommand
        checkCloudCommand();

    } catch (error) {
        console.log('edge status update fail', error);
    }
}

//function for checkCloudCommand
async function checkCloudCommand() {
    // Subsequent queries will use persistence, if it was enabled successfully
    //take snapshot from cloud
    try {
        ownerSiteBotsCommandRef.onSnapshot((DocumentSnapshot) => {
            //check sessionId
            sessionId = DocumentSnapshot.get('updateSessionId');
            //fleetStartStop
            fleetStart = DocumentSnapshot.get('fleetStart');
            //fleetStartEdge
            fleetStartEdge = DocumentSnapshot.get('fleetStartEdge');
            //panicButton
            panicButton = DocumentSnapshot.get('panicButton');
            //panicButtonEdge
            panicButtonEdge = DocumentSnapshot.get('panicButtonEdge')
            //cleaningMode
            fastCleaning = DocumentSnapshot.get('fastCleaning');
            //scheduleTime
            scheduleTime = DocumentSnapshot.get('scheduleTime');
            //scheduleRoutine
            scheduleRoutine = DocumentSnapshot.get('scheduleRoutine');
            //scheduleDay
            scheduleDay = DocumentSnapshot.get('scheduleDay');
            //scheduleLocal
            scheduleLocal = DocumentSnapshot.get('scheduleLocal');
            //scheduleNet
            scheduleNet = DocumentSnapshot.get('scheduleNet');
            //botStatusLive
            botStatusLive = DocumentSnapshot.get('botStatusLive');
            //botStatusLog
            botStatusLog = DocumentSnapshot.get('botStatusLog');
            //updateCloud
            updateCloud = DocumentSnapshot.get('updateCloud');
            //rspRst
            rspRst = DocumentSnapshot.get('rspRst');
            //call takeAction function
            takeAction();
        }, error => {
            console.log('Encountered error: ', error);
        });
    } catch (error) {
        console.log('check cloud command fail', error);
    }
}

//function for take action
function takeAction() {
    //if sessionId new set
    if (sessionId != t_sessionId) {
        updateSessionId();
        t_sessionId = sessionId;
    }
    //if fleetStartStop true 
    if (fleetStart != t_fleetStart) {
        fleetStart == true ? fleetStartFunction() : null;
        t_fleetStart = fleetStart;
    }
    //if panicButton true 
    if (panicButton != t_panicButton) {
        panicButton == true ? panicButtonFunction() : null;
        t_panicButton = panicButton;
    }
    //if cleaningMode set
    if (fastCleaning != t_fastCleaning) {
        cleaningModeFunction();
        t_fastCleaning = fastCleaning;
    }
    //if scheduleTime or scheduleRoutine or scheduleDay new set
    if (scheduleTime != t_scheduleTime || scheduleRoutine != t_scheduleRoutine || scheduleDay != t_scheduleDay) {
        scheduleTimeFunction();
        t_scheduleTime = scheduleTime;
        t_scheduleRoutine = scheduleRoutine;
        t_scheduleDay = scheduleDay;
    }
    //if scheduleLocal new set
    if (scheduleLocal != t_scheduleLocal || scheduleNet != t_scheduleNet) {
        //call sheduleTimeRecord function
        scheduleTimeRecord();
        t_scheduleLocal = scheduleLocal;
        t_scheduleNet = scheduleNet;
    }
    //if rspRst true 
    if (rspRst != t_rspRst) {
        rspRst == true ? rspRstfunction() : null;
        t_rspRst = rspRst;
    }
}

//function for update sessionId
function updateSessionId() {
    try {
        ct = Date.now();
        ownerSiteUpdateRef.update({ 'sessionId': ct }).catch((error) => {
            console.log('Error ccConnected: ', error);
        });
        console.log("sessionId: ", sessionId, ' :: ', ct);
    } catch (error) {
        console.log(error);
    }
}

//function for fleetStartStop 
function fleetStartFunction() {
    //if fleetStartStop true 
    port.isOpen == true ? port.write(Buffer.from([27]), (error) => { console.log(error) }) : null;
    console.log('Fleet Start now');
}

//function for panicButton
function panicButtonFunction() {
    //if panicButton true 
    port.isOpen == true ? port.write(Buffer.from([35]), (error) => { console.log(error) }) : null;
    console.log('Panic Button press now');
}

//function for cleaningMode
function cleaningModeFunction() {
    //if cleaningMode set
    let cleaningMode = fastCleaning ? 53 : 59;
    port.isOpen == true ? port.write(Buffer.from([cleaningMode]), (error) => { console.log(error) }) : null;
    console.log('Cleaning Mode: ', fastCleaning, cleaningMode);
}

//function for scheduleTime
function scheduleTimeFunction() {
    //if scheduleTime new set
    //console.log('New Schedule Time: ',scheduleTime);
    scheduleStart();
    //call sheduleTimeRecord function
    scheduleTimeRecord();
}

//function for reporting cc Available
async function reportCcAvailable() {
    try {
        ownerSiteUpdateRef.update({ 'ccConnected': true }).catch((error) => {
            console.log('Error ccConnected: ', error);
        });
        console.log("ccAvailable");
    } catch (error) {
        console.log(error);
    }
}

//function for reporting cc Available
async function reportCcUnavailable() {
    try {
        ownerSiteUpdateRef.update({ 'ccConnected': false }).catch((error) => {
            console.log('Error ccConnected: ', error);
        });
        console.log("cc Unavailable");
    } catch (error) {
        console.log(error);
    }
}


//function for sheduleStart
function scheduleStart() {
    //scheduleTime
    st1 = scheduleTime.split('(')
    st2 = st1[1].split(')');
    st3 = st2[0].split(':');
    hour = parseInt(st3[0]);
    minute = parseInt(st3[1]);
    //console.log('hour: ',hour,' minute: ',minute);
    //scheduleRoutine
    sr1 = parseInt(scheduleRoutine.split(':')[0]);
    sr2 = parseInt(scheduleRoutine.split(':')[1]);
    //scheduleDay
    sd1 = scheduleDay;
    //schedule job
    const rule = new schedule.RecurrenceRule();
    rule.dayOfWeek = (sr1 == 1 || sr1 == 2) ? [new schedule.Range(0, 6, sr2)] : sd1;
    rule.hour = hour;
    rule.minute = minute;
    // rule.tz = 'Asia/Calcutta';
    const job = schedule.scheduleJob(rule, scheduleStartNow);
    //print
    // if(sr1==1){
    //     console.log('Your bot will run everyday!');
    // }
    // if(sr1==2){
    //     console.log('Your bot will run after ',sr2, 'day.')
    // }
    // if(sr1==3){
    //     console.log('your bot will run on selected day.',sd1);
    // }

}

//function for shedule start
function scheduleStartNow() {
    isOnline({
        // Break on 5 seconds
        timeout: 5000,
        // v4 or v6
        //version: "v4"
    }).then(online => {
        if (online) {
            console.log("We have internet");
            scheduleNet == true ? sentCommand() : console.log('Not permission to start on schedule time when online');
        } else {
            console.log("Houston we have a problem");
            scheduleLocal == true ? sentCommand() : console.log('Not permission to start on schedule time when offline');
        }
    });

    function sentCommand() {
        port.isOpen == true && botRunning == 0 ? port.write(Buffer.from([27]), (error) => { console.log(error) }) : console.log('Its time to start bots but cc is not connected or schedule run fail because bots are allready running.');
        console.log('Its time to start bot', hour, ':', minute);
    }
}

//function for scheduleTimeRecord
function scheduleTimeRecord() {
    s_data = `let scheduleTimeSaved = {
        scheduleTime: '${scheduleTime}',
        scheduleDay: '${scheduleDay}',
        scheduleRoutime: '${scheduleRoutine}',
        scheduleLocal: ${scheduleLocal},
        scheduleNet: ${scheduleNet}
    }
module.exports = scheduleTimeSaved;`

    fs.writeFile('scheduleTime.js', s_data, function (err) {
        if (err) throw err;
        console.log('Replaced: ', 'scheduleTime: ', scheduleTime, 'scheduleDay: ', scheduleDay, 'scheduleRoutine: ', scheduleRoutine);
    });
}

//function for rsp restart
function rspRstfunction() {
    //if rspShutDown true 
    console.log('Restart Raspberrpi now');
    shell.exec('sudo shutdown -r now');
}

/************************************************   Bot Status Update to Cloud  ************************************************/

//update botStatus live to rtdb
async function botStatusLiveUpdateToRtdb(botId) {
    //console.table(botStatus.id[botId]);
    // update logs to cloud
    try {
        botStatusRtdb.child('botStatus').child(botId.toString()).update(botStatus.id[botId]).catch((error) => {
            console.log('Error:', error);
        })
    } catch (error) {
        console.log('botStatusLiveUpdateToRtdb fail', error)
    }
}

//update botStatus as log to rtdb
async function botStatusAsLogUpdateToRtdb(botId, c_data) {
    // let date_Ob = new Date();
    // let cTime = date_Ob.getHours() + ':' + date_Ob.getMinutes() + ':' + date_Ob.getSeconds();
    c_datas = { ...c_data };
    c_datas.date = Date.now();
    console.table(c_datas);
    // update logs to cloud
    try {
        botStatusRtdb.child('logs').child(today).child(botId.toString()).push(c_datas).catch((error) => {
            console.log('Error: ', error);
        })
    } catch (error) {
        console.log('botStatuAsLogUpdateToRtdb fail', error);
    }
}

//observe changes in botStatus object
//Object.observe(botStatus, updateTotalBots);

//function for update total bot active to firestore on site level
function updateTotalBots() {
    if (totalBots != t_totalBots) {
        //update to cloud
        try {
            //update edgeAlive 
            ownerSiteUpdateRef.update({ 'totalBots': totalBots }).catch((error) => {
                console.log('Error:', error);
            });
        } catch (error) {
            console.log('Total bots status update fail', error);
        }
        t_totalBots = totalBots;
    }
}
//function for update total bot running to firestore on site level
function updateBotRunning() {
    if ((botRunning != t_botRunning) && (botRunning <= totalBots)) {
        //update to cloud
        try {
            //update edgeAlive 
            ownerSiteUpdateRef.update({ 'botRunning': botRunning }).catch((error) => {
                console.log('Error:', error);
            });
        } catch (error) {
            console.log('Bot Running status update fail', error);
        }
        t_botRunning = botRunning;
    }
    //botRunnning > 0 && fleetStart == true
    if (botRunning > 0 && (fleetStart == true || fleetStartEdge == true)) {
        //update to cloud
        try {
            //update edgeAlive 
            ownerSiteUpdateRef.update({ 'fleetStart': false, 'fleetStartEdge': false }).catch((error) => {
                console.log('Error:', error);
            });
        } catch (error) {
            console.log('Fleet Start Stop Button status update fail', error);
        }
    }
    //botRunning == 0 && panicButton == true
    if (botRunning == 0 && (panicButton == true || panicButtonEdge == true)) {
        //update to cloud
        try {
            //update edgeAlive 
            ownerSiteUpdateRef.update({ 'panicButton': false, 'panicButtonEdge': false }).catch((error) => {
                console.log('Error:', error);
            });
        } catch (error) {
            console.log('Panic Button status update fail', error);
        }
    }
}
//function for update total bot running to firestore on site level
function updateBotCharging() {
    if (botCharging != t_botCharging && botCharging <= totalBots) {
        //update to cloud
        try {
            //update edgeAlive 
            ownerSiteUpdateRef.update({ 'botCharging': botCharging }).catch((error) => {
                console.log('Error:', error);
            });
        } catch (error) {
            console.log('Bot Charging status update fail', error);
        }
        t_botCharging = botCharging;
    }
}
//function for update total bot running to firestore on site level
function updateRfAlive() {
    if (rfAlive != t_rfAlive && rfAlive <= totalBots) {
        //update to cloud
        try {
            //update edgeAlive 
            ownerSiteUpdateRef.update({ 'rfAlive': rfAlive }).catch((error) => {
                console.log('Error:', error);
            });
        } catch (error) {
            console.log('Rf Alive status update fail', error);
        }
        t_rfAlive = rfAlive;
    }
}

//function for update all bots status
async function updateAllBotsStatus() {
    //update total bots
    totalBots = botStatus.id.length;
    //update total bot running
    botRunning = botStatus.id.reduce(function (accumVariable, curValue) {
        if (curValue.status.botStartStop == true) {
            accumVariable++;
        }
        return accumVariable;
    }, 0)
    //update total bot charging
    botCharging = botStatus.id.reduce(function (accumVariable, curValue) {
        if (curValue.status.batteryCharging == true) {
            accumVariable++;
        }
        return accumVariable;
    }, 0)
    //update total bot connected to rf
    rfAlive = botStatus.id.reduce(function (accumVariable, curValue) {
        if (curValue.status.rfStatus == true) {
            accumVariable++;
        }
        return accumVariable;
    }, 0)
    /* Call Cloud update function */
    updateTotalBots();
    updateBotRunning();
    updateBotCharging();
    updateRfAlive();
    console.log('totalbots: ', totalBots, 'botRunning: ', botRunning, 'botCharging: ', botCharging, 'rfAlive: ', rfAlive);
}

/********************************************************** store data on from serial port ******************************************/
parser.on('data', data => {

    t_validData = true;

    let packetSize, packetType, botId, packet;
    let frameByte = Uint8Array.from(data);

    packetSize = frameByte[0];
    botId = frameByte[1] > 0 ? frameByte[1] - 1 : 0;
    packetType = frameByte[2];
    packet = frameByte.subarray(3);
    buf = Buffer.from(data);

    botStatus.id[botId] = botStatusSample;
    //console.log('botId: ', botId);

    //current time
    // let date_Ob = new Date();
    // let cTime = date_Ob.getHours() + ':' + date_Ob.getMinutes() + ':' + date_Ob.getSeconds();
    //insert boit id and current time
    botStatus.id[botId].info = {
        time: Date.now(),
        botid: botId,
    }

    switch (packetType) {
        case 1:
            botStatus.id[botId].status = {
                botStartStop: packet[0] == 1 ? true : false,
                batteryCharging: packet[1] == 1 ? true : false,
                rfStatus: packet[2] == 1 ? true : false,
                cleaningMode: packet[3],
                batteryStatus: parseFloat(buf.readFloatLE(7).toFixed(2)),
            }
            //console.table(botStatus.id[botId].status);
            //function call to update all bots status
            updateCloud == true ? updateAllBotsStatus() : null;
            //update botStatus logs to rtdb
            botStatusLog == true ? botStatusAsLogUpdateToRtdb(botId, botStatus.id[botId].status) : null;
            break;
        case 2:
            botStatus.id[botId].logs.kinematics = {
                distanceCycle: parseFloat(buf.readFloatLE(3).toFixed(2)),
                velocity: parseFloat(buf.readFloatLE(7).toFixed(2)),
                phi: parseFloat(buf.readFloatLE(11).toFixed(2)),
                dphi: parseFloat(buf.readFloatLE(15).toFixed(2)),
            }
            //console.table(botStatus.id[botId].logs.kinematics);
            //update botStatus logs to rtdb
            botStatusLog == true ? botStatusAsLogUpdateToRtdb(botId, botStatus.id[botId].logs.kinematics) : null;
            break;
        case 3:
            botStatus.id[botId].logs.power = {
                mainBatery: {
                    power: parseFloat(buf.readFloatLE(3).toFixed(2)),
                    current: parseFloat(buf.readFloatLE(7).toFixed(2)),
                    voltage: parseFloat(buf.readFloatLE(11).toFixed(2)),
                },
                driveMotorLeft: {
                    power: parseFloat(buf.readFloatLE(15).toFixed(2)),
                    current: parseFloat(buf.readFloatLE(19).toFixed(2)),
                    voltage: parseFloat(buf.readFloatLE(23).toFixed(2)),
                },
                driveMotorRight: {
                    power: parseFloat(buf.readFloatLE(27).toFixed(2)),
                    current: parseFloat(buf.readFloatLE(31).toFixed(2)),
                    voltage: parseFloat(buf.readFloatLE(35).toFixed(2)),
                },
                brushMotor: {
                    power: parseFloat(buf.readFloatLE(39).toFixed(2)),
                    current: parseFloat(buf.readFloatLE(43).toFixed(2)),
                    voltage: parseFloat(buf.readFloatLE(47).toFixed(2)),
                },
            }
            //console.table(botStatus.id[botId].logs.power);
            //update botStatus logs to rtdb
            botStatusLog == true ? botStatusAsLogUpdateToRtdb(botId, botStatus.id[botId].logs.power) : null;
            break;
        case 4:
            botStatus.id[botId].logs.reedSensor = {
                left: packet[0] == 1 ? true : false,
                right: packet[1] == 1 ? true : false,
            }
            //console.table(botStatus.id[botId].logs.reedSensor);
            //update botStatus logs to rtdb
            botStatusLog == true ? botStatusAsLogUpdateToRtdb(botId, botStatus.id[botId].logs.reedSensor) : null;
            break;
        case 5:
            botStatus.id[botId].logs.gapSensor = {
                rl: packet[0] == 1 ? true : false,
                fl: packet[1] == 1 ? true : false,
                fr: packet[2] == 1 ? true : false,
                rr: packet[3] == 1 ? true : false,
            }
            //console.table(botStatus.id[botId].logs.gapSensor);
            //update botStatus logs to rtdb
            botStatusLog == true ? botStatusAsLogUpdateToRtdb(botId, botStatus.id[botId].logs.gapSensor) : null;
            break;
        case 6:
            botStatus.id[botId].logs.safetySensor = {
                rl: packet[0] == 1 ? true : false,
                fl: packet[1] == 1 ? true : false,
                fr: packet[2] == 1 ? true : false,
                rr: packet[3] == 1 ? true : false,
            }
            //console.table(botStatus.id[botId].logs.safetySensor);
            //update botStatus logs to rtdb
            botStatusLog == true ? botStatusAsLogUpdateToRtdb(botId, botStatus.id[botId].logs.safetySensor) : null;
            break;
        case 7:
            botStatus.id[botId].logs.environment = {
                temperature: parseFloat(buf.readFloatLE(3).toFixed(2)),
                humidity: parseFloat(buf.readFloatLE(7).toFixed(2)),
                heatIndex: parseFloat(buf.readFloatLE(11).toFixed(2)),
                rain: parseFloat(buf.readFloatLE(15).toFixed(2)),
            }
            //console.table(botStatus.id[botId].logs.environment);
            //update botStatus logs to rtdb
            botStatusLog == true ? botStatusAsLogUpdateToRtdb(botId, botStatus.id[botId].logs.environment) : null;
            break;
        case 8:
            botStatus.edgeButton.startStop = packet[0];
            packet[0] != 2 ? updateCloudWithEdgeButtonState(botStatus.edgeButton.startStop): null;
        default:
            t_validData = false;
            console.log('Not found any valid data', data);
    }

    //botStatus update to firebase rtdb
    t_validData == true && botStatusLive == true ? botStatusLiveUpdateToRtdb(botId) : null;

    //port.flush();

});

//function for update cloud with edge button state
function updateCloudWithEdgeButtonState(s) {
    startStop = s;
    if (startStop != t_startStop && (startStop == 0 || startStop == 1)) {
        console.log('Edge Start Buton: ',startStop);
        //update to cloud
        try {
            //update edgeAlive 
            ownerSiteUpdateRef.update({ 'fleetStartEdge': startStop == 1 ? true : false, 'panicButtonEdge': startStop == 0 ? true : false }).catch((error) => {
                console.log('Error:', error);
            });
        } catch (error) {
            console.log('Fleet Start Stop Button status update fail', error);
        }
        t_startStop = startStop;
    }
}


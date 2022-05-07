//Test code for raspberry pi to work as edge device

//All important modules
const { DocumentSnapshot } = require('@google-cloud/firestore');
const firestoreConfig = require('./firestoreConfig'); //include configFirestore file as module
const schedule = require('node-schedule');
//other packages
const internetAvailable = require("internet-available");
const botStatus = require('./botstatus');
const botStatusSample = require('./statusSample');
const { SerialPort, ByteLengthParser } = require("serialport");

const port = new SerialPort({ path: "COM23", baudRate: 115200 }, (error) => { console.log(error); }); //dev/ttyACM0
const parser = port.pipe(new ByteLengthParser({ length: 72 }));

let date_ob = new Date();

//constant value
const siteId = '2597433037720744';
const today = ("0" + date_ob.getDate()).slice(-2) + '-' + ("0" + (date_ob.getMonth() + 1)).slice(-2) + '-' + date_ob.getFullYear();


//Firestore edgeInfo reference
const checkSiteIdRef = firestoreConfig.db.collection('edge_info').doc(siteId);

//global variables
let ownerId;
let ownerSiteUpdateRef;
let ownerSiteBotsCommandRef;
let botStatusRtdb;

//other variables
let fleetStartStop;
let panicButton;
let fastCleaning;
let scheduleTime;
let scheduleRoutine;
let scheduleDay;
let botStatusLive;
let botStatusLog;
let updateCloud;
let sessionId;
let hour;
let minute;
let totalBots = 0;
let botCharging = 0;
let botRunning = 0;
let rfAlive = 0;

//temp variable
let t_fleetStartStop;
let t_panicButton;
let t_fastCleaning;
let t_scheduleTime;
let t_scheduleRoutine;
let t_scheduleDay;
let t_sessionId;
let t_totalBots;
let t_botCharging;
let t_botRunning;
let t_rfAlive;

//Call InternetCheck First Function *Important
    internetCheckFirst();

//Check Internet Availability
function internetCheckFirst(){
    internetAvailable({
        timeout: 6000,
        retries: 10,
    }).then(() => {
        console.log("Internet available");
        //call cloud function
        startCloudFunction();
    }).catch(() => {
        console.log("No internet");
        internetCheckSecond();
    });    
}

function internetCheckSecond(){
    internetAvailable({
        timeout: 6000,
        retries: 560,
    }).then(() => {
        console.log("Internet available!");
        internetCheckFirst();
    }).catch(() => {
        console.log("No internet!");
        internetCheckFirst();
    });    
}

//function to start cloud communication
function startCloudFunction() {
    //Read info from checkSiteId ref
    try {
        checkSiteIdRef.get().then((DocumentSnapshot) => {
            ownerId = DocumentSnapshot.get('ownerUid');
            //update status if ownerId found
            if (ownerId != null) {
                console.log('ownerId: ', ownerId);
                //set owner site update path
                ownerSiteUpdateRef = firestoreConfig.db.collection('owners').doc(ownerId).collection('sites').doc(siteId);
                //set owner site command path
                ownerSiteBotsCommandRef = ownerSiteUpdateRef;
                //set rtdb reference
                rtdbref = firestoreConfig.rtdb.ref('EdgeData/' + ownerId + '/' + siteId);
                botStatusRtdb = rtdbref;
                //call validateOwnerSiteRef
                communicateToOwnerSiteRef();
            }
        }).catch((error) => {
            console.log('Encountered error: ', error);
        })
    } catch (error) {
        console.log('Encountered error ownerUid: ', error);
    }
}

//function for communicate to cloud
function communicateToOwnerSiteRef() {
    //call edgeStatusUpdate
    edgeStatusUpdate();
    //call checkCloudCommand
    checkCloudCommand();
    //function call to update all bots status
    updateAllBotsStatus();
    //botStatus update to firebase rtdb
    botStatusLiveUpdateToRtdb(0);
    //update botStatus logs to rtdb 
    botStatusAsLogUpdateToRtdb(0);
}

//function for edgeStatusUpdate
async function edgeStatusUpdate() {
    //update edge status
    var dateTime = new Date();
    try {
        //update edgeAlive 
        ownerSiteUpdateRef.update({ 'rspAlive': true }).catch((error) => {
            console.log('Error:', error);
        });
        //update edgeStartTime
        ownerSiteUpdateRef.update({ 'rspStartTime': dateTime }).catch((error) => {
            console.log('Error:', error);
        });
        //cc uarts error
        port.isOpen == true ? reportCcAvailable() : reportCcUnavailable();

    } catch (error) {
        console.log('edge status update fail', error);
    }
}

//function for checkCloudCommand
async function checkCloudCommand() {
    //take snapshot from cloud
    try {
        ownerSiteBotsCommandRef.onSnapshot((DocumentSnapshot) => {
            //check sessionId
            sessionId = DocumentSnapshot.get('sessionId');
            //fleetStartStop
            fleetStartStop = DocumentSnapshot.get('fleetStartStop');
            //panicButton
            panicButton = DocumentSnapshot.get('panicButton');
            //cleaningMode
            fastCleaning = DocumentSnapshot.get('fastCleaning');
            //scheduleTime
            scheduleTime = DocumentSnapshot.get('scheduleTime');
            //scheduleRoutine
            scheduleRoutine = DocumentSnapshot.get('scheduleRoutine');
            //scheduleDay
            scheduleDay = DocumentSnapshot.get('scheduleDay');
            //botStatusLive
            botStatusLive = DocumentSnapshot.get('botStatusLive');
            //botStatusLog
            botStatusLog = DocumentSnapshot.get('botStatusLog');
            //updateCloud
            updateCloud = DocumentSnapshot.get('updateCloud');
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
    if (fleetStartStop != t_fleetStartStop) {
        fleetStartStop == true ? fleetStartStopFunction() : null;
        t_fleetStartStop = fleetStartStop;
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
    //if scheduleTime new set
    if (scheduleTime != t_scheduleTime) {
        scheduleTimeFunction();
        t_scheduleTime = scheduleTime;
    }
    //if scheduleRoutine new set
    if (scheduleRoutine != t_scheduleRoutine) {
        scheduleTimeFunction();
        t_scheduleRoutine = scheduleRoutine;
    }
    //if scheduleDay new set
    if (scheduleDay != t_scheduleDay) {
        scheduleTimeFunction();
        t_scheduleDay = scheduleDay;
    }
}

//function for update sessionId
function updateSessionId() {
    try {
        ownerSiteUpdateRef.update({ 'sessionIdR': sessionId + 10 }).catch((error) => {
            console.log('Error ccConnected: ', error);
        });
        console.log("sessionId: ", sessionId, ' :: ', sessionId + 10);
    } catch (error) {
        console.log(error);
    }
}

//function for fleetStartStop 
function fleetStartStopFunction() {
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
    sheduleStart();
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
function sheduleStart() {
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

//shedule start
function scheduleStartNow() {
    port.isOpen == true ? port.write(Buffer.from([27]), (error) => { console.log(error) }) : null;
    console.log('Its time to start bot', hour, ':', minute);
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
async function botStatusAsLogUpdateToRtdb(botId) {
    //console.table(botStatus.id[botId]);
    // update logs to cloud
    try {
        botStatusRtdb.child('logs').child(today).child(botId.toString()).push(botStatus.id[botId]).catch((error) => {
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
        if (curValue.acknowledgement.botStartStop == true) {
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
        if (curValue.rfStatus.connected == true) {
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

    let packetSize, packetType, botId, packet;
    let frameByte = Uint8Array.from(data);

    packetSize = frameByte[0];
    botId = frameByte[1] > 0 ? frameByte[1] - 1 : 0;
    packetType = frameByte[2];
    packet = frameByte.subarray(3);
    buf = Buffer.from(data);

    botStatus.id[botId] = botStatusSample;
    console.log('botId: ', botId);

    //current time
    let date_Ob = new Date();
    let cTime = date_Ob.getHours() + ':' + date_Ob.getMinutes() + ':' + date_Ob.getSeconds();
    //insert boit id and current time
    botStatus.id[botId].info = {
        time: cTime,
        botid: botId,
    }

    switch (packetType) {
        case 1:
            botStatus.id[botId].acknowledgement = {
                botStartStop: packet[0],
            }
            console.table(botStatus.id[botId].acknowledgement);
            //function call to update all bots status
            updateCloud == true ? updateAllBotsStatus() : null;
            break;
        case 2:
            botStatus.id[botId].status = {
                batteryCharging: packet[0],
                batteryStatus: buf.readFloatLE(4),
                cleaningMode: buf.readFloatLE(8),
            }
            console.table(botStatus.id[botId].status);
            //function call to update all bots status
            updateCloud == true ? updateAllBotsStatus() : null;
            break;
        case 3:
            botStatus.id[botId].logs.kinematics = {
                distanceCycle: buf.readFloatLE(3),
                velocity: buf.readFloatLE(7),
                phi: buf.readFloatLE(11),
                dphi: buf.readFloatLE(15)
            }
            console.table(botStatus.id[botId].logs.kinematics);
            break;
        case 4:
            botStatus.id[botId].logs.power = {
                mainBatery: {
                    power: buf.readFloatLE(3),
                    current: buf.readFloatLE(7),
                    voltage: buf.readFloatLE(11),
                },
                driveMotorLeft: {
                    power: buf.readFloatLE(15),
                    current: buf.readFloatLE(19),
                    voltage: buf.readFloatLE(23),
                },
                driveMotorRight: {
                    power: buf.readFloatLE(27),
                    current: buf.readFloatLE(31),
                    voltage: buf.readFloatLE(35),
                },
                brushMotor: {
                    power: buf.readFloatLE(39),
                    current: buf.readFloatLE(43),
                    voltage: buf.readFloatLE(47),
                },
            }
            console.table(botStatus.id[botId].logs.power);
            break;
        case 5:
            botStatus.id[botId].logs.reedSensor = {
                left: packet[0],
                right: packet[1],
            }
            console.table(botStatus.id[botId].logs.reedSensor);
            break;
        case 6:
            botStatus.id[botId].logs.gapSensor = {
                rl: packet[0],
                fl: packet[1],
                fr: packet[2],
                rr: packet[3],
            }
            console.table(botStatus.id[botId].logs.gapSensor);
            break;
        case 7:
            botStatus.id[botId].logs.safetySensor = {
                rl: packet[0],
                fl: packet[1],
                fr: packet[2],
                rr: packet[3],
            }
            console.table(botStatus.id[botId].logs.safetySensor);
            break;
        case 8:
            botStatus.id[botId].logs.environment = {
                temperature: buf.readFloatLE(3),
                humidity: buf.readFloatLE(7),
                heatIndex: buf.readFloatLE(11),
                rain: buf.readFloatLE(15),
            }
            console.table(botStatus.id[botId].logs.environment);
            break;
        case 9:
            botStatus.id[botId].rfStatus = {
                connected: packet[0]
            }
            console.table(botStatus.id[botId].rfStatus);
            //function call to update all bots status
            updateCloud == true ? updateAllBotsStatus() : null;
            break;
        default:
            console.log('Not found any valid data', data);
    }
    //update botStatus logs to rtdb 
    botStatusLog == true ? botStatusAsLogUpdateToRtdb(botId) : null;
    //botStatus update to firebase rtdb
    botStatusLive == true ? botStatusLiveUpdateToRtdb(botId) : null;

    //port.flush();

});


//Test code for raspberry pi to work as edge device

//All important modules
const { DocumentSnapshot } = require('@google-cloud/firestore');
const firestoreConfig = require('./firestoreConfig'); //include configFirestore file as module
const schedule = require('node-schedule');
//other packages
const botStatus = require('./botstatus');
const { SerialPort, ByteLengthParser } = require("serialport");

const port = new SerialPort({ path: "COM23", baudRate: 115200}, (error) => {console.log(error);}); //dev/ttyACM0
const parser = port.pipe(new ByteLengthParser({ length: 72 }));

//constant value
const siteId = '2597433037720744';

//Firestore edgeInfo reference
const checkSiteIdRef = firestoreConfig.db.collection('edge_info').doc(siteId);

//global variables
let ownerId;
let ownerSiteUpdateRef;
let ownerSiteBotsCommandRef;

//other variables
let fleetStartStop;
let panicButton;
let fastCleaning;
let scheduleTime;
let scheduleRoutine;
let scheduleDay;
let hour;
let minute;

//temp variable
let t_fleetStartStop;
let t_panicButton;
let t_fastCleaning;
let t_scheduleTime;
let t_scheduleRoutine;
let t_scheduleDay;

//Read info from checkSiteId ref
try{
    checkSiteIdRef.onSnapshot((DocumentSnapshot) =>{
        //read and store ownerId 
        ownerId = DocumentSnapshot.get('ownerUid');
        //update status if ownerId found
        if(ownerId != null ){
            console.log('ownerId: ',ownerId);
            //set owner site update path
            ownerSiteUpdateRef = firestoreConfig.db.collection('owners').doc(ownerId).collection('sites').doc(siteId);
            //set owner site command path
            ownerSiteBotsCommandRef = ownerSiteUpdateRef;
            //call validateOwnerSiteRef
            communicateToOwnerSiteRef();
        }
    }, error =>{
        console.log('Encountered error: ',error);
    });
} catch (error){
    console.log('Encountered error ownerUid: ',error);
}

//function for communicate to cloud
function communicateToOwnerSiteRef(){
    //call edgeStatusUpdate
    edgeStatusUpdate();
    //call checkCloudCommand
    checkCloudCommand();
}

//function for edgeStatusUpdate
function edgeStatusUpdate(){
    //update edge status
    var dateTime = new Date();
    try{
        //update edgeAlive 
        ownerSiteUpdateRef.update({'rspAlive': true}).catch((error)=>{
            console.log('Error:',error);
        });
        //update edgeStartTime
        ownerSiteUpdateRef.update({'rspStartTime': dateTime}).catch((error)=>{
            console.log('Error:',error);
        });
        //cc uarts error
        port.isOpen == true ? reportCcAvailable() : reportCcUnavailable();

    } catch (error){
        console.log('edge status update fail',error);
    }
}

//function for checkCloudCommand
function checkCloudCommand(){
    //take snapshot from cloud
    try{
        ownerSiteBotsCommandRef.onSnapshot((DocumentSnapshot) =>{
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
            //call takeAction function
            takeAction();
        }, error =>{
            console.log('Encountered error: ',error);
        });
    } catch (error){
        console.log('check cloud command fail',error);
    }
}

//function for take action
function takeAction(){
    //if fleetStartStop true 
    if(fleetStartStop != t_fleetStartStop){
        fleetStartStop==true  ? fleetStartStopFunction() : null;
        t_fleetStartStop = fleetStartStop;
    }
    //if panicButton true 
    if(panicButton != t_panicButton){
        panicButton==true ? panicButtonFunction() : null;
        t_panicButton = panicButton;
    }
    //if cleaningMode set
    if(fastCleaning != t_fastCleaning){
        cleaningModeFunction();
        t_fastCleaning = fastCleaning;
    }
    //if scheduleTime new set
    if(scheduleTime != t_scheduleTime){
        scheduleTimeFunction();
        t_scheduleTime = scheduleTime;
    }
    //if scheduleTime new set
    if(scheduleRoutine != t_scheduleRoutine){
        scheduleTimeFunction();
        t_scheduleRoutine = scheduleRoutine;
    }
    //if scheduleTime new set
    if(scheduleDay != t_scheduleDay){
        scheduleTimeFunction();
        t_scheduleDay = scheduleDay;
    }
}

//function for fleetStartStop 
function fleetStartStopFunction(){
    //if fleetStartStop true 
    port.isOpen == true ? port.write(Buffer.from([27]), (error) => {console.log(error)}) : null;
    console.log('Fleet Start now');
}

//function for panicButton
function panicButtonFunction(){
    //if panicButton true 
    port.isOpen == true ? port.write(Buffer.from([35]), (error) => {console.log(error)}) : null;
    console.log('Panic Button press now');
}  

//function for cleaningMode
function cleaningModeFunction(){
    //if cleaningMode set
    let cleaningMode = fastCleaning ? 53 : 59;
    port.isOpen == true ? port.write(Buffer.from([cleaningMode]), (error) => {console.log(error)}) : null;
    console.log('Cleaning Mode: ',fastCleaning);
}

//function for scheduleTime
function scheduleTimeFunction(){
    //if scheduleTime new set
    console.log('New Schedule Time: ',scheduleTime);
    sheduleStart();
}

//function for reporting cc Available
function reportCcAvailable(){
    try {
        ownerSiteUpdateRef.update({'ccConnected': true}).catch((error)=>{
            console.log('Error ccConnected: ',error);
        });
        console.log("ccAvailable");
    } catch (error) {
        console.log(error);
    }
}

//function for reporting cc Available
function reportCcUnavailable(){
    try {
        ownerSiteUpdateRef.update({'ccConnected': false}).catch((error)=>{
            console.log('Error ccConnected: ',error);
        });
        console.log("cc Unavailable");
    } catch (error) {
        console.log(error);
    }
}


//function for sheduleStart
function sheduleStart(){
    //scheduleTime
    st1 = scheduleTime.split('(')
    st2 = st1[1].split(')');
    st3 = st2[0].split(':');
    hour = parseInt(st3[0]);
    minute = parseInt(st3[1]);
    console.log('hour: ',hour,' minute: ',minute);
    //scheduleRoutine
    sr1 = parseInt(scheduleRoutine.split(':')[0]);
    sr2 =  parseInt(scheduleRoutine.split(':')[1]);
    //scheduleDay
    sd1 = scheduleDay;
    //schedule job
    const rule = new schedule.RecurrenceRule();
    rule.dayOfWeek = (sr1 == 1 || sr1 == 2) ? [new schedule.Range(0,6,sr2)]: sd1;
    rule.hour = hour;
    rule.minute = minute;
    // rule.tz = 'Asia/Calcutta';
    const job = schedule.scheduleJob(rule, scheduleStartNow);
    //print
    if(sr1==1){
        console.log('Your bot will run everyday!');
    }
    if(sr1==2){
        console.log('Your bot will run after ',sr2, 'day.')
    }
    if(sr1==3){
        console.log('your bot will run on selected day.',sd1);
    }

}

//shedule start
function scheduleStartNow(){
    port.isOpen == true ? port.write(Buffer.from([27]), (error) => {console.log(error)}) : null;
    console.log('Its time to start bot',hour,':',minute);
}

//store data on arrive
parser.on('data', data => {
    let packetSize, packetType, botId, packet, size, endData;
    let frameByte = Uint8Array.from(data);

    packetSize = frameByte[0];
    botId = frameByte[1] - 1;
    packetType = frameByte[2];
    packet = frameByte.subarray(3);
    buf = Buffer.from(data);

    switch (packetType) {
        case 1:
            botStatus.id[botId].acknowledgement = {
                botStartStop: packet[0],
            }
            break;
        case 2:
            botStatus.id[botId].status = {
                rfStatus: packet[0],
                batteryChargingStatus: packet[1],
                batteryStatus: buf.readFloatLE(5),
                cleaningMode: buf.readFloatLE(9),
            }
            break;
        case 3:
            botStatus.id[botId].logs.kinematics = {
                distanceCycle: buf.readFloatLE(3),
                velocity: buf.readFloatLE(7),
                phi: buf.readFloatLE(11),
                dphi: buf.readFloatLE(15)
            }
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
            break;
        case 5:
            botStatus.id[botId].logs.reedSensor = {
                left: packet[0],
                right: packet[1],
            }
            break;
        case 6:
            botStatus.id[botId].logs.gapSensor = {
                rl: packet[0],
                fl: packet[1],
                fr: packet[2],
                rr: packet[3],
            }
            break;
        case 7:
            botStatus.id[botId].logs.safetySensor = {
                rl: packet[0],
                fl: packet[1],
                fr: packet[2],
                rr: packet[3],
            }
            break;
        case 8:
            botStatus.id[botId].logs.environment = {
                temperature: buf.readFloatLE(3),
                humidity: buf.readFloatLE(7),
                heatIndex: buf.readFloatLE(11),
                rain: buf.readFloatLE(15),
            }
            break;
        default:
            console.log('Not found any valid data', data);
    }

    //port.flush();
    console.log(botStatus.id[0].acknowledgement);
    console.log(botStatus.id[0].status);
    console.log(botStatus.id[0].logs.kinematics);

})

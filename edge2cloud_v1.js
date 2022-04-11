//Test code for raspberry pi to work as edge device

//All important modules
const { DocumentSnapshot } = require('@google-cloud/firestore');
const firestoreConfig = require('./firestoreConfig'); //include configFirestore file as module
const schedule = require('node-schedule');

//constant value
const siteId = '2597433037720744';

//Firestore edgeInfo reference
const checkSiteIdRef = firestoreConfig.db.collection('edge_info').doc(siteId);

//global variables
var ownerId;
var ownerSiteUpdateRef;
var ownerSiteBotsCommandRef;

//other variables
var fleetStartStop;
var panicButton;
var cleaningMode;
var scheduleTime;
var scheduleRoutine;
var scheduleDay;
var hour;
var minute;

//temp variable
var t_fleetStartStop;
var t_panicButton;
var t_cleaningMode;
var t_scheduleTime;
var t_scheduleRoutine;
var t_scheduleDay;

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
            validateOwnerSiteRef();
        }
    }, error =>{
        console.log('Encountered error: ',error);
    });
} catch{
    console.log('Encountered error ownerUid: ',error);
}

//function for edgeStusUpdate
function validateOwnerSiteRef(){
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
    } catch{
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
            cleaningMode = DocumentSnapshot.get('cleaningMode');
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
    } catch {
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
    if(cleaningMode != t_cleaningMode){
        cleaningModeFunction();
        t_cleaningMode = cleaningMode;
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
    console.log('Fleet Start now');
}

//function for panicButton
function panicButtonFunction(){
    //if panicButton true 
    console.log('Panic Button press now');
}  

//function for cleaningMode
function cleaningModeFunction(){
    //if cleaningMode set
    console.log('Cleaning Mode: ',cleaningMode);
}

//function for scheduleTime
function scheduleTimeFunction(){
    //if scheduleTime new set
    console.log('New Schedule Time: ',scheduleTime);
    sheduleStart();
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
    console.log('Its time to start bot',hour,':',minute);
}












/**
 * //Date and Time
    let date_Ob = new Date();
    let cTime = date_Ob.getFullYear()+':'+("0"+date_Ob.getMonth()+1).slice(-2)+':'+("0"+date_Ob.getDate()).slice(-2)+':'+date_Ob.getHours()+':'+date_Ob.getMinutes()+':'+date_Ob.getSeconds();
    ct1 = cTime.split(':');
    c_hour = parseInt(ct1[3]);
    c_minute = parseInt(ct1[4]);
    console.log('hour: ',c_hour,'minute: ',c_minute);

    //remaining time calculation
    if(h)
    
    hour_remain = c_hour - hour;
    minute_remain = c_minute - minute;
    if(minute_remain<0 && hour_remain == 0){
        minute_remain = Math.abs(minute_remain);
        timeElapse = minute_remain*60;
    }
    console.log('time remain: ',hour_remain,':',minute_remain);
   myTimeout = setTimeout(scheduleStartNow, timeElapse*1000);
 */
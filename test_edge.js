//Test code for raspberry pi to work as edge device

//All important modules
const { DocumentSnapshot } = require('@google-cloud/firestore');
var firestoreConfig = require('./firestoreConfig'); //include configFirestore file as module
//Hardware control packages
const internetAvailable = require("internet-available");
const Gpio = require('onoff').Gpio; // module for gpio control
const Wifi = require('rpi-wifi-connection'); //module for wifi

const wifi = new Wifi(); //wifi initialization

//Raspberrypi GPIO
var powerPin_CC = new Gpio(17, 'out'); //power detector
var wifiPin_CC = new Gpio(27, 'out'); //wifi detector
var internetPin_CC = new Gpio(22, 'out'); //internet detector
var powerPin1_ESP = new Gpio(5, 'out'); //power detector
var wifiPin_ESP = new Gpio(6, 'out'); //wifi detector
var internetPin_ESP = new Gpio(26, 'out'); //internet detector
var restartButton = new Gpio(17, 'in', 'both'); //use GPIO pin 17 as input, and 'both' button presses, and releases should be handled

restartButton.watch(function (err, value) { //Watch for hardware interrupts on pushButton GPIO, specify callback function
    if (err) { //if an error
        console.error('There was an error', err); //output error message to console
        return;
    }
    value == 1 ? rspRstfunction() : console.log('Restart Button is not pressed'); //turn LED on or off depending on the button state (0 or 1)
});

//initial State of GPIO
wifiPin_CC.writeSync(1);
wifiPin_ESP.writeSync(1);
internetPin_CC.writeSync(1);
internetPin_ESP.writeSync(1);

//Set GPIO PIN 0 when raspberrypi is started
powerPin_CC.writeSync(0); //set gpio 0 to 0
powerPin1_ESP.writeSync(0); //set gpio 0 to 0
console.log('Raspberry now Started!');

//Set GPIO PIN 2 when raspberrypi is connected to wifi
wifi.getState().then((connected) => {
    if (connected) {
        wifiPin_CC.writeSync(0); //clear pin
        wifiPin_ESP.writeSync(0);
        console.log('Conected to Wifi!');
    }
    else {
        wifiPin_CC.writeSync(1); //set pin
        wifiPin_ESP.writeSync(1);
        console.log('Not connected to Wifi');
    }
});

//constant value
const siteId = '2597433037720744';

//Firestore edgeInfo reference
const checkSiteIdRef = firestoreConfig.db.collection('edge_info').doc(siteId);

//global variables
let ownerId;
let ownerSiteUpdateRef;
let ownerSiteEdgeCommandRef;

//other variables
let rspShutDown;
let rspRst;
let updateStatus;

//temp variable
let t_rspShutDown;
let t_rspRst;
let t_updateStatus;

//function for Internet Available
function netAvailable() {
    //set internet Gpio
    internetPin_CC.writeSync(0);
    internetPin_ESP.writeSync(0);
    console.log('Raspberrypi is connected to the Internet!');
}

//function for Internet Unavailable
function netUnavailable() {
    //set internet Gpio
    internetPin_CC.writeSync(1);
    internetPin_ESP.writeSync(1);
    console.log('Raspberrypi is not connected to the Internet!');
}

//cal netCheck1
netCheck1();
//Check Internet Availability
function netCheck1(){
    internetAvailable({
        timeout: 6000,
        retries: 10,
    }).then(() => {
        console.log("Internet available");
        //call cloud communication
        startCloudCommunication();
        //function for set gpio
        netAvailable();
    }).catch(() => {
        console.log("No internet");
        netUnavailable();
        netCheck2();
    });    
}

//Check Internet Availability
function netCheck2(){
    internetAvailable({
        timeout: 6000,
        retries: 1200,
    }).then(() => {
        console.log("Internet available!");
        //function for set gpio
        netAvailable();
        netCheck1();
    }).catch(() => {
        console.log("No internet!");
        netUnavailable();
        rspRstfunction();
    });
}

//function to start cloud communication
function startCloudCommunication() {
    //Read info from checkSiteId ref
    try {
        checkSiteIdRef.get().then((DocumentSnapshot) => {
            //read and store ownerId 
            ownerId = DocumentSnapshot.get('ownerUid');
            //update status if ownerId found
            if (ownerId != null) {
                //console.log('ownerId: ',ownerId);
                //set owner site command path
                ownerSiteEdgeCommandRef = firestoreConfig.db.collection('owners').doc(ownerId).collection('sites').doc(siteId).collection('edgeControl').doc('rsp');
                //set owner site update path
                ownerSiteUpdateRef = ownerSiteEdgeCommandRef;
                //call validateOwnerSiteRef
                validateOwnerSiteRef();
            }
        }, error => {
            console.log('Encountered error: ', error);
        });
    } catch (error) {
        console.log('check ownerId fail', error);
    }
}

//function for edgeStusUpdate
function validateOwnerSiteRef() {
    //call edgeStatusUpdate
    edgeStatusUpdate();
    //call checkCloudCommand
    checkCloudCommand();
}

//function for edgeStatusUpdate
function edgeStatusUpdate() {
    //update edge status
    var dateTime = new Date();
    //update edge status
    try {
        //update edgeAlive 
        ownerSiteUpdateRef.update({ 'rspAlive': true }).catch((error) => {
            console.log('Error:', error);
        });
        //update edgeStartTime
        ownerSiteUpdateRef.update({ 'rspStartTime': dateTime }).catch((error) => {
            console.log('Error:', error);
        });
    } catch (error) {
        console.log('edge status update fail');
    }
}

//function for checkCloudCommand
function checkCloudCommand() {
    //take snapshot from cloud
    try {
        ownerSiteEdgeCommandRef.onSnapshot((DocumentSnapshot) => {
            //rspShutDown
            rspShutDown = DocumentSnapshot.get('rspShutDown');
            //rspRst
            rspRst = DocumentSnapshot.get('rspRst');
            //updateStatus
            updateStatus = DocumentSnapshot.get('updateStatus');
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
    //if rspShutDown true 
    if (rspShutDown != t_rspShutDown) {
        rspShutDown == true ? rspShutDownfunction() : null;
        t_rspShutDown = rspShutDown;
    }
    //if rspRst true 
    if (rspRst != t_rspRst) {
        rspRst == true ? rspRstfunction() : null;
        t_rspRst = rspRst;
    }
    //if updateStatus true
    if (updateStatus != t_updateStatus) {
        updateStatus == true ? updateStatusFunction() : null;
        t_updateStatus = updateStatus;
    }
}

//function for rsp ShutDown
function rspShutDownfunction() {
    //if rspShutDown true 
    console.log('Shutdown Raspberrpi now');
    shell.exec('sudo shutdown now');
}

//function for rsp restart
function rspRstfunction() {
    //if rspShutDown true 
    console.log('Restart Raspberrpi now');
    shell.exec('sudo shutdown -r now');
}

//function for update status
function updateStatusFunction() {
    //call edgeStatusUpdate
    edgeStatusUpdate();
}
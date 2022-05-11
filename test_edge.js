//Test code for raspberry pi to work as edge device

//All important modules
//Hardware control packages
const shell = require('shelljs');
const internetAvailable = require("internet-available");
const Gpio = require('onoff').Gpio; // module for gpio control
const Wifi = require('rpi-wifi-connection'); //module for wifi

const wifi = new Wifi(); //wifi initialization

//Raspberrypi GPIO 5,6,17,22,26,27
var powerPin_CC = new Gpio(17, 'out'); //power detector 
var wifiPin_CC = new Gpio(27, 'out'); //wifi detector
var internetPin_CC = new Gpio(22, 'out'); //internet detector
var restartButton = new Gpio(5, 'in', 'both'); //use GPIO pin 17 as input, and 'both' button presses, and releases should be handled

restartButton.watch(function (err, value) { //Watch for hardware interrupts on pushButton GPIO, specify callback function
    if (err) { //if an error
        console.error('There was an error', err); //output error message to console
        return;
    }
    value == 1 ? rspRstfunction() : console.log('Restart Button is not pressed'); //turn LED on or off depending on the button state (0 or 1)
});

//initial State of GPIO
wifiPin_CC.writeSync(1);
internetPin_CC.writeSync(1);

//Set GPIO PIN 0 when raspberrypi is started
powerPin_CC.writeSync(0); //set gpio 0 to 0
console.log('Raspberry now Started!');

//Set GPIO PIN 2 when raspberrypi is connected to wifi
wifi.getState().then((connected) => {
    if (connected) {
        wifiPin_CC.writeSync(0); //clear pin
        console.log('Conected to Wifi!');
    }
    else {
        wifiPin_CC.writeSync(1); //set pin
        console.log('Not connected to Wifi');
    }
});

//function for Internet Available
function netAvailable() {
    //set internet Gpio
    internetPin_CC.writeSync(0);
    console.log('Raspberrypi is connected to the Internet!');
}

//function for Internet Unavailable
function netUnavailable() {
    //set internet Gpio
    internetPin_CC.writeSync(1);
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
        //function for set gpio
        netAvailable();
        //call realtime Internet Check
        realTimeInternetCheck();
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

//function for real time internet check
function realTimeInternetCheck(){
    setInterval(()=>{
        internetAvailable({
            timeout: 6000,
            retries: 10,
        }).then(() => {
            console.log("Internet available!!");
            netAvailable();
        }).catch(() => {
            console.log("No internet!!");
            netUnavailable();
        });  
    },60000);
}

//function for rsp restart
function rspRstfunction() {
    //if rspShutDown true 
    console.log('Restart Raspberrpi now');
    shell.exec('sudo shutdown -r now');
}
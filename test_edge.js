//Test code for raspberry pi to work as edge device

//All important modules
const { DocumentSnapshot } = require('@google-cloud/firestore');
var firestoreConfig = require('./firestoreConfig'); //include configFirestore file as module

//constant value
const siteId = '2597433037720744';

//Firestore edgeInfo reference
const checkSiteIdRef = firestoreConfig.db.collection('edge_info').doc(siteId);

//global variables
var ownerId;
var ownerSiteUpdateRef;
var ownerSiteEdgeCommandRef;

//other variables
var rspShutDown;
var rspRst;
var updateStatus;

//temp variable
var t_rspShutDown;
var t_rspRst;
var t_updateStatus;

//Read info from checkSiteId ref
try{
    checkSiteIdRef.onSnapshot((DocumentSnapshot) =>{
        //read and store ownerId 
        ownerId = DocumentSnapshot.get('ownerUid');
        //update status if ownerId found
        if(ownerId != null ){
            //console.log('ownerId: ',ownerId);
            //set owner site command path
            ownerSiteEdgeCommandRef = firestoreConfig.db.collection('owners').doc(ownerId).collection('sites').doc(siteId).collection('edgeControl').doc('rsp');
            //set owner site update path
            ownerSiteUpdateRef = ownerSiteEdgeCommandRef;
            //call validateOwnerSiteRef
            validateOwnerSiteRef();
        }
    }, error =>{
        console.log('Encountered error: ',error);
    });
} catch{
    console.log('check ownerId fail',error);
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
    //update edge status
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
        console.log('edge status update fail');
    }
}

//function for checkCloudCommand
function checkCloudCommand(){
    //take snapshot from cloud
    try{
        ownerSiteEdgeCommandRef.onSnapshot((DocumentSnapshot) =>{
            //rspShutDown
            rspShutDown = DocumentSnapshot.get('rspShutDown');
            //rspRst
            rspRst = DocumentSnapshot.get('rspRst');
            //updateStatus
            updateStatus = DocumentSnapshot.get('updateStatus');
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
    //if rspShutDown true 
    if(rspShutDown != t_rspShutDown){
        rspShutDown==true  ? rspShutDownfunction() : null;
        t_rspShutDown = rspShutDown;
    }
    //if rspRst true 
    if(rspRst != t_rspRst){
        rspRst==true ? rspRstfunction() : null;
        t_rspRst = rspRst;
    }
    //if updateStatus true
    if(updateStatus != t_updateStatus){
        updateStatus == true ? updateStatusFunction() : null;
        t_updateStatus = updateStatus;
    }
}

//function for rsp ShutDown
function rspShutDownfunction(){
    //if rspShutDown true 
    console.log('Shutdown Raspberrpi now');
}

//function for rsp restart
function rspRstfunction(){
    //if rspShutDown true 
    console.log('Restart Raspberrpi now');
}    

//function for update status
function updateStatusFunction(){
    //call edgeStatusUpdate
    edgeStatusUpdate();
}
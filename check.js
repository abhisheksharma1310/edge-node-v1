const botStatus = require('./botstatus');
const botStatusSample = require('./statusSample');
const { SerialPort, ByteLengthParser } = require("serialport");

const port = new SerialPort({ path: "/dev/ttyACM0", baudRate: 115200 }, (error) => {
    console.log(error);
}) ///dev/ttyACM0
const parser = port.pipe(new ByteLengthParser({ length: 72 }));

//store data on arrive
// parser.on('data', data => {
//     let time = new Date;
//     let packetSize, packetType, botId, packet, size, endData;
//     let frameByte = Uint8Array.from(data);

//     packetSize = frameByte[0];
//     botId = frameByte[1] > 0 ? frameByte[1] - 1 : 0;
//     packetType = frameByte[2];
//     packet = frameByte.subarray(3);
//     buf = Buffer.from(data);

//     botStatus.id[botId] = botStatusSample;

//     botStatus.id[botId].info = {
//         time: time,
//         botid: botId,
//     }

//     switch (packetType) {
//         case 1:
//             botStatus.id[botId].acknowledgement = {
//                 botStartStop: packet[0],
//             }
//             console.table(botStatus.id[botId].acknowledgement);
//             break;
//         case 2:
//             botStatus.id[botId].status = {
//                 batteryChargingStatus: packet[0],
//                 batteryStatus: buf.readFloatLE(4),
//                 cleaningMode: buf.readFloatLE(8),
//             }
//             console.table(botStatus.id[botId].status);
//             break;
//         case 3:
//             botStatus.id[botId].logs.kinematics = {
//                 distanceCycle: buf.readFloatLE(3),
//                 velocity: buf.readFloatLE(7),
//                 phi: buf.readFloatLE(11),
//                 dphi: buf.readFloatLE(15)
//             }
//             console.table(botStatus.id[botId].logs.kinematics);
//             break;
//         case 4:
//             botStatus.id[botId].logs.power = {
//                 mainBatery: {
//                     power: buf.readFloatLE(3),
//                     current: buf.readFloatLE(7),
//                     voltage: buf.readFloatLE(11),
//                 },
//                 driveMotorLeft: {
//                     power: buf.readFloatLE(15),
//                     current: buf.readFloatLE(19),
//                     voltage: buf.readFloatLE(23),
//                 },
//                 driveMotorRight: {
//                     power: buf.readFloatLE(27),
//                     current: buf.readFloatLE(31),
//                     voltage: buf.readFloatLE(35),
//                 },
//                 brushMotor: {
//                     power: buf.readFloatLE(39),
//                     current: buf.readFloatLE(43),
//                     voltage: buf.readFloatLE(47),
//                 },
//             }
//             console.table(botStatus.id[botId].logs.power);
//             break;
//         case 5:
//             botStatus.id[botId].logs.reedSensor = {
//                 left: packet[0],
//                 right: packet[1],
//             }
//             console.table(botStatus.id[botId].logs.reedSensor);
//             break;
//         case 6:
//             botStatus.id[botId].logs.gapSensor = {
//                 rl: packet[0],
//                 fl: packet[1],
//                 fr: packet[2],
//                 rr: packet[3],
//             }
//             console.table(botStatus.id[botId].logs.gapSensor);
//             break;
//         case 7:
//             botStatus.id[botId].logs.safetySensor = {
//                 rl: packet[0],
//                 fl: packet[1],
//                 fr: packet[2],
//                 rr: packet[3],
//             }
//             console.table(botStatus.id[botId].logs.safetySensor);
//             break;
//         case 8:
//             botStatus.id[botId].logs.environment = {
//                 temperature: buf.readFloatLE(3),
//                 humidity: buf.readFloatLE(7),
//                 heatIndex: buf.readFloatLE(11),
//                 rain: buf.readFloatLE(15),
//             }
//             console.table(botStatus.id[botId].logs.environment);
//             break;
//         case 9:
//             botStatus.id[botId].rfStatus = {
//                 connected: packet[0]
//             }
//             console.table(botStatus.id[botId].rfStatus);
//             break;
//         default:
//             console.log('Not found any valid data', data);
//     }

//     //port.flush();

// })

parser.on('data', data => {
	port.pause();
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
            console.table(botStatus.id[botId].status);
            //function call to update all bots status
            // updateCloud == true ? updateAllBotsStatus() : null;
            //update botStatus logs to rtdb
            // botStatusLog == true ? botStatusAsLogUpdateToRtdb(botId, botStatus.id[botId].status) : null;
            break;
        case 2:
            botStatus.id[botId].logs.kinematics = {
                distanceCycle: parseFloat(buf.readFloatLE(3).toFixed(2)),
                velocity: parseFloat(buf.readFloatLE(7).toFixed(2)),
                phi: parseFloat(buf.readFloatLE(11).toFixed(2)),
                dphi: parseFloat(buf.readFloatLE(15).toFixed(2)),
            }
            console.table(botStatus.id[botId].logs.kinematics);
            //update botStatus logs to rtdb
            // botStatusLog == true ? botStatusAsLogUpdateToRtdb(botId, botStatus.id[botId].logs.kinematics) : null;
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
            console.table(botStatus.id[botId].logs.power);
            //update botStatus logs to rtdb
            // botStatusLog == true ? botStatusAsLogUpdateToRtdb(botId, botStatus.id[botId].logs.power) : null;
            break;
        case 4:
            botStatus.id[botId].logs.reedSensor = {
                left: packet[0] == 1 ? true : false,
                right: packet[1] == 1 ? true : false,
            }
            console.table(botStatus.id[botId].logs.reedSensor);
            //update botStatus logs to rtdb
            // botStatusLog == true ? botStatusAsLogUpdateToRtdb(botId, botStatus.id[botId].logs.reedSensor) : null;
            break;
        case 5:
            botStatus.id[botId].logs.gapSensor = {
                rl: packet[0] == 1 ? true : false,
                fl: packet[1] == 1 ? true : false,
                fr: packet[2] == 1 ? true : false,
                rr: packet[3] == 1 ? true : false,
            }
            console.table(botStatus.id[botId].logs.gapSensor);
            //update botStatus logs to rtdb
            // botStatusLog == true ? botStatusAsLogUpdateToRtdb(botId, botStatus.id[botId].logs.gapSensor) : null;
            break;
        case 6:
            botStatus.id[botId].logs.safetySensor = {
                rl: packet[0] == 1 ? true : false,
                fl: packet[1] == 1 ? true : false,
                fr: packet[2] == 1 ? true : false,
                rr: packet[3] == 1 ? true : false,
            }
            console.table(botStatus.id[botId].logs.safetySensor);
            //update botStatus logs to rtdb
            // botStatusLog == true ? botStatusAsLogUpdateToRtdb(botId, botStatus.id[botId].logs.safetySensor) : null;
            break;
        case 7:
            botStatus.id[botId].logs.environment = {
                temperature: parseFloat(buf.readFloatLE(3).toFixed(2)),
                humidity: parseFloat(buf.readFloatLE(7).toFixed(2)),
                heatIndex: parseFloat(buf.readFloatLE(11).toFixed(2)),
                rain: parseFloat(buf.readFloatLE(15).toFixed(2)),
            }
            console.table(botStatus.id[botId].logs.environment);
            //update botStatus logs to rtdb
            // botStatusLog == true ? botStatusAsLogUpdateToRtdb(botId, botStatus.id[botId].logs.environment) : null;
            break;
        case 8:
            botStatus.edgeButton.startStop = packet[0];
            // packet[0] != 2 ? updateCloudWithEdgeButtonState(botStatus.edgeButton.startStop): null;
        default:
            t_validData = false;
            console.log('Not found any valid data', data);
    }

    //botStatus update to firebase rtdb
    // t_validData == true && botStatusLive == true ? botStatusLiveUpdateToRtdb(botId) : null;
	port.resume()
	port.flush()
});
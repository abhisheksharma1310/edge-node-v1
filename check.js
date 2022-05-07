const botStatus = require('./botstatus');
const botStatusSample = require('./statusSample');
const { SerialPort, ByteLengthParser } = require("serialport");

const port = new SerialPort({ path: "COM23", baudRate: 115200 }, (error) => {
    console.log(error);
}) ///dev/ttyACM0
const parser = port.pipe(new ByteLengthParser({ length: 72 }));

//store data on arrive
parser.on('data', data => {
    let time = new Date;
    let packetSize, packetType, botId, packet, size, endData;
    let frameByte = Uint8Array.from(data);

    packetSize = frameByte[0];
    botId = frameByte[1] > 0 ? frameByte[1] - 1 : 0;
    packetType = frameByte[2];
    packet = frameByte.subarray(3);
    buf = Buffer.from(data);

    botStatus.id[botId] = botStatusSample;

    botStatus.id[botId].info = {
        time: time,
        botid: botId,
    }

    switch (packetType) {
        case 1:
            botStatus.id[botId].acknowledgement = {
                botStartStop: packet[0],
            }
            console.table(botStatus.id[botId].acknowledgement);
            break;
        case 2:
            botStatus.id[botId].status = {
                batteryChargingStatus: packet[0],
                batteryStatus: buf.readFloatLE(4),
                cleaningMode: buf.readFloatLE(8),
            }
            console.table(botStatus.id[botId].status);
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
            break;
        default:
            console.log('Not found any valid data', data);
    }

    //port.flush();

})


const botStatus = require('./botstatus');
const { SerialPort, ByteLengthParser } = require("serialport")
const port = new SerialPort({ path: "/dev/ttyACM0", baudRate: 115200 })
const parser = port.pipe(new ByteLengthParser({ length: 72 }));

//store data on arrive
parser.on('data', data => {
    let packetSize, packetType, botId, packet, size, endData;
    let frameByte = Uint8Array.from(data);

    packetSize = frameByte[0];
    packetType = frameByte[1];
    botId = frameByte[2] - 1;
    packet = frameByte.subarray(3);
    buf = Buffer.from(data);

    switch (packetType) {
        case 1:
            botStatus.acknowledgement.id[botId] = {
                botStartStop: packet[0],
            }
            break;
        case 2:
            botStatus.status.id[botId] = {
                rfStatus: packet[0],
                batteryChargingStatus: packet[1],
                batteryStatus: buf.readFloatLE(5),
            }
            break;
        case 3:
            botStatus.logs.kinematics.id[botId] = {
                distanceCycle: buf.readFloatLE(3),
                velocity: buf.readFloatLE(7),
                phi: buf.readFloatLE(11),
                dphi: buf.readFloatLE(15)
            }
            break;
        case 4:
            botStatus.logs.power.id[botId] = {
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
            botStatus.logs.reedSensor.id[botId] = {
                left: packet[0],
                right: packet[1],
            }
            break;
        case 6:
            botStatus.logs.gapSensor.id[botId] = {
                rl: packet[0],
                fl: packet[1],
                fr: packet[2],
                rr: packet[3],
            }
            break;
        case 7:
            botStatus.logs.safetySensor.id[botId] = {
                rl: packet[0],
                fl: packet[1],
                fr: packet[2],
                rr: packet[3],
            }
            break;
        case 8:
            botStatus.logs.environment.id[botId] = {
                temperature: buf.readFloatLE(3),
                humidity: buf.readFloatLE(7),
                heatIndex: buf.readFloatLE(11),
                rain: buf.readFloatLE(15),
            }
            break;
        default:
            console.log('Not found any valid data', data);
    }

    console.log(botStatus.logs.kinematics.id[0]);

})


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
            botStatus.acknowledgement.id[botId].botStartStop = packet[0];
            break;
        case 2:
            botStatus.status.id[botId].rfStatus = packet[0];
            botStatus.status.id[botId].batteryChargingStatus = packet[1];
            botStatus.status.id[botId].batteryStatus = buf.readFloatLE(5);
            break;
        case 3:
            botStatus.logs.kinematics.id[botId] = {
                distanceCycle: buf.readFloatLE(3),
                velocity: buf.readFloatLE(7),
                phi: buf.readFloatLE(11),
                dphi: buf.readFloatLE(15)
            }

            // botStatus.logs.kinematics.id[botId].distanceCycle = buf.readFloatLE(3);
            // botStatus.logs.kinematics.id[botId].velocity = buf.readFloatLE(7);
            // botStatus.logs.kinematics.id[botId].phi = buf.readFloatLE(11);
            // botStatus.logs.kinematics.id[botId].dphi = buf.readFloatLE(15);
            break;
        case 4:
            botStatus.logs.power.id[botId].mainBatery.power = buf.readFloatLE(3);
            botStatus.logs.power.id[botId].mainBatery.current = buf.readFloatLE(7);
            botStatus.logs.power.id[botId].mainBatery.voltage = buf.readFloatLE(11);

            botStatus.logs.power.id[botId].driveMotorLeft.power = buf.readFloatLE(15);
            botStatus.logs.power.id[botId].driveMotorLeft.current = buf.readFloatLE(19);
            botStatus.logs.power.id[botId].driveMotorLeft.voltage = buf.readFloatLE(23);

            botStatus.logs.power.id[botId].driveMotorRight.power = buf.readFloatLE(27);
            botStatus.logs.power.id[botId].driveMotorRight.current = buf.readFloatLE(31);
            botStatus.logs.power.id[botId].driveMotorRight.voltage = buf.readFloatLE(35);

            botStatus.logs.power.id[botId].brushMotor.power = buf.readFloatLE(39);
            botStatus.logs.power.id[botId].brushMotor.current = buf.readFloatLE(43);
            botStatus.logs.power.id[botId].brushMotor.voltage = buf.readFloatLE(47);
            break;
        case 5:
            botStatus.logs.reedSensor.id[botId].left = packet[0];
            botStatus.logs.reedSensor.id[botId].right = packet[1];
            break;
        case 6:
            botStatus.logs.gapSensor.id[botId].rl = packet[0];
            botStatus.logs.gapSensor.id[botId].fl = packet[1];
            botStatus.logs.gapSensor.id[botId].fr = packet[2];
            botStatus.logs.gapSensor.id[botId].rr = packet[3];
            break;
        case 7:
            botStatus.logs.safetySensor.id[botId].rl = packet[0];
            botStatus.logs.safetySensor.id[botId].fl = packet[1];
            botStatus.logs.safetySensor.id[botId].fr = packet[2];
            botStatus.logs.safetySensor.id[botId].rr = packet[3];
            break;
        case 8:
            botStatus.logs.environment.id[botId].temperature = buf.readFloatLE(3);
            botStatus.logs.environment.id[botId].humidity = buf.readFloatLE(7);
            botStatus.logs.environment.id[botId].heatIndex = buf.readFloatLE(11);
            botStatus.logs.environment.id[botId].rain = buf.readFloatLE(15);
            break;
        default:
            console.log('Not found any valid data', data);
    }

    console.log(botStatus.logs.kinematics.id[0]);

})



// botStatus.acknowledgement.id.push({botStartStop: true});
// a = botStatus.acknowledgement.id[0];
// console.log(a);
// b = botStatus.acknowledgement.id[1];
// console.log(b);


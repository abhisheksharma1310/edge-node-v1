//Object to store botStatus data
let botStatus = {
    id: [
        {
            info: {
                time: new Date,
                botid: 0,
            },
            status: {
                botStartStop: false,
                batteryCharging: false,
                rfStatus: false,
                cleaningMode: 0,
                batteryStatus: 0.00,
            },
            logs: {
                kinematics: {
                    distanceCycle: 0.0,
                    velocity: 0.0,
                    phi: 0.0,
                    dphi: 0.0,
                },
                power: {
                    mainBatery: {
                        power: 0.0,
                        current: 0.0,
                        voltage: 0.0,
                    },
                    driveMotorLeft: {
                        power: 0.0,
                        current: 0.0,
                        voltage: 0.0,
                    },
                    driveMotorRight: {
                        power: 0.0,
                        current: 0.0,
                        voltage: 0.0,
                    },
                    brushMotor: {
                        power: 0.0,
                        current: 0.0,
                        voltage: 0.0,
                    },
                },
                reedSensor: {
                    left: false,
                    right: false,
                },
                gapSensor: {
                    rl: false,
                    fl: false,
                    fr: false,
                    rr: false,
                },
                safetySensor: {
                    rl: false,
                    fl: false,
                    fr: false,
                    rr: false,
                },
                environment: {
                    temperature: 0.0,
                    humidity: 0.0,
                    heatIndex: 0.0,
                    rain: 0.0,
                }
            },
        },
    ],
}

//export botstatus object as module
module.exports = botStatus;

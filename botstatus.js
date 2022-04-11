//Object to store botStatus data
let botStatus = {
    acknowledgement: {
        id: [
            {
                botStartStop: false,
            },
        ],
    },
    status:{
        id:[ 
            {
            rfStatus: false,
            batteryChargingStatus: false,
            batteryStatus: 0.00,
            }   
        ]
    },
    logs:{
        kinematics:{
            id:[
                {
                    distanceCycle: 0.0,
                    velocity: 0.0,
                    phi:0.0,
                    dphi:0.0,
                },
            ]
        },
        power: {
            id:[
                {
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
                }
            ]
        },
        reedSensor: {
            id: [
                {
                    left: false,
                    right: false,
                }
            ]
        },
        gapSensor: {
            id: [
                {
                    rl: false,
                    fl: false,
                    fr: false,
                    rr: false,
                }
            ]
        },
        safetySensor: {
            id: [
                {
                    rl: false,
                    fl: false,
                    fr: false,
                    rr: false,
                }
            ]
        },
        environment: {
            id: [
                {
                    temperature: 0.0,
                    humidity: 0.0,
                    heatIndex: 0.0,
                    rain: 0.0,
                }
            ]
        }  
    }, 
}

module.exports = botStatus;
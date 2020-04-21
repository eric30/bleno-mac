var util = require('util');
var bleno = require('..');
var DeviceConfig = require('./config.json');

var BlenoPrimaryService = bleno.PrimaryService;
var BlenoCharacteristic = bleno.Characteristic;

console.log('Seamless Setup Virtual Device - loading');

const lightOffAscii = `
                     ,:::::,
                   :::::::::::
                 .:::::::::::::.
                :::::::::::::::::
               .:::::::::::::::::.
               :::::::::::::::::::
              :::::::::::::::::::::
             ,:::::::::::::::::::::.
             :::::::::::::::::::::::
             :::::::::::::::::::::::
             :::::::::::::::::::::::
             .:::::::::::::::::::::.
              :::::::::::::::::::::
              ,:::::::::::::::::::,
               :::::::::::::::::::
               ':::::::::::::::::'
                .:::::::::::::::'
                 ':::::::::::::'
                   :::::::::::
                   :::::::::::
                   :::::::::::
                   :::::::::::
                   :::::::::::
`;

const lightOnAscii = `
                       ::::
                       ::::
                       ::::
                       ::::
           :           ::::             :
          ::,                          ,::
         ::::,                        ,::::
        .:::::.                      .:::::.
         '::::       ,:::::,          ::::'
                   :::::::::::
                 .:::::::::::::.
                :::::::::::::::::
               .:::::::::::::::::.
               :::::::::::::::::::
              :::::::::::::::::::::
             ,:::::::::::::::::::::.
  ::::::     :::::::::::::::::::::::     ::::::
  ::::::     :::::::::::::::::::::::     ::::::
  ::::::     :::::::::::::::::::::::     ::::::
  ::::::     .:::::::::::::::::::::.     ::::::
              :::::::::::::::::::::
               ,::::::::::::::::::,
               :::::::::::::::::::
               ':::::::::::::::::'
                .:::::::::::::::'
                 ':::::::::::::'
                   :::::::::::
                   :::::::::::
                   :::::::::::
                   :::::::::::
                   :::::::::::
`;

// TODO(Eric): put this in a JSON file
var isProvisioned = false;

bleno.on('stateChange', function(state) {
  console.log('on -> stateChange: ' + state);

  if (state === 'poweredOn') {
    let deviceName = isProvisioned ? DeviceConfig.Device.Name.Provisioned : DeviceConfig.Device.Name.Unprovisioned;

    bleno.startAdvertising(deviceName, DeviceConfig.Device.ServiceUuids);
  } else {
    // TODO(Eric): Totally a HACK. Couldn't find a good way to make it work.
    isProvisioned = true;
  }
});

bleno.on('advertisingStart', function(error) {
  console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));

  if (!error) {
    bleno.setServices([
      new BlenoPrimaryService({
        uuid: DeviceConfig.Device.ServiceUuids[0],
        characteristics: [
          new VirtualLightCharacteristic()
        ]
      })
    ]);
  }
});

bleno.on('advertisingStartError', function(error) {
  console.log('on -> advertisingStartError: ' + (error ? 'error ' + error : '???'));
});

// Virtual Light
var VirtualLightCharacteristic = function() {
  VirtualLightCharacteristic.super_.call(this, {
    uuid: DeviceConfig.Device.Characteristics[0],
    properties: ['read', 'write', 'writeWithoutResponse', 'notify'],
    value: null
  });

  this._value = new Buffer(0);
  this._updateValueCallback = null;
};

util.inherits(VirtualLightCharacteristic, BlenoCharacteristic);

VirtualLightCharacteristic.prototype.onReadRequest = function(offset, callback) {
  console.log('Virtual Light - onReadRequest: value = ' + this._value.toString('hex'));

  callback(this.RESULT_SUCCESS, this._value);
};

function flash() {
  console.log(lightOnAscii);

  setTimeout(() => {console.log(lightOffAscii);}, 300);
  setTimeout(() => {console.log(lightOnAscii);}, 300);
  setTimeout(() => {console.log(lightOffAscii);}, 300);
  setTimeout(() => {console.log(lightOnAscii);}, 300);
};

function turnOn() {
  console.log(lightOnAscii);
}

function turnOff() {
  console.log(lightOffAscii);
}

/*
 * BLINKING = 0x01,
 * PROVISIONING = 0x02,
 * 
 * COMMAND_ON = 0x10,
 * COMMAND_OFF = 0x11,
 * 
 * UNPROVISIONING = 0xFF
 */
VirtualLightCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
  this._value = data;
  console.log('Virtual Light - onWriteRequest: value = ' + this._value.toString('hex') + ", offset: " + offset + ", withoutResponse: " + withoutResponse);

  if (data[0] == 0x01) {
    flash();
  } else if (data[0] == 0x02) {
    console.log("Seamless Setup - PROVISIONING ...... We should change the name of the virtual device here but it didn't work with Bleno");
  } else if (data[0] == 0x10) {
    turnOn();
  } else if (data[0] == 0x11) {
    turnOff();
  } else if (data[0] == 0xFF) {
    //TODO(Eric): factory reset
    flash();

    isProvisioned = false;
  }

  if (this._updateValueCallback) {
    console.log('Virtual Light - onWriteRequest: notifying');
    this._updateValueCallback(this._value);
  }

  callback(this.RESULT_SUCCESS);
};

VirtualLightCharacteristic.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
  console.log('Virtual Light - onSubscribe');

  this._updateValueCallback = updateValueCallback;
};

VirtualLightCharacteristic.prototype.onUnsubscribe = function() {
  console.log('Virtual Light - onUnsubscribe');

  this._updateValueCallback = null;
};

bleno.on('disconnect', function(clientAddress) {
  console.log('disconnect ' + clientAddress);
});

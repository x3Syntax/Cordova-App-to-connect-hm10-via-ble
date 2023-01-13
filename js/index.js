/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// Wait for the deviceready event before using any of Cordova's device APIs.
// See https://cordova.apache.org/docs/en/latest/cordova/events/events.html#deviceready
document.addEventListener('deviceready', onDeviceReady, false);
const valueHolder = document.getElementById("temp");
const valueStatus = document.getElementById("status");
const btn = document.getElementById('scan-button');

var disconnectBtn = document.getElementById("disconnect-button");
var foundDevices = [];
var saveData = false;
var connectedDeviceAddress;

btn.addEventListener('click', () =>
{
    document.getElementById("scan-button").disabled = true;
    startScan();
});


function onDeviceReady()
{
    disconnectBtn.classList.toggle("hidden");
    updateStatus("Disconnected");
    // Request location permission
    cordova.plugins.diagnostic.requestLocationAuthorization(function(status)
    {
        switch(status)
        {
            case cordova.plugins.diagnostic.permissionStatus.GRANTED:
                console.log("Permission granted");
                break;
            case cordova.plugins.diagnostic.permissionStatus.DENIED:
                console.log("Permission denied");
                // Handle permission denied
                break;
            case cordova.plugins.diagnostic.permissionStatus.DENIED_ALWAYS:
                console.log("Permission permanently denied");
                // Handle permanently denied permission
                break;
        }
    },
    function(error)
    {
        console.error("The following error occurred: ", error);
    },
    cordova.plugins.diagnostic.locationAuthorizationMode.WHEN_IN_USE);
}

function startScan()
{
    disconnectBtn.addEventListener("click", function()
    {
        disconnect();
    });
    // Initialize the Bluetooth scanner
    window.bluetoothle.initialize(initializeSuccess, initializeError, {request: true});
    console.log("startScan function called");
    //document.getElementById("scan-button").disabled = true;
    // Callback for successful initialization
    function initializeSuccess(result)
    {
        if (result.status === "enabled")
        {
            // Start scanning for unconnected devices
            window.bluetoothle.startScan(startScanSuccess, startScanError, {serviceUuids: []});

            // Stop the scan after 10 seconds
            setTimeout(function()
            {
                window.bluetoothle.stopScan(stopScanSuccess, stopScanError);
            }, 5000);
        }
    }

    // Callback for failed initialization
    function initializeError(error)
    {
        console.log("Error initializing Bluetooth: ", error);
    }

    function startScanSuccess(result)
    {
        if(!foundDevices.includes(result.address))
        {
            if(result.name != null)
            {
                console.log("Device found: " + result.name);
                foundDevices.push(result.address);
                var device = document.createElement("li");
                // wrap device in a tag and give it a class name
                device.innerHTML = `<a class="device-button" data-address="${result.address}">${result.name}</a>`;
                document.getElementById("devices").appendChild(device);
                // add click event listener to the device button
                var deviceButton = device.querySelector('.device-button');
                deviceButton.addEventListener('click', function()
                {
                    connectToDevice(this.dataset.address);
                    deviceButton.classList.add("connected");
                });
            }
        }
    }
    // Callback for failed scan
    function startScanError(error)
    {
        console.log("Error scanning for devices: ", error);
    }

    function stopScanSuccess()
    {
        console.log("Scan stopped successfully.")
        document.getElementById("scan-button").disabled = false;
        updateStatus("Scan complete");
    }

    function stopScanError(error)
    {
        console.log("Error stopping scan: ", error);
    }

    function connectToDevice(address)
    {
        window.bluetoothle.connect(connectSuccess, connectError, {
        address: address,
        serviceUuid: "0000ffe0-0000-1000-8000-00805f9b34fb",
        characteristicUuid: "0000ffe1-0000-1000-8000-00805f9b34fb"
      });
    }

    function connectSuccess(result)
    {
        if (result.status === "connected")
        {
            console.log("Connected to device: " + result.address);
            window.bluetoothle.discover(discoverSuccess, discoverError, {address: result.address});
              //receiveDataFromDevice(result);
              updateStatus("Connected");
              connectedDeviceAddress = result.address;
        }
    }

    function connectError(error)
    {
        console.log("Error connecting to device: ", error);
    }

    function disconnect()
    {
        window.bluetoothle.disconnect(disconnectSuccess, disconnectError, { address: connectedDeviceAddress });
    }

    function disconnectSuccess(result)
    {
        if (result.status === "disconnected")
        {
            updateStatus("Disconnected");
            disconnectBtn.classList.toggle("hidden");
            console.log("Disconnected from device: " + result.address);
        }
    }

    function disconnectError(error)
    {
        console.log("Error disconnecting from device: ", error);
    }

    // Callback for successful discovery
    function discoverSuccess(result)
    {
        console.log("Discovered services and characteristics: " + JSON.stringify(result));
        // Subscribe to the characteristic
        window.bluetoothle.subscribe(subscribeSuccess, subscribeError,
        {
            address: result.address,
            service: "FFE0",
            characteristic: "FFE1"
        });
    }
    // Callback for failed discovery
    function discoverError(error)
    {
        console.log("Error discovering services and characteristics: ", error);
    }

    function subscribeSuccess(result)
    {
        updateStatus("Ready");
        disconnectBtn.classList.toggle("hidden");
        if (result.status === "subscribedResult")
        {
            console.log("Received data from device: " + window.bluetoothle.bytesToString(result.value));
            console.log(window.bluetoothle.encodedStringToBytes(result.value));

            if(result.value == 0xAB || saveData == true)
            {
                saveData = true;
                if(result.value == 0xCD)
                {
                    saveData = false;
                }
            }
        }
        console.log("subscribeSuccess: ", result);
    }

    function subscribeError(error)
    {
        console.log("Error subscribing to characteristic: ", error);
    }

    function stopReceivingDataFromDevice(address)
    {
        window.bluetoothle.unsubscribe(unsubscribeSuccess, unsubscribeError,
        {
            address: address,
            service: "FFE0",
            characteristic: "FFE1"
        });
    }

    function unsubscribeSuccess()
    {
        console.log("unsubscribed successfully");
    }

    function unsubscribeError(error)
    {
        console.log("Error unsubscribing : ", error);
    }
}

// Function to update the text of the element
function updateValueTemp(newValue)
{
    valueHolder.textContent = newValue;
}

function updateValuehumidity(newValue)
{
    valueHolder.textContent = newValue;
}
// Function to update the text of the element
function updateStatus(newValue)
{
    valueStatus.textContent = newValue;
}


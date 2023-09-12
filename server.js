const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");
//const fs = require("fs").promises;
const path = require("path");
const async = require("async"); // Used for queue
const axios = require("axios");
const Buttplug = require("buttplug");

const app = express();
const server = http.createServer(app);

let wsss;
let xtoyssocket;
const wss = new WebSocket.Server({ server });

const xtoyValues = {
  ItemNeck: 0,
  ItemArms: 0,
  ItemNipplesPiercings: 0,
  ItemNipples: 0,
  ItemBreast: 0,
  ItemVulva: 0,
  ItemVulvaPiercings: 0,
  ItemButt: 0,
  ItemPelvis: 0,
  ItemFeet: 0,
  ItemBoots: 0,
  ItemLegs: 0,
  ItemDevices: 0,
  activityOnOtherEvent: 0,
};

const xtoyminValues = {
  ItemNeck: 0,
  ItemArms: 0,
  ItemNipplesPiercings: 0,
  ItemNipples: 0,
  ItemBreast: 0,
  ItemVulva: 0,
  ItemVulvaPiercings: 0,
  ItemButt: 0,
  ItemPelvis: 0,
  ItemFeet: 0,
  ItemBoots: 0,
  ItemLegs: 0,
  ItemDevices: 0,
  activityOnOtherEvent: 0,
};

//#region Global Variables
let OnTrue = false;

let MainSettings = {
  Intiface: {
    Enabled: false,
  },
};
let MainSettingsPi = {
  PiShock: {
    Enabled: false,
    Username: "",
    APIKey: "",
  },
};
let ListPiEnabled = {
  1: false,
  2: false,
  3: false,
  4: false,
  5: false,
  7: false,
  8: false,
};
let PiSettings;
let ItemArms;
let ItemBoots;
let ItemBreast;
let ItemButt;
let ItemDevices;
let ItemFeet;
let ItemLegs;
let ItemNeck;
let ItemNipples;
let ItemPelvis;
let ItemVulva;
let ItemVulvaPiercings;
let activityOnOtherEvent;
let activeparts;
let Merged = {};
let bpioswitch = "off";
let xtoysswitch = "off";
let slots = {
  slot1: 0,
};
let slotsmin = {
  slotmin1: 0,
};
let validAssetNameOnOther;
let clients = [];
//#endregion

process.on("uncaughtException", function (err) {
  console.error("Caught exception: ", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Serve frontend files
app.use(express.static(path.join(process.cwd(), "public")));
let file = path.join(process.cwd(), "public");

const connector = new Buttplug.ButtplugNodeWebsocketClientConnector(
  "ws://127.0.0.1:12345"
);
const client = new Buttplug.ButtplugClient("BCBridge");

client.addListener("deviceadded", async (device) => {
  console.log(`Device Connected: ${device.name}`);
  let baseIndex = 0;
  client.devices.forEach((device) =>
    console.log(`- ${device.name} index : ${device._deviceInfo.DeviceIndex}`)
  );

  const simplifiedDevices = client.devices.map((device) => {
    return {
      DeviceIndex: baseIndex++,
      DeviceName: device._deviceInfo.DeviceName,
    };
  });
  sendMessageToRenderer("synctoy", simplifiedDevices);
  //console.log(simplifiedDevices);
});
client.addListener("deviceremoved", (device) => {
  console.log(`Device Removed: ${device.name}`);

  let baseIndex = 0;
  client.devices.forEach((device) =>
    console.log(`- ${device.name} index : ${device._deviceInfo.DeviceIndex}`)
  );

  const simplifiedDevices = client.devices.map((device) => {
    return {
      DeviceIndex: baseIndex++,
      DeviceName: device._deviceInfo.DeviceName,
    };
  });
  sendMessageToRenderer("synctoy", simplifiedDevices);
});

client.addListener("disconnect", async () => {
  sendMessageToRenderer("ServerStatus", "offline-plug");
  bpioswitch = "off";
  console.log("Butt Plug Disconnected");
});

// WebSocket connection
wss.on("connection", (ws) => {
  clients.push(ws);
  // Inside the 'connection' event handler of the WebSocket server
  ws.on("message", async (message) => {
    const data = JSON.parse(message);
    switch (data.type) {
      case "read-json":
        {
          const file = data.file;
          const requestId = data.requestId;
          const filePath = path.join(process.cwd(), "settings", file);
          fileQueueWorker.push(
            { operation: "read", filePath: filePath },
            (err, fileData) => {
              if (err) {
                // error
                console.error("Task error:", err);
              } else {
                // success
                const jsonData = JSON.parse(fileData);
                sendToClient(ws, {
                  type: "read-json-response",
                  data: jsonData,
                  requestId: requestId,
                });
              }
            }
          );
        }
        break;
      case "write-json":
        {
          const file = data.file;
          const json = data.json;
          const filePath = path.join(process.cwd(), "settings", file);
          const jsonString = JSON.stringify(json, null, 2);
          fileQueueWorker.push(
            { operation: "write", filePath: filePath, data: jsonString },
            (err) => {
              if (err) {
                //error
                sendToClient(ws, {
                  type: "toast",
                  message: "Error Saving Settings",
                  color: "#7B0000",
                });
                console.error("Task error:", err);
              } else {
                // success
                sendToClient(ws, {
                  type: "toast",
                  message: "Settings Saved",
                  color: "#008E2C",
                });
              }
            }
          );
        }
        break;
      case "write-json-pi":
        readAndUpdatePIJsonFile(data.json);
        break;
      case "test-pi":
        PiShockPost(data.json);
        break;
      case "start-ws":
        startWebSocketServer();
        break;
      case "close-ws":
        closeWebSocketServer();
        break;
      case "message-from-render":
        if (data.arg.type === "UpdateSettings") {
          await initSettings(true);
          await initPiShock();
          sendToClient(ws, {
            type: "toast",
            message: "Updated Settings on server",
            color: "#008E2C",
          });
          console.log("++++ ALL SETTINGS UPDATED ++++");
        }
        if (data.arg.type === "bpio") {
          //all of bp-io stuff
          if (data.arg.message === "bp-io-start") {
            connectWebSocketBPIO();
          }
          if (data.arg.message === "bp-io-stop") {
            disconnectWebSocket();
          }
        }
        if (data.arg.type === "xtoy") {
          //all of xtoys stuff
          if (data.arg.message === "xtoy-start") {
            connectWebSocketxToys();
          }
          if (data.arg.message === "xtoy-stop") {
            disconnectWebSocketxToys();
          }
        }

        if (data.arg.type === "bpiows") {
          SendSyncWebSocket();
        }
        break;
      case "req-all-status":
        allStatus();
        break;
      default:
        console.log("Unhandled message type:", data.type);
    }
  });
  ws.on("close", () => {
    clients = clients.filter((client) => client !== ws);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`+ BC-Bridge v0.4.4 Started (Norin update) +`);
  console.log(
    `- Visit http://localhost:${port}  or  http://127.0.0.1:${port} in a web browser`
  );
  console.log(
    `- Please take care when using the Pi Shock make sure you read the documentation on the Pi Shock website`
  );
  console.log(`- Find me on discord https://discord.gg/2VxqbbrUW8`);
});

function sendToClient(client, message) {
  console.log(message);
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
}
function allStatus() {
  if (wsss) {
    sendMessageToRenderer("ServerStatus", "online-main");
  } else {
    sendMessageToRenderer("ServerStatus", "offline-main");
  }
  if (bpioswitch === "on") {
    sendMessageToRenderer("ServerStatus", "online-plug");
  } else {
    sendMessageToRenderer("ServerStatus", "offline-plug");
  }
  if (xtoysswitch === "on") {
    sendMessageToRenderer("ServerStatus", "online-xtoys");
  } else {
    sendMessageToRenderer("ServerStatus", "offline-xtoys");
  }
}

// Start xToys Connection
function connectWebSocketxToys() {
  if (xtoysswitch === "on") {
    console.log("xToys WebSocket server is already running.");
  } else if (xtoysswitch === "off") {
    console.log("xToys WebSocket server is running.");
    xtoyssocket = new WebSocket.Server({ port: 12500 });
    xtoysswitch = "on";

    xtoyssocket.broadcast = function (data) {
      xtoyssocket.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          console.log("xToys WebSocket" + data);
          client.send(data);
        }
      });
    };

    sendMessageToRenderer("ServerStatus", "online-xtoys");
    xtoyssocket.on("connection", (client) => {
      client.on("message", (msg) => {
        const command = JSON.parse(msg);
        const value = command.test;
      });

      client.send(JSON.stringify(xtoyValues));
    });
  }
}
// Stop xToys Connection
function disconnectWebSocketxToys() {
  if (xtoyssocket) {
    xtoysswitch = "off";
    xtoyssocket.close();
    xtoyssocket = null;
    console.log("xToys WebSocket server closed.");
    sendMessageToRenderer("ServerStatus", "offline-xtoys");
  } else {
    console.log("xToys WebSocket server is not running.");
  }
}
// Start BP Connection
async function connectWebSocketBPIO() {
  if (bpioswitch === "off") {
    try {
      await client.connect(connector);
      await client.startScanning();
      sendMessageToRenderer("ServerStatus", "online-plug");
      bpioswitch = "on";
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  }
}
// Stop BP Connection
function disconnectWebSocket() {
  if (bpioswitch === "on") {
    client.disconnect();
    sendMessageToRenderer("ServerStatus", "offline-plug");
  }
}
// Ask BP for toy List
async function SendSyncWebSocket() {
  if (bpioswitch === "on") {
    await client.startScanning();
    console.log(`Syncing Toys List`);
    let baseIndex = 0;
    client.devices.forEach((device) =>
      console.log(`- ${device.name} index : ${device._deviceInfo.DeviceIndex}`)
    );

    const simplifiedDevices = client.devices.map((device) => {
      return {
        DeviceIndex: baseIndex++,
        DeviceName: device._deviceInfo.DeviceName,
      };
    });
    console.log(simplifiedDevices);
    sendMessageToRenderer("synctoy", simplifiedDevices);
  } else {
    console.log("Butt Plug is not connected.");
  }
}
function ws2SendRequest(data) {
  parsedData = JSON.parse(data);
  if (bpioswitch === "on") {
    const containsDeviceIndex = client.devices.some(
      (device) => device._deviceInfo.DeviceIndex === parsedData.id
    );

    if (containsDeviceIndex) {
      console.log(
        "1 - Vibrate on " + parsedData.id + " Speed " + parsedData.speed
      );
      client.devices[parsedData.id].vibrate(parsedData.speed);
    } else {
      console.log(
        "2 - Vibrate on " + parsedData.id + " Speed " + parsedData.speed
      );
      client.devices[parsedData.id].vibrate(parsedData.speed);
    }
  }
}

// Send a Message to the Renderer.js
function sendMessageToRenderer(type, message, color = "#333") {
  let messagejson = {
    type: type,
    message: message,
    color: color,
  };

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(messagejson));
    }
  });
}
// Function to start the Main server
function startWebSocketServer() {
  if (!wsss) {
    wsss = new WebSocket.Server({ port: 12300 });

    wsss.on("connection", (wss2) => {
      console.log("Client connected");
      sendMessageToRenderer("toast", "Client connected", "#008E2C");
      wss2.on("message", (message) => {
        console.log(`Server Received message: ${message}`);
        data = JSON.parse(message);
        if (MainSettings.Intiface.Enabled) {
          //iniface is enabled
          const InvalidAssetGroupNames = [
            "ItemMisc",
            "ItemEars",
            "ItemHead",
            "ItemNose",
            "ItemMouth",
            "ItemMouth2",
            "ItemMouth3",
            "ItemHands",
            "ItemAddon",
            "ItemNeckAccessories",
            "ItemNeckRestraints",
            "ItemTorso",
            "ItemTorso2",
            "ItemHandheld",
            "ItemHood",
          ];

          if (!InvalidAssetGroupNames.includes(data.assetGroupName)) {
            switch (data.action) {
              case "activityEvent":
                handleActivityEvent(data);
                break;
              case "activityOnOtherEvent":
                handleActivityOnOtherEvent(data);
                break;
              case "itemRemoved":
                handleToyRemoveEvent(data);
                break;
              case "itemSwapped":
                handleToyRemoveEvent(data);
                handleToyAddEvent(data);
                break;
              case "itemAdded":
                handleToyAddEvent(data);
                break;
              case "toyEvent":
                handleToyEvent(data);
                break;
            }
          }
        }

        if (MainSettings.xToy.Enabled) {
          //xToys is enabled

          //let randomNumber = Math.floor(Math.random() * 100) + 1;
          //xtoyssocket.broadcast(JSON.stringify({ ItemVulva: randomNumber }));

          const InvalidAssetGroupNames = [
            "ItemMisc",
            "ItemEars",
            "ItemHead",
            "ItemNose",
            "ItemMouth",
            "ItemMouth2",
            "ItemMouth3",
            "ItemHands",
            "ItemAddon",
            "ItemNeckAccessories",
            "ItemNeckRestraints",
            "ItemTorso",
            "ItemTorso2",
            "ItemHandheld",
            "ItemHood",
          ];

          if (!InvalidAssetGroupNames.includes(data.assetGroupName)) {
            switch (data.action) {
              case "activityEvent":
                xtoy_handleActivityEvent(data);
                break;
              case "activityOnOtherEvent":
                xtoy_handleActivityOnOtherEvent(data);
                break;
              case "itemRemoved":
                xtoy_handleToyRemoveEvent(data);
                break;
              case "itemSwapped":
                xtoy_handleToyRemoveEvent(data);
                xtoy_handleToyAddEvent(data);
                break;
              case "itemAdded":
                xtoy_handleToyAddEvent(data);
                break;
              case "toyEvent":
                xtoy_handleToyEvent(data);
                break;
            }
          }
        }

        if (MainSettingsPi.PiShock.Enabled) {
          const InvalidAssetGroupNames = [
            "ItemEars",
            "ItemHead",
            "ItemNose",
            "ItemMouth",
            "ItemMouth2",
            "ItemMouth3",
            "ItemHands",
            "ItemHood",
          ];
          PiData = JSON.parse(message);

          // OLD: {"action": "shockEvent", "assetGroupName": "ItemNeckAccessories", "level": 0} TODO
          // NEW: {"action": "activityEvent", "assetGroupName": "ItemNeck", "actionName": "ShockLow", "assetName": "PetSuitShockCollar"}
          if (
            data.action == "activityEvent" &&
            !InvalidAssetGroupNames.includes(data.assetGroupName)
          ) {
            handlePiActivityEvent(data);
          }
        }
      });

      wss2.on("close", () => {
        console.log("Client disconnected");
      });
    });
    sendMessageToRenderer("toast", "Main server started", "#008E2C");
    sendMessageToRenderer("ServerStatus", "online-main");
    initPiShock();
    initSettings();
  } else {
    console.log("Main server is already running");
    sendMessageToRenderer("toast", "Main server is already running", "#7B0000");
  }
}

// Function to close the Main server
function closeWebSocketServer() {
  if (wsss) {
    wsss.close(() => {
      sendMessageToRenderer("toast", "Main server closed", "#7B0000");
      sendMessageToRenderer("ServerStatus", "offline-main");
    });
    wsss = null;
  } else {
    console.log("Main server is not running");
    sendMessageToRenderer("toast", "Main server is not running", "#7B0000");
  }
}

// Load JSON file
function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(process.cwd(), "settings", file);
    fileQueueWorker.push(
      { operation: "read", filePath: fullPath },
      (err, data) => {
        if (err) {
          console.error("Task error:", err);
          reject(err);
        } else {
          const json = JSON.parse(data);
          resolve(json);
        }
      }
    );
  });
}

// Saves a JSON File
function saveJSONToFile(jsonData, fileName) {
  const filePath = path.join(process.cwd(), "settings", fileName);
  const jsonString = JSON.stringify(jsonData, null, 2);
  fileQueueWorker.push(
    { operation: "write", filePath: filePath, data: jsonString },
    (err) => {
      if (err) {
        //error
        console.error("Task error:", err);
      } else {
        // success
      }
    }
  );
}

function handleToyAddEvent(data) {
  const bodypart = data.assetGroupName;
  const Toyid = activeparts[bodypart];
  if (Toyid !== undefined && Toyid !== "none") {
    const item = data.assetName;
    let filename;
    let dirname = data.assetGroupName;
    let localData;
    localData = Merged[bodypart].ItemAdded;
    filename = "ItemAdded" + item;
    if (localData === undefined) {
      Merged[bodypart].ItemAdded = {};
      localData = Merged[bodypart].ItemAdded;
    }
    if (!localData[item]) {
      localData[item] = {
        Amount: 0,
        Duration: 1000,
        FunScript: false,
      };
      sendPreQ(Toyid, localData[item], dirname, filename);
      updateJsonFile_ItemAdded(bodypart, data);
    } else {
      sendPreQ(Toyid, localData[item], dirname, filename);
    }
  }
}

async function updateJsonFile_ItemAdded(BodyPart, data) {
  sendMessageToRenderer(
    "toast",
    "Missing Data ItemAdded for " + JSON.stringify(data),
    "#7B0000"
  );

  if (BodyPart === "ItemButt") {
    ItemButt = await readJsonFile("ItemButt.json");
    const item = data.assetName;

    if (!ItemButt.ItemAdded) {
      ItemButt.ItemAdded = {};
    }

    ItemButt.ItemAdded = {
      ...ItemButt.ItemAdded,
      [item]: {
        Amount: 0,
        Duration: 1000,
        FunScript: false,
      },
    };
    saveJSONToFile(ItemButt, "ItemButt.json");
  }
  if (BodyPart === "ItemArms") {
    ItemArms = await readJsonFile("ItemArms.json");
    const item = data.assetName;
    if (!ItemArms.ItemAdded) {
      ItemArms.ItemAdded = {};
    }

    ItemArms.ItemAdded = {
      ...ItemArms.ItemAdded,
      [item]: {
        Amount: 0,
        Duration: 1000,
        FunScript: false,
      },
    };
    saveJSONToFile(ItemArms, "ItemArms.json");
  }
  if (BodyPart === "ItemBoots") {
    ItemBoots = await readJsonFile("ItemBoots.json");
    const item = data.assetName;
    if (!ItemBoots.ItemAdded) {
      ItemBoots.ItemAdded = {};
    }

    ItemBoots.ItemAdded = {
      ...ItemBoots.ItemAdded,
      [item]: {
        Amount: 0,
        Duration: 1000,
        FunScript: false,
      },
    };
    saveJSONToFile(ItemBoots, "ItemBoots.json");
  }
  if (BodyPart === "ItemBreast") {
    ItemBreast = await readJsonFile("ItemBreast.json");
    const item = data.assetName;
    if (!ItemBreast.ItemAdded) {
      ItemBreast.ItemAdded = {};
    }

    ItemBreast.ItemAdded = {
      ...ItemBreast.ItemAdded,
      [item]: {
        Amount: 0,
        Duration: 1000,
        FunScript: false,
      },
    };
    saveJSONToFile(ItemBreast, "ItemBreast.json");
  }
  if (BodyPart === "ItemDevices") {
    ItemDevices = await readJsonFile("ItemDevices.json");
    const item = data.assetName;
    if (!ItemDevices.ItemAdded) {
      ItemDevices.ItemAdded = {};
    }

    ItemDevices.ItemAdded = {
      ...ItemDevices.ItemAdded,
      [item]: {
        Amount: 0,
        Duration: 1000,
        FunScript: false,
      },
    };
    saveJSONToFile(ItemDevices, "ItemDevices.json");
  }
  if (BodyPart === "ItemFeet") {
    ItemFeet = await readJsonFile("ItemFeet.json");
    const item = data.assetName;
    if (!ItemFeet.ItemAdded) {
      ItemFeet.ItemAdded = {};
    }

    ItemFeet.ItemAdded = {
      ...ItemFeet.ItemAdded,
      [item]: {
        Amount: 0,
        Duration: 1000,
        FunScript: false,
      },
    };
    saveJSONToFile(ItemFeet, "ItemFeet.json");
  }
  if (BodyPart === "ItemLegs") {
    ItemLegs = await readJsonFile("ItemLegs.json");
    const item = data.assetName;
    if (!ItemLegs.ItemAdded) {
      ItemLegs.ItemAdded = {};
    }

    ItemLegs.ItemAdded = {
      ...ItemLegs.ItemAdded,
      [item]: {
        Amount: 0,
        Duration: 1000,
        FunScript: false,
      },
    };
    saveJSONToFile(ItemLegs, "ItemLegs.json");
  }
  if (BodyPart === "ItemNeck") {
    ItemNeck = await readJsonFile("ItemNeck.json");
    const item = data.assetName;
    if (!ItemNeck.ItemAdded) {
      ItemNeck.ItemAdded = {};
    }

    ItemNeck.ItemAdded = {
      ...ItemNeck.ItemAdded,
      [item]: {
        Amount: 0,
        Duration: 1000,
        FunScript: false,
      },
    };
    saveJSONToFile(ItemNeck, "ItemNeck.json");
  }
  if (BodyPart === "ItemNipples") {
    ItemNipples = await readJsonFile("ItemNipples.json");
    const item = data.assetName;
    if (!ItemNipples.ItemAdded) {
      ItemNipples.ItemAdded = {};
    }

    ItemNipples.ItemAdded = {
      ...ItemNipples.ItemAdded,
      [item]: {
        Amount: 0,
        Duration: 1000,
        FunScript: false,
      },
    };
    saveJSONToFile(ItemNipples, "ItemNipples.json");
  }
  if (BodyPart === "ItemPelvis") {
    ItemPelvis = await readJsonFile("ItemPelvis.json");
    const item = data.assetName;
    if (!ItemPelvis.ItemAdded) {
      ItemPelvis.ItemAdded = {};
    }

    ItemPelvis.ItemAdded = {
      ...ItemPelvis.ItemAdded,
      [item]: {
        Amount: 0,
        Duration: 1000,
        FunScript: false,
      },
    };
    saveJSONToFile(ItemPelvis, "ItemPelvis.json");
  }
  if (BodyPart === "ItemVulva") {
    ItemVulva = await readJsonFile("ItemVulva.json");
    const item = data.assetName;
    if (!ItemVulva.ItemAdded) {
      ItemVulva.ItemAdded = {};
    }

    ItemVulva.ItemAdded = {
      ...ItemVulva.ItemAdded,
      [item]: {
        Amount: 0,
        Duration: 1000,
        FunScript: false,
      },
    };
    saveJSONToFile(ItemVulva, "ItemVulva.json");
  }
  if (BodyPart === "ItemVulvaPiercings") {
    ItemVulvaPiercings = await readJsonFile("ItemVulvaPiercings.json");
    const item = data.assetName;
    if (!ItemVulvaPiercings.ItemAdded) {
      ItemVulvaPiercings.ItemAdded = {};
    }

    ItemVulvaPiercings.ItemAdded = {
      ...ItemVulvaPiercings.ItemAdded,
      [item]: {
        Amount: 0,
        Duration: 1000,
        FunScript: false,
      },
    };
    saveJSONToFile(ItemVulvaPiercings, "ItemVulvaPiercings.json");
  }
  if (BodyPart === "ItemNipplesPiercings") {
    ItemNipplesPiercings = await readJsonFile("ItemNipplesPiercings.json");
    const item = data.assetName;
    if (!ItemNipplesPiercings.ItemAdded) {
      ItemNipplesPiercings.ItemAdded = {};
    }

    ItemNipplesPiercings.ItemAdded = {
      ...ItemNipplesPiercings.ItemAdded,
      [item]: {
        Amount: 0,
        Duration: 1000,
        FunScript: false,
      },
    };
    saveJSONToFile(ItemNipplesPiercings, "ItemNipplesPiercings.json");
  }
}

// Load All Json and store in Global variables
async function initSettings(justSync = false) {
  const jsonDataParsed = await readJsonFile("activityOnOtherInclude.json");
  MainSettings = await readJsonFile("settings.json");

  validAssetNameOnOther = jsonDataParsed.validAssetName;

  if (MainSettings.Intiface.Enabled || MainSettings.xToy.Enabled) {
    Merged = {};
    ItemArms = {};
    ItemBoots = {};
    ItemBreast = {};
    ItemButt = {};
    ItemDevices = {};
    ItemFeet = {};
    ItemLegs = {};
    ItemNeck = {};
    ItemNipples = {};
    ItemPelvis = {};
    ItemVulva = {};
    ItemVulvaPiercings = {};
    activityOnOtherEvent = {};
    activeparts = {};
    activeparts = await readJsonFile("settingspage.json");
    ItemArms = await readJsonFile("ItemArms.json");
    ItemButt = await readJsonFile("ItemButt.json");
    ItemBoots = await readJsonFile("ItemBoots.json");
    ItemBreast = await readJsonFile("ItemBreast.json");
    ItemDevices = await readJsonFile("ItemDevices.json");
    ItemFeet = await readJsonFile("ItemFeet.json");
    ItemLegs = await readJsonFile("ItemLegs.json");
    ItemNeck = await readJsonFile("ItemNeck.json");
    ItemNipples = await readJsonFile("ItemNipples.json");
    ItemPelvis = await readJsonFile("ItemPelvis.json");
    ItemVulva = await readJsonFile("ItemVulva.json");
    ItemVulvaPiercings = await readJsonFile("ItemVulvaPiercings.json");
    activityOnOtherEvent = await readJsonFile("activityOnOtherEvent.json");
    ItemNipplesPiercings = await readJsonFile("ItemNipplesPiercings.json");
    ItemArms = { ItemArms: ItemArms };
    ItemButt = { ItemButt: ItemButt };
    ItemBoots = { ItemBoots: ItemBoots };
    ItemBreast = { ItemBreast: ItemBreast };
    ItemDevices = { ItemDevices: ItemDevices };
    ItemFeet = { ItemFeet: ItemFeet };
    ItemLegs = { ItemLegs: ItemLegs };
    ItemNeck = { ItemNeck: ItemNeck };
    ItemNipples = { ItemNipples: ItemNipples };
    ItemPelvis = { ItemPelvis: ItemPelvis };
    ItemVulva = { ItemVulva: ItemVulva };
    ItemVulvaPiercings = { ItemVulvaPiercings: ItemVulvaPiercings };
    activityOnOtherEvent = { activityOnOtherEvent: activityOnOtherEvent };
    ItemNipplesPiercings = { ItemNipplesPiercings: ItemNipplesPiercings };
    Merged = Object.assign(
      {},
      ItemArms,
      ItemButt,
      ItemBoots,
      ItemBreast,
      ItemDevices,
      ItemFeet,
      ItemLegs,
      ItemNeck,
      ItemNipples,
      ItemPelvis,
      ItemVulva,
      ItemVulvaPiercings,
      activityOnOtherEvent,
      ItemNipplesPiercings
    );
    if (justSync === false) {
      if (bpioswitch === "off" && MainSettings.Intiface.Enabled) {
        connectWebSocketBPIO();
      }
      if (xtoysswitch === "off" && MainSettings.xToy.Enabled) {
        connectWebSocketxToys();
      }
    }
  }
}

// Search Loaded JSON Activities for Actions from BC and get Amount and Duration
// On Missing Activity call updateJsonFile
function handleActivityEvent(data) {
  const bodypart = data.assetGroupName;
  const Toyid = activeparts[bodypart];
  if (Toyid !== undefined && Toyid !== "none") {
    const item = data.assetName;
    const action = data.actionName;
    let filename;
    let dirname = data.assetGroupName;
    let localData;
    localData = Merged[bodypart];
    if (item === "none") {
      filename = action;
      let AmountAndDuration;
      AmountAndDuration = localData[action];
      if (AmountAndDuration == undefined) {
        AmountAndDuration = localData.Default;
        Merged[bodypart][action] = AmountAndDuration;
        updateJsonFile(bodypart, data, AmountAndDuration);
      }
      sendPreQ(Toyid, AmountAndDuration, dirname, filename);
    } else {
      filename = action + item;
      let missingdata = false;
      if (!localData[action]) {
        missingdata = true;
        localData[action] = {};
      }
      if (!localData[action][item]) {
        missingdata = true;
        localData[action][item] = {};
      }
      if (missingdata === true) {
        AmountAndDuration = localData.Default;
        Merged[bodypart][action][item] = AmountAndDuration;
        sendPreQ(Toyid, AmountAndDuration, dirname, filename);
        updateJsonFile(bodypart, data, AmountAndDuration);
      } else {
        let ActionName = localData[action];
        let AmountAndDuration = ActionName[item];
        sendPreQ(Toyid, AmountAndDuration, dirname, filename);
      }
    }
  }
}

// Search Loaded JSON Activities for Actions from BC and get Amount and Duration
// On Missing Activity call updateJsonFile
function handleActivityOnOtherEvent(data) {
  const Toyid = activeparts.activityOnOther; //Check active toy for location
  if (Toyid !== undefined && Toyid !== "none") {
    let filename;
    const item = data.assetName;
    const action = data.actionName;
    let localData = Merged.activityOnOtherEvent;
    if (item === "none") {
      //this is where head pats and cuddles are
    } else if (validAssetNameOnOther.includes(item)) {
      filename = action + item;
      // Items match the JSON data
      // Target Location (assetGroupName) >> assetName >> actionName
      let Default = localData.Default;
      let missingdata = false;
      // Check if the asset group exists
      if (!localData[data.assetGroupName]) {
        localData[data.assetGroupName] = {};
        missingdata = true;
      }
      // Check if the item exists within the asset group
      if (!localData[data.assetGroupName][item]) {
        localData[data.assetGroupName][item] = {};
        missingdata = true;
      }
      // Check if the action exists within the item
      if (!localData[data.assetGroupName][item][action]) {
        localData[data.assetGroupName][item][action] = Default;
        missingdata = true;
      }

      if (missingdata === true) {
        let AmountAndDuration = localData.Default;
        Object.assign(Merged.activityOnOtherEvent, localData);
        updateJsonFile("activityOnOther", data, AmountAndDuration);
      } else {
        let AmountAndDuration =
          localData[data.assetGroupName][item][data.actionName];
        if (AmountAndDuration == undefined) {
          AmountAndDuration = localData.Default;
          Merged.activityOnOtherEvent[data.assetGroupName][item][
            data.actionName
          ] = AmountAndDuration;
          updateJsonFile("activityOnOther", data, AmountAndDuration);
        }
        sendPreQ(
          Toyid,
          AmountAndDuration,
          "activityOnOtherEvent/" + data.assetGroupName,
          filename
        );
      }
    }
  }
}

// If Toy is removed in game it will send 0 to BP
function handleToyRemoveEvent(data) {
  const bodypart = data.assetGroupName;
  const Toyid = activeparts[bodypart];
  if (Toyid !== undefined && Toyid !== "none") {
    sendPreQToyMin(Toyid, 0);
  }
}

// Search Loaded JSON for Toy values and updated the Min on slot
function handleToyEvent(data) {
  const bodypart = data.assetGroupName;
  const Toyid = activeparts[bodypart];
  let localData;
  localData = Merged[bodypart];
  if (Toyid !== undefined && Toyid !== "none") {
    if (data.level === 0) {
      sendPreQToyMin(Toyid, 0);
    } else if (data.level === 1) {
      sendPreQToyMin(Toyid, localData.Toys.low);
    } else if (data.level === 2) {
      sendPreQToyMin(Toyid, localData.Toys.medium);
    } else if (data.level === 3) {
      sendPreQToyMin(Toyid, localData.Toys.high);
    } else if (data.level === 4) {
      sendPreQToyMin(Toyid, localData.Toys.max);
    }
  }
}

// Updates the Slot Min
function sendPreQToyMin(id, minValue) {
  let key = "slot" + id;
  if (slots[key] === undefined) {
    slots[key] = 0;
  }
  let key2 = "slotmin" + id;
  slotsmin[key2] = minValue;
  Queue_Vibr.push({
    Deviceid: id,
    intensity: 0,
    timeout: 10,
  });
}

// Error handling before sending to Queue
function sendPreQ(id, AmountAndDuration, dir, path) {
  console.log("------ pre Q ------");
  console.log(AmountAndDuration);
  console.log(dir);
  console.log(path);
  console.log("------ pre Q ------");
  let key = "slot" + id;
  if (slots[key] === undefined) {
    slots[key] = 0;
  }
  let key2 = "slotmin" + id;
  if (slotsmin[key2] === undefined) {
    slotsmin[key2] = 0;
  }

  if (AmountAndDuration.FunScript === true) {
    Queue_Vibr.push({
      Deviceid: id,
      intensity: AmountAndDuration.Amount,
      timeout: AmountAndDuration.Duration,
      funscript: true,
      funscriptdir: dir,
      funscriptpath: path,
    });
  } else {
    Queue_Vibr.push({
      Deviceid: id,
      intensity: AmountAndDuration.Amount,
      timeout: AmountAndDuration.Duration,
    });
  }
}

// Adds missing events or new items to the orginal files to keep things updated
async function updateJsonFile(BodyPart, data, Default) {
  sendMessageToRenderer(
    "toast",
    "Missing Data for " + JSON.stringify(data),
    "#7B0000"
  );
  if (BodyPart === "activityOnOther") {
    activityOnOtherEvent = await readJsonFile("activityOnOtherEvent.json");
    const item = data.assetName;
    const action = data.actionName;

    // Check if the asset group exists
    if (!activityOnOtherEvent[data.assetGroupName]) {
      activityOnOtherEvent[data.assetGroupName] = {};
    }

    // Check if the item exists within the asset group
    if (!activityOnOtherEvent[data.assetGroupName][item]) {
      activityOnOtherEvent[data.assetGroupName][item] = {};
    }

    // Check if the action exists within the item
    if (!activityOnOtherEvent[data.assetGroupName][item][action]) {
      activityOnOtherEvent[data.assetGroupName][item][action] = Default;
    }
    saveJSONToFile(activityOnOtherEvent, "activityOnOtherEvent.json");
  }

  if (BodyPart === "ItemButt") {
    ItemButt = await readJsonFile("ItemButt.json");
    const item = data.assetName;
    const action = data.actionName;
    if (item === "none") {
      ItemButt[action] = Default;
    } else {
      if (!ItemButt[action]) {
        ItemButt[action] = {};
      }
      if (!ItemButt[action][item]) {
        ItemButt[action][item] = Default;
      }
    }
    saveJSONToFile(ItemButt, "ItemButt.json");
  }
  if (BodyPart === "ItemArms") {
    ItemArms = await readJsonFile("ItemArms.json");
    const item = data.assetName;
    const action = data.actionName;
    if (item === "none") {
      ItemArms[action] = Default;
    } else {
      if (!ItemArms[action]) {
        ItemArms[action] = {};
      }
      if (!ItemArms[action][item]) {
        ItemArms[action][item] = Default;
      }
    }
    saveJSONToFile(ItemArms, "ItemArms.json");
  }
  if (BodyPart === "ItemBoots") {
    ItemBoots = await readJsonFile("ItemBoots.json");
    const item = data.assetName;
    const action = data.actionName;
    if (item === "none") {
      ItemBoots[action] = Default;
    } else {
      if (!ItemBoots[action]) {
        ItemBoots[action] = {};
      }
      if (!ItemBoots[action][item]) {
        ItemBoots[action][item] = Default;
      }
    }
    saveJSONToFile(ItemBoots, "ItemBoots.json");
  }
  if (BodyPart === "ItemBreast") {
    ItemBreast = await readJsonFile("ItemBreast.json");
    const item = data.assetName;
    const action = data.actionName;
    if (item === "none") {
      ItemBreast[action] = Default;
    } else {
      if (!ItemBreast[action]) {
        ItemBreast[action] = {};
      }
      if (!ItemBreast[action][item]) {
        ItemBreast[action][item] = Default;
      }
    }
    saveJSONToFile(ItemBreast, "ItemBreast.json");
  }

  if (BodyPart === "ItemDevices") {
    ItemDevices = await readJsonFile("ItemDevices.json");
    const item = data.assetName;
    const action = data.actionName;
    if (item === "none") {
      ItemDevices[action] = Default;
    } else {
      if (!ItemDevices[action]) {
        ItemDevices[action] = {};
      }
      if (!ItemDevices[action][item]) {
        ItemDevices[action][item] = Default;
      }
    }
    saveJSONToFile(ItemDevices, "ItemDevices.json");
  }

  if (BodyPart === "ItemFeet") {
    ItemFeet = await readJsonFile("ItemFeet.json");
    const item = data.assetName;
    const action = data.actionName;
    if (item === "none") {
      ItemFeet[action] = Default;
    } else {
      if (!ItemFeet[action]) {
        ItemFeet[action] = {};
      }
      if (!ItemFeet[action][item]) {
        ItemFeet[action][item] = Default;
      }
    }
    saveJSONToFile(ItemFeet, "ItemFeet.json");
  }
  if (BodyPart === "ItemLegs") {
    ItemLegs = await readJsonFile("ItemLegs.json");
    const item = data.assetName;
    const action = data.actionName;
    if (item === "none") {
      ItemLegs[action] = Default;
    } else {
      if (!ItemLegs[action]) {
        ItemLegs[action] = {};
      }
      if (!ItemLegs[action][item]) {
        ItemLegs[action][item] = Default;
      }
    }
    saveJSONToFile(ItemLegs, "ItemLegs.json");
  }

  if (BodyPart === "ItemNeck") {
    ItemNeck = await readJsonFile("ItemNeck.json");
    const item = data.assetName;
    const action = data.actionName;
    if (item === "none") {
      ItemNeck[action] = Default;
    } else {
      if (!ItemNeck[action]) {
        ItemNeck[action] = {};
      }
      if (!ItemNeck[action][item]) {
        ItemNeck[action][item] = Default;
      }
    }
    saveJSONToFile(ItemNeck, "ItemNeck.json");
  }

  if (BodyPart === "ItemNipples") {
    ItemNipples = await readJsonFile("ItemNipples.json");
    const item = data.assetName;
    const action = data.actionName;
    if (item === "none") {
      ItemNipples[action] = Default;
    } else {
      if (!ItemNipples[action]) {
        ItemNipples[action] = {};
      }
      if (!ItemNipples[action][item]) {
        ItemNipples[action][item] = Default;
      }
    }
    saveJSONToFile(ItemNipples, "ItemNipples.json");
  }

  if (BodyPart === "ItemPelvis") {
    ItemPelvis = await readJsonFile("ItemPelvis.json");
    const item = data.assetName;
    const action = data.actionName;
    if (item === "none") {
      ItemPelvis[action] = Default;
    } else {
      if (!ItemPelvis[action]) {
        ItemPelvis[action] = {};
      }
      if (!ItemPelvis[action][item]) {
        ItemPelvis[action][item] = Default;
      }
    }
    saveJSONToFile(ItemPelvis, "ItemPelvis.json");
  }

  if (BodyPart === "ItemVulva") {
    ItemVulva = await readJsonFile("ItemVulva.json");
    const item = data.assetName;
    const action = data.actionName;
    if (item === "none") {
      ItemVulva[action] = Default;
    } else {
      if (!ItemVulva[action]) {
        ItemVulva[action] = {};
      }
      if (!ItemVulva[action][item]) {
        ItemVulva[action][item] = Default;
      }
    }
    saveJSONToFile(ItemVulva, "ItemVulva.json");
  }

  if (BodyPart === "ItemVulvaPiercings") {
    ItemVulvaPiercings = await readJsonFile("ItemVulvaPiercings.json");
    const item = data.assetName;
    const action = data.actionName;
    if (item === "none") {
      ItemVulvaPiercings[action] = Default;
    } else {
      if (!ItemVulvaPiercings[action]) {
        ItemVulvaPiercings[action] = {};
      }
      if (!ItemVulvaPiercings[action][item]) {
        ItemVulvaPiercings[action][item] = Default;
      }
    }
    saveJSONToFile(ItemVulvaPiercings, "ItemVulvaPiercings.json");
  }
  if (BodyPart === "ItemNipplesPiercings") {
    ItemNipplesPiercings = await readJsonFile("ItemNipplesPiercings.json");
    const item = data.assetName;
    const action = data.actionName;
    if (item === "none") {
      ItemNipplesPiercings[action] = Default;
    } else {
      if (!ItemNipplesPiercings[action]) {
        ItemNipplesPiercings[action] = {};
      }
      if (!ItemNipplesPiercings[action][item]) {
        ItemNipplesPiercings[action][item] = Default;
      }
    }
    saveJSONToFile(ItemNipplesPiercings, "ItemNipplesPiercings.json");
  }
}

// Puts together the CMD message
// Will need to update to add toys other than Vibrate
function generateVibrateCmdMessage(deviceId, temp1) {
  const temp2 = Number(temp1 / 100);
  return `{"id":${deviceId},"speed":${temp2}}`;
}

// The Queue that holds actions allows actions to stack and de-stack
let Queue_Vibr = async.queue(async function (task) {
  if (task.funscript === true) {
    console.log(
      `Performing Fun Script: ${task.Deviceid} Dir: ${task.funscriptdir} Funscript: ${task.funscriptpath}`
    );
    const filePath = path.join(
      process.cwd(),
      "funscripts/" + task.funscriptdir,
      task.funscriptpath + ".funscript"
    );
    console.log(filePath);
    const funscriptData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const actions = funscriptData.actions;
    // Run the Funscript
    console.log("Running Funscript...");
    let lastActionTime = 0;
    for (const action of actions) {
      const currentTime = action.at;
      const position = action.pos;

      // Calculate sleep duration based on the timestamp difference
      const sleepDuration = currentTime - lastActionTime;

      // Wait for the sleep duration
      await new Promise((resolve) => setTimeout(resolve, sleepDuration));

      // Move all connected devices to the target position
      let currentValue = slots["slot" + task.Deviceid];
      let newValue = currentValue + position;
      let minValue = slotsmin["slotmin" + task.Deviceid];

      if (currentValue < 0) {
        slots["slot" + task.Deviceid] = 0;
      }
      if (minValue < 0) {
        slotsmin["slotmin" + task.Deviceid] = 0;
      }

      let temp1 = minValue + newValue;
      temp1 = Math.min(temp1, 100);

      const message = generateVibrateCmdMessage(task.Deviceid, temp1);
      ws2SendRequest(message);

      console.log(position);
      console.log(action.at);

      lastActionTime = currentTime;
    }

    console.log("Finished running Funscript.");
  } else {
    console.log(
      `Performing task: ${task.Deviceid} intensity: ${task.intensity} Delay: ${task.timeout}`
    );
    console.log("----------------------------------");

    let currentValue = slots["slot" + task.Deviceid];
    let newValue = currentValue + task.intensity;
    let minValue = slotsmin["slotmin" + task.Deviceid];

    if (currentValue < 0) {
      slots["slot" + task.Deviceid] = 0;
    }
    if (minValue < 0) {
      slotsmin["slotmin" + task.Deviceid] = 0;
    }
    slots["slot" + task.Deviceid] = newValue;

    let temp1 = minValue + newValue;
    temp1 = Math.min(temp1, 100);

    const message = generateVibrateCmdMessage(task.Deviceid, temp1);
    ws2SendRequest(message);

    await new Promise((resolve) => {
      setTimeout(() => {
        let currentValue = slots["slot" + task.Deviceid];
        let minValue = slotsmin["slotmin" + task.Deviceid];
        let newValue = currentValue - task.intensity;
        slots["slot" + task.Deviceid] = newValue;

        let temp1 = minValue + newValue;
        temp1 = Math.min(temp1, 100);

        const message = generateVibrateCmdMessage(task.Deviceid, temp1);
        ws2SendRequest(message);

        resolve();
      }, task.timeout + 500);
    });
  }
}, 150);

// All Pi Shock Functions
// Load all the JSON files for PiShock
//
async function initPiShock() {
  MainSettingsPi = await readJsonFile("settings.json");
  if (MainSettingsPi.PiShock.Enabled) {
    const ALLPI = await readJsonFile("allpi.json");
    PiSettings = {};
    ListPiEnabled = ALLPI;

    for (const key in ListPiEnabled) {
      if (ListPiEnabled.hasOwnProperty(key) && ListPiEnabled[key] === true) {
        const mainpiPath = `Mainpi${key}.json`;
        const vibepiPath = `vibepi${key}.json`;
        const shockpiPath = `shockpi${key}.json`;

        const mainpiData = await readJsonFile(mainpiPath);
        const vibepiData = await readJsonFile(vibepiPath);
        const shockpiData = await readJsonFile(shockpiPath);

        const mergedData = {
          [key]: {
            ...mainpiData,
            Vibrate: vibepiData,
            Shock: shockpiData,
          },
        };

        Object.assign(PiSettings, mergedData);
      }
    }
    //console.log(PiSettings); // for debugging purposes
  }
}

// Updates the allpi.json (keeps record of what devices are active and what devices are not)
function readAndUpdatePIJsonFile(newData) {
  fileQueueWorker.push({ operation: "update-pi", data: newData }, (err) => {
    if (err) {
      console.error("Task error:", err);
    } else {
      console.log("Task completed. PI JSON updated.");
    }
  });
}
// Checks if the value is a number
function isValidNumber(value) {
  return (
    value !== undefined &&
    value !== null &&
    value !== 0 &&
    typeof value === "number"
  );
}

// Send a post request to Pi Shock API
async function postRequest(requestBody) {
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: requestBody,
  };

  try {
    const response = await axios(
      "https://do.pishock.com/api/apioperate/",
      requestOptions
    );
    return response.data;
  } catch (error) {
    console.error("Error in postRequest:", error);
    throw error;
  }
}

// Checks if Device is Active:
// (from an activity in game) => piChecking
// (from a Shock event in game) => handlePiShockPostLevels

// {"action": "activityEvent", "assetGroupName": "ItemNeck", "actionName": "ShockLow", "assetName": "PetSuitShockCollar"}

function handlePiActivityEvent(data) {
  for (const key in ListPiEnabled) {
    if (ListPiEnabled[key] === true && PiSettings[key].isEnabled === true) {
      let LocationOfActivity = data.assetGroupName;

      const shockLevelNameMap = ["ShockLow", "ShockMed", "ShockHigh"];

      let ItemLevel = shockLevelNameMap.indexOf(data.actionName);
      if (ItemLevel != -1) {
        // shock
        handlePiShockPostLevels(key, LocationOfActivity, ItemLevel, 0);
        handlePiShockPostLevels(key, LocationOfActivity, ItemLevel, 1);
      } else {
        // activity
        let ItemUsed = data.assetName;
        piChecking(key, ItemUsed, LocationOfActivity);
      }
    }
  }
}

// Make sure the Item used is a ShockWand or CattleProd => handlePiShockPost
function piChecking(settingsToCheck, itemUsed, locationOfActivity) {
  if (itemUsed === "ShockWand" || itemUsed === "CattleProd") {
    handlePiShockPost(settingsToCheck, locationOfActivity, itemUsed, 1); // Vibrate
    handlePiShockPost(settingsToCheck, locationOfActivity, itemUsed, 0); // Shock
  }
}

// Matches Activity to Settings from JSON
function handlePiShockPost(
  settingsToCheck,
  locationOfActivity,
  itemUsed,
  operation
) {
  const intensityKey = operation === 1 ? "Vibrate" : "Shock";
  const cEnabled = operation === 1 ? "VEnabled" : "SEnabled";
  const maxKey = operation === 1 ? "VibrateMaxInput" : "ShockMaxInput";

  if (PiSettings[settingsToCheck][cEnabled] === true) {
    let amountFromSettings =
      PiSettings[settingsToCheck][intensityKey][locationOfActivity][itemUsed]
        .Amount;
    const maxAmount = PiSettings[settingsToCheck][maxKey];

    if (isValidNumber(amountFromSettings) && isValidNumber(maxAmount)) {
      const usernamePi = MainSettingsPi.PiShock.Username;
      const apiPi = MainSettingsPi.PiShock.APIKey;
      const shareCodePi = PiSettings[settingsToCheck].ShareCode;
      const durationPi =
        PiSettings[settingsToCheck][intensityKey][locationOfActivity][itemUsed]
          .Duration;

      if (amountFromSettings > maxAmount) {
        amountFromSettings = maxAmount;
      }

      const piPostData = {
        Username: usernamePi,
        Name: "BCBridge",
        Code: shareCodePi,
        Intensity: amountFromSettings,
        Duration: durationPi,
        Apikey: apiPi,
        Op: operation,
      };
      PiShockPost(piPostData);
    }
  }
}

// Matches the levels from BC to preset settings => PiShockPost
// No Error handler here
function handlePiShockPostLevels(
  settingsToCheck,
  locationOfActivity,
  ItemLevel,
  operation
) {
  const cEnabled = operation === 1 ? "VEnabled" : "SEnabled";
  const intensityKey = operation === 1 ? "Vibrate" : "Shock";
  const maxKey = operation === 1 ? "VibrateMaxInput" : "ShockMaxInput";
  if (PiSettings[settingsToCheck][cEnabled] === true) {
    let amountFromSettings =
      PiSettings[settingsToCheck][intensityKey][locationOfActivity][
        `level${ItemLevel}`
      ].Amount;
    const maxAmount = PiSettings[settingsToCheck][maxKey];
    if (isValidNumber(amountFromSettings) && isValidNumber(maxAmount)) {
      const usernamePi = MainSettingsPi.PiShock.Username;
      const apiPi = MainSettingsPi.PiShock.APIKey;
      const shareCodePi = PiSettings[settingsToCheck].ShareCode;
      const durationPi =
        PiSettings[settingsToCheck][intensityKey][locationOfActivity][
          `level${ItemLevel}`
        ].Duration;

      if (amountFromSettings > maxAmount) {
        amountFromSettings = maxAmount;
      }

      const piPostData = {
        Username: usernamePi,
        Name: "BCBridge",
        Code: shareCodePi,
        Intensity: amountFromSettings,
        Duration: durationPi,
        Apikey: apiPi,
        Op: operation,
      };

      PiShockPost(piPostData);
    }
  }
}

// Post a request to postRequest
function PiShockPost(data) {
  postRequest(data)
    .then((data) => sendMessageToRenderer("toast", data, "#475569"))
    .catch((error) => sendMessageToRenderer("toast", error, "#7B0000"));
}

let fileQueueWorker = async.queue(function (task, callback) {
  const { operation, filePath, data } = task;

  if (operation === "update-pi") {
    const fullPath = path.join(process.cwd(), "settings", "allpi.json");
    fs.readFile(fullPath, "utf8", (err, fileData) => {
      if (err) {
        console.error(err);
        callback(err);
        return;
      }

      const jsonData = JSON.parse(fileData);
      for (const key in data) {
        jsonData[key] = data[key];
      }

      const updatedData = JSON.stringify(jsonData, null, 2);
      fs.writeFile(fullPath, updatedData, "utf8", (err) => {
        if (err) {
          console.error(err);
          callback(err);
          return;
        }

        console.log(`Data written to ${fullPath}`);
        callback(null);
      });
    });
  } else if (operation === "read") {
    fs.readFile(filePath, "utf8", (err, fileData) => {
      if (err) {
        console.error("Read error:", err);
        callback(err);
        return;
      }

      console.log("File read:", filePath);
      console.log("Data:", fileData);
      callback(null, fileData);
    });
  } else if (operation === "write") {
    fs.writeFile(filePath, data, "utf8", (err) => {
      if (err) {
        console.error("Write error:", err);
        callback(err);
        return;
      }
      console.log("File written:", filePath);
      callback(null);
    });
  } else {
    console.error("Invalid operation:", operation);
    callback(new Error("Invalid operation"));
  }
}, 1);

//#region XTOYS

function xtoysSendRequest(operation) {
  xtoyssocket.broadcast(JSON.stringify(operation));
}

// (XTOYS) Search Loaded JSON Activities for Actions from BC and get Amount and Duration
// (XTOYS) On Missing Activity call updateJsonFile
function xtoy_handleActivityEvent(data) {
  const bodypart = data.assetGroupName;
  const item = data.assetName;
  const action = data.actionName;
  let filename;
  let dirname = data.assetGroupName;
  let localData;
  localData = Merged[bodypart];
  if (item === "none") {
    filename = action;
    let AmountAndDuration;
    AmountAndDuration = localData[action];
    if (AmountAndDuration == undefined) {
      AmountAndDuration = localData.Default;
      Merged[bodypart][action] = AmountAndDuration;
      updateJsonFile(bodypart, data, AmountAndDuration);
    }
    xtoys_sendPreQ(bodypart, AmountAndDuration, dirname, filename);
  } else {
    filename = action + item;
    let missingdata = false;
    if (!localData[action]) {
      missingdata = true;
      localData[action] = {};
    }
    if (!localData[action][item]) {
      missingdata = true;
      localData[action][item] = {};
    }
    if (missingdata === true) {
      AmountAndDuration = localData.Default;
      Merged[bodypart][action][item] = AmountAndDuration;
      xtoys_sendPreQ(bodypart, AmountAndDuration, dirname, filename);
      updateJsonFile(bodypart, data, AmountAndDuration);
    } else {
      let ActionName = localData[action];
      let AmountAndDuration = ActionName[item];
      xtoys_sendPreQ(bodypart, AmountAndDuration, dirname, filename);
    }
  }
}
// (XTOYS) Pre Q
function xtoys_sendPreQ(bodypart, AmountAndDuration, dir, path) {
  console.log("------ pre Q Xtoys ------");
  console.log(bodypart);
  console.log(AmountAndDuration);
  console.log(dir);
  console.log(path);
  console.log("------ pre Q Xtoys ------");

  if (AmountAndDuration.FunScript === true) {
    Queue_Vibr_xtoys.push({
      part: bodypart,
      intensity: AmountAndDuration.Amount,
      timeout: AmountAndDuration.Duration,
      funscript: true,
      funscriptdir: dir,
      funscriptpath: path,
    });
  } else {
    Queue_Vibr_xtoys.push({
      part: bodypart,
      intensity: AmountAndDuration.Amount,
      timeout: AmountAndDuration.Duration,
    });
  }
}
// (XTOYS) Queue_Vibr_xtoys
let Queue_Vibr_xtoys = async.queue(async function (task) {
  if (task.funscript === true) {
    console.log(
      `Performing Fun Script: ${task.part} Dir: ${task.funscriptdir} Funscript: ${task.funscriptpath}`
    );
    const filePath = path.join(
      process.cwd(),
      "funscripts/" + task.funscriptdir,
      task.funscriptpath + ".funscript"
    );
    console.log(filePath);
    const funscriptData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const actions = funscriptData.actions;
    // Run the Funscript
    console.log("Running Funscript...");
    let lastActionTime = 0;
    for (const action of actions) {
      const currentTime = action.at;
      const position = action.pos;

      // Calculate sleep duration based on the timestamp difference
      const sleepDuration = currentTime - lastActionTime;

      // Wait for the sleep duration
      await new Promise((resolve) => setTimeout(resolve, sleepDuration));

      // Move all connected devices to the target position
      let currentValue = xtoyValues[task.part];
      let newValue = currentValue + position;
      let minValue = xtoyminValues[task.part];

      if (currentValue < 0) {
        xtoyValues[task.part] = 0;
      }
      if (minValue < 0) {
        xtoyminValues[task.part] = 0;
      }

      let temp1 = minValue + newValue;
      temp1 = Math.min(temp1, 100);

      xtoysSendRequest({ [task.part]: temp1 });

      console.log(position);
      console.log(action.at);

      lastActionTime = currentTime;
    }

    console.log("Finished running Funscript.");
  } else {
    console.log(
      `Performing task: ${task.part} intensity: ${task.intensity} Delay: ${task.timeout}`
    );
    console.log("----------------------------------");

    let currentValue = xtoyValues[task.part];
    let newValue = currentValue + task.intensity;
    let minValue = xtoyminValues[task.part];

    if (currentValue < 0) {
      xtoyValues[task.part] = 0;
    }
    if (minValue < 0) {
      xtoyminValues[task.part] = 0;
    }

    xtoyValues[task.part] = newValue;

    let temp1 = minValue + newValue;
    temp1 = Math.min(temp1, 100);

    xtoysSendRequest({ [task.part]: temp1 });

    await new Promise((resolve) => {
      setTimeout(() => {
        let currentValue = xtoyValues[task.part];
        let minValue = xtoyminValues[task.part];
        let newValue = currentValue - task.intensity;
        xtoyValues[task.part] = newValue;

        let temp1 = minValue + newValue;
        temp1 = Math.min(temp1, 100);

        xtoysSendRequest({ [task.part]: temp1 });

        resolve();
      }, task.timeout + 500);
    });
  }
}, 150);

// (XTOYS) Search Loaded JSON Activities for Actions from BC and get Amount and Duration
// (XTOYS) On Missing Activity call updateJsonFile
function xtoy_handleActivityOnOtherEvent(data) {
  let filename;
  const item = data.assetName;
  const action = data.actionName;
  let localData = Merged.activityOnOtherEvent;
  if (item === "none") {
    //this is where head pats and cuddles are
  } else if (validAssetNameOnOther.includes(item)) {
    filename = action + item;
    // Items match the JSON data
    // Target Location (assetGroupName) >> assetName >> actionName
    let Default = localData.Default;
    let missingdata = false;
    // Check if the asset group exists
    if (!localData[data.assetGroupName]) {
      localData[data.assetGroupName] = {};
      missingdata = true;
    }
    // Check if the item exists within the asset group
    if (!localData[data.assetGroupName][item]) {
      localData[data.assetGroupName][item] = {};
      missingdata = true;
    }
    // Check if the action exists within the item
    if (!localData[data.assetGroupName][item][action]) {
      localData[data.assetGroupName][item][action] = Default;
      missingdata = true;
    }

    if (missingdata === true) {
      let AmountAndDuration = localData.Default;
      Object.assign(Merged.activityOnOtherEvent, localData);
      updateJsonFile("activityOnOther", data, AmountAndDuration);
    } else {
      let AmountAndDuration =
        localData[data.assetGroupName][item][data.actionName];
      if (AmountAndDuration == undefined) {
        AmountAndDuration = localData.Default;
        Merged.activityOnOtherEvent[data.assetGroupName][item][
          data.actionName
        ] = AmountAndDuration;
        updateJsonFile("activityOnOther", data, AmountAndDuration);
      }
      xtoys_sendPreQ(
        "activityOnOtherEvent",
        AmountAndDuration,
        "activityOnOtherEvent/" + data.assetGroupName,
        filename
      );
    }
  }
}
// (XTOYS) If Toy is removed in game it will send 0 to BP
function xtoy_handleToyRemoveEvent(data) {
  const bodypart = data.assetGroupName;
  xtoy_sendPreQToyMin(bodypart, 0);
}
// (XTOYS) Search Loaded JSON for Toy values and updated the Min on slot
function xtoy_handleToyEvent(data) {
  const bodypart = data.assetGroupName;
  let localData;
  localData = Merged[bodypart];
  if (data.level === 0) {
    xtoy_sendPreQToyMin(bodypart, 0);
  } else if (data.level === 1) {
    xtoy_sendPreQToyMin(bodypart, localData.Toys.low);
  } else if (data.level === 2) {
    xtoy_sendPreQToyMin(bodypart, localData.Toys.medium);
  } else if (data.level === 3) {
    xtoy_sendPreQToyMin(bodypart, localData.Toys.high);
  } else if (data.level === 4) {
    xtoy_sendPreQToyMin(bodypart, localData.Toys.max);
  }
}
// (XTOYS) Updates the Slot Min
function xtoy_sendPreQToyMin(bodypart, minValue) {
  xtoyminValues[bodypart] = minValue;
  Queue_Vibr_xtoys.push({
    part: bodypart,
    intensity: 0,
    timeout: 10,
  });
}

function xtoy_handleToyAddEvent(data) {
  const bodypart = data.assetGroupName;
  const item = data.assetName;
  let filename;
  let dirname = data.assetGroupName;
  let localData;
  localData = Merged[bodypart].ItemAdded;
  filename = "ItemAdded" + item;
  if (localData === undefined) {
    Merged[bodypart].ItemAdded = {};
    localData = Merged[bodypart].ItemAdded;
  }
  if (!localData[item]) {
    localData[item] = {
      Amount: 0,
      Duration: 1000,
      FunScript: false,
    };
    sendPreQ(bodypart, localData[item], dirname, filename);
    updateJsonFile_ItemAdded(bodypart, data);
  } else {
    xtoys_sendPreQ(bodypart, localData[item], dirname, filename);
  }
}

//#endregion

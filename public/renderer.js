const socket = new WebSocket("ws://localhost:3000");

//TODO updateFloatTitle with the correct page title

let currentFile = "ItemNeck.json";
let currentJsonPage = 0;
let alternator = 1;
let bgcolor = "bg-gray-900";
let PageName = "home";
let subPage = "";
let mainFile = "";
let vibeFile = "";
let shockFile = "";
let pipage = 1;
let searchResults = [];
let currentSearchIndex = 0;
let lastSearchQuery = "";
let currentIndex = 0;
const messageQueue = [];

socket.addEventListener("open", (event) => {
  // WebSocket connection is now open. You can send messages using socket.send(...)
  while (messageQueue.length > 0) {
    const message = messageQueue.shift();
    socket.send(JSON.stringify(message));
  }
});

socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  console.log(event.data);

  if (data.type === "ServerStatus") {
    if (data.message === "online-main") {
      document.getElementById("mainConnectStatus").className =
        "w-6 h-6 bg-green-700 rounded-full";
      document.getElementById("mainConnectStatus_p").innerText = "Online";
    } else if (data.message === "offline-main") {
      document.getElementById("mainConnectStatus").className =
        "w-6 h-6 bg-red-700 rounded-full";
      document.getElementById("mainConnectStatus_p").innerText = "Offline";
    } else if (data.message === "online-plug") {
      document.getElementById("PlugConnectStatus").className =
        "w-6 h-6 bg-green-700 rounded-full";
      document.getElementById("PlugConnectStatus_p").innerText = "Online";
    } else if (data.message === "offline-plug") {
      document.getElementById("PlugConnectStatus").className =
        "w-6 h-6 bg-red-700 rounded-full";
      document.getElementById("PlugConnectStatus_p").innerText = "Offline";
    } else if (data.message === "online-xtoys") {
      document.getElementById("xToyConnectStatus").className =
        "w-6 h-6 bg-green-700 rounded-full";
      document.getElementById("xToyConnectStatus_p").innerText = "Online";
    } else if (data.message === "offline-xtoys") {
      document.getElementById("xToyConnectStatus").className =
        "w-6 h-6 bg-red-700 rounded-full";
      document.getElementById("xToyConnectStatus_p").innerText = "Offline";
    }
  }

  if (data.type === "toast") {
    //console.log("Message received:", arg);
    showToast(data.message, "#fff", data.color);
  }
  if (data.type === "synctoy") {
    // console.log("Message received:", arg);
    showToast("Receaved Toys List from Intiface Central", "#fff", "#008E2C");
    const devices = data.message;
    populateDropdowns(devices);
  }
});

function sendWebSocketMessage(type, payload) {
  const message = { type, ...payload };
  console.log("Sending WebSocket message:", message); // Add this line

  if (socket.readyState === WebSocket.CONNECTING) {
    messageQueue.push(message);
  } else {
    socket.send(JSON.stringify(message));
  }
}

function requestJsonData(file) {
  return new Promise((resolve) => {
    const requestId = Date.now();
    sendWebSocketMessage("read-json", { file, requestId });

    function handleResponse(event) {
      const data = JSON.parse(event.data);
      if (data.type === "read-json-response" && data.requestId === requestId) {
        socket.removeEventListener("message", handleResponse);
        resolve(data.data);
      }
    }
    socket.addEventListener("message", handleResponse);
  });
}

async function init() {
  loadSettings();
  showHomePage();
  sendWebSocketMessage("req-all-status", "");

  document
    .getElementById("search-input")
    .addEventListener("keydown", async (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const currentSearchQuery = event.target.value;
        if (
          searchResults.length === 0 ||
          currentSearchQuery !== lastSearchQuery
        ) {
          lastSearchQuery = currentSearchQuery;
          await search();
        }
        nextResult();
      }
    });

  document.getElementById("search-button").addEventListener("click", search);

  document.getElementById("next-button").addEventListener("click", async () => {
    const currentSearchQuery = document.getElementById("search-input").value;
    if (searchResults.length === 0 || currentSearchQuery !== lastSearchQuery) {
      lastSearchQuery = currentSearchQuery;
      await search();
    }
    nextResult();
  });

  document
    .getElementById("previous-button")
    .addEventListener("click", async () => {
      const currentSearchQuery = document.getElementById("search-input").value;
      if (
        searchResults.length === 0 ||
        currentSearchQuery !== lastSearchQuery
      ) {
        lastSearchQuery = currentSearchQuery;
        await search();
      }
      previousResult();
    });

  document.getElementById("back-to-top").addEventListener("click", backToTop);

  document.getElementById("VibratePITest").addEventListener("click", () => {
    //test PIShock Vibrate
    let TestSettings = {
      Username: document.getElementById("PiShockUsername").value,
      Name: "BCBridge",
      Code: document.getElementById("ShookShareCode").value,
      Intensity: document.getElementById("VibrateMaxInput").value,
      Duration: 1,
      Apikey: document.getElementById("PiShockAPIKey").value,
      Op: 1,
    };
    socket.send(
      JSON.stringify({
        type: "test-pi",
        json: TestSettings,
      })
    );
  });
  document.getElementById("ShockPiTest").addEventListener("click", () => {
    //test PIShock Shock
    let TestSettings = {
      Username: document.getElementById("PiShockUsername").value,
      Name: "BCBridge",
      Code: document.getElementById("ShookShareCode").value,
      Intensity: document.getElementById("ShockMaxInput").value,
      Duration: 1,
      Apikey: document.getElementById("PiShockAPIKey").value,
      Op: 0,
    };
    socket.send(
      JSON.stringify({
        type: "test-pi",
        json: TestSettings,
      })
    );
  });
  //#region Listener for Pi
  document.getElementById("py1-button").addEventListener("click", () => {
    currentJsonPage = 3;
    subPage = "";
    pipage = 1;
    pideviceheader.innerText = "Pi Shock 1";
    setTabsColorPY("py1-button");
    loadJson("pi1.json");
    updateFloatTitle("Pi Shock 1");
    updateFloatSubTitle("");
  });

  document.getElementById("py2-button").addEventListener("click", () => {
    currentJsonPage = 3;
    subPage = "";
    pipage = 2;
    pideviceheader.innerText = "Pi Shock 2";
    setTabsColorPY("py2-button");
    loadJson("pi2.json");
    updateFloatTitle("Pi Shock 2");
    updateFloatSubTitle("");
  });

  document.getElementById("py3-button").addEventListener("click", () => {
    currentJsonPage = 3;
    subPage = "";
    pipage = 3;
    pideviceheader.innerText = "Pi Shock 3";
    setTabsColorPY("py3-button");
    loadJson("pi3.json");
    updateFloatTitle("Pi Shock 3");
    updateFloatSubTitle("");
  });

  document.getElementById("py4-button").addEventListener("click", () => {
    currentJsonPage = 3;
    subPage = "";
    pipage = 4;
    pideviceheader.innerText = "Pi Shock 4";
    setTabsColorPY("py4-button");
    loadJson("pi4.json");
    updateFloatTitle("Pi Shock 4");
    updateFloatSubTitle("");
  });

  document.getElementById("py5-button").addEventListener("click", () => {
    currentJsonPage = 3;
    subPage = "";
    pipage = 5;
    pideviceheader.innerText = "Pi Shock 5";
    setTabsColorPY("py5-button");
    loadJson("pi5.json");
    updateFloatTitle("Pi Shock 5");
    updateFloatSubTitle("");
  });

  document.getElementById("py6-button").addEventListener("click", () => {
    currentJsonPage = 3;
    subPage = "";
    pipage = 5;
    pideviceheader.innerText = "Pi Shock 6";
    setTabsColorPY("py6-button");
    loadJson("pi6.json");
    updateFloatTitle("Pi Shock 6");
    updateFloatSubTitle("");
  });

  document.getElementById("py7-button").addEventListener("click", () => {
    currentJsonPage = 3;
    subPage = "";
    pipage = 7;
    pideviceheader.innerText = "Pi Shock 7";
    setTabsColorPY("py7-button");
    loadJson("pi7.json");
    updateFloatTitle("Pi Shock 7");
    updateFloatSubTitle("");
  });

  document.getElementById("py8-button").addEventListener("click", () => {
    currentJsonPage = 3;
    subPage = "";
    pipage = 8;
    pideviceheader.innerText = "Pi Shock 8";
    setTabsColorPY("py8-button");
    loadJson("pi8.json");
    updateFloatTitle("Pi Shock 8");
    updateFloatSubTitle("");
  });
  //#endregion

  document.getElementById("all-json-button").addEventListener("click", () => {
    setNavColor("all-json-button");
    currentJsonPage = 1;
    showJsonPage();
    preheaderJson.innerHTML =
      '<img src="./imgs/actions.svg" height="20" width="20"></img>';
    headerJson.innerHTML = '<h2 class="text-2xl font-bold mb-4">Actions</h2>';
    loadJson("ItemNeck.json");
    setTabsColorIntiface("ItemNeck-button");
    document.getElementById("sub-nav").style = "";
    document.getElementById("sub-nav-shook").style = "display: none";
    document.getElementById("sub-nav-shook-2").style = "display: none";
    updateFloatTitle("Actions");
    updateFloatSubTitle("ItemNeck");
  });

  document.getElementById("copy-button").addEventListener("click", function () {
    copyText();

    // Optional: Display a message or provide feedback to the user
    //alert("Text copied to clipboard!");
  });
  async function copyText() {
    const input = document.getElementById("text-to-copy");
    const text = input.value;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Text copied to clipboard!", "#fff", "#008E2C");
    } catch (err) {
      showToast("Error: Unable to copy text", "#fff", "#7B0000");
    }
  }

  document.getElementById("all-json-button2").addEventListener("click", () => {
    setNavColor("all-json-button2");
    currentJsonPage = 2;
    showJsonPage();
    preheaderJson.innerHTML =
      '<img src="./imgs/actions.svg" height="20" width="20"></img>';
    headerJson.innerHTML =
      '<h2 class="text-2xl font-bold mb-4">Actions 2b</h2>';
    loadJson("s_ItemNeck.json");
    document.getElementById("sub-nav").style = "";
    document.getElementById("sub-nav-shook").style = "display: none";
    document.getElementById("sub-nav-shook-2").style = "display: none";
  });

  document.getElementById("shook-button").addEventListener("click", () => {
    setNavColor("shook-button");
    currentJsonPage = 3;
    subPage = "";
    pipage = 1;
    showJsonPage();
    preheaderJson.innerHTML =
      '<img src="./imgs/pishock.svg" height="20" width="20"></img>';
    headerJson.innerHTML = '<h2 class="text-2xl font-bold mb-4">Pi Shock</h2>';
    pideviceheader.innerText = "Pi Shock 1";
    loadJson("pi1.json");
    setTabsColorPY("py1-button");
    document.getElementById("sub-nav").style = "display: none";
    document.getElementById("sub-nav-shook").style = "";
    document.getElementById("sub-nav-shook-2").style = "";
    updateFloatTitle("Pi Shock 1");
    updateFloatSubTitle("");
  });

  document.getElementById("LoadVibe").addEventListener("click", () => {
    currentJsonPage = 3;
    subPage = "vibe";
    loadJson(currentFile);
    updateFloatSubTitle("Vibrate");
  });

  document.getElementById("LoadShock").addEventListener("click", () => {
    currentJsonPage = 3;
    subPage = "shock";
    loadJson(currentFile);
    updateFloatSubTitle("Shock");
  });

  document.getElementById("home-button").addEventListener("click", () => {
    setNavColor("home-button");
    loadSettings();
    showHomePage();
  });

  //#region Listeners for PBIO
  document.getElementById("ItemNeck-button").addEventListener("click", () => {
    if (currentJsonPage == 1) {
      loadJson("ItemNeck.json");
      updateFloatTitle("Actions");
      updateFloatSubTitle("ItemNeck");
    } else if (currentJsonPage == 2) {
      loadJson("s_ItemNeck.json");
    }
    setTabsColorIntiface("ItemNeck-button");
  });
  document.getElementById("ItemArms-button").addEventListener("click", () => {
    if (currentJsonPage == 1) {
      loadJson("ItemArms.json");
      updateFloatTitle("Actions");
      updateFloatSubTitle("ItemArms");
    } else if (currentJsonPage == 2) {
      loadJson("s_ItemArms.json");
    }
    setTabsColorIntiface("ItemArms-button");
  });

  document
    .getElementById("ItemNipplesPiercings-button")
    .addEventListener("click", () => {
      if (currentJsonPage == 1) {
        loadJson("ItemNipplesPiercings.json");
        updateFloatTitle("Actions");
        updateFloatSubTitle("ItemNipplesPiercings");
      } else if (currentJsonPage == 2) {
        loadJson("s_ItemNipplesPiercings.json");
      }
      setTabsColorIntiface("ItemNipplesPiercings-button");
    });

  document
    .getElementById("ItemNipples-button")
    .addEventListener("click", () => {
      if (currentJsonPage == 1) {
        loadJson("ItemNipples.json");
        updateFloatTitle("Actions");
        updateFloatSubTitle("ItemNipples");
      } else if (currentJsonPage == 2) {
        loadJson("s_ItemNipples.json");
      }
      setTabsColorIntiface("ItemNipples-button");
    });
  document.getElementById("ItemBreast-button").addEventListener("click", () => {
    if (currentJsonPage == 1) {
      loadJson("ItemBreast.json");
      updateFloatTitle("Actions");
      updateFloatSubTitle("ItemBreast");
    } else if (currentJsonPage == 2) {
      loadJson("s_ItemBreast.json");
    }
    setTabsColorIntiface("ItemBreast-button");
  });
  document.getElementById("ItemVulva-button").addEventListener("click", () => {
    if (currentJsonPage == 1) {
      loadJson("ItemVulva.json");
      updateFloatTitle("Actions");
      updateFloatSubTitle("ItemVulva");
    } else if (currentJsonPage == 2) {
      loadJson("s_ItemVulva.json");
    }
    setTabsColorIntiface("ItemVulva-button");
  });
  document
    .getElementById("ItemVulvaPiercings-button")
    .addEventListener("click", () => {
      if (currentJsonPage == 1) {
        loadJson("ItemVulvaPiercings.json");
        updateFloatTitle("Actions");
        updateFloatSubTitle("ItemVulvaPiercings");
      } else if (currentJsonPage == 2) {
        loadJson("s_ItemVulvaPiercings.json");
      }
      setTabsColorIntiface("ItemVulvaPiercings-button");
    });
  document.getElementById("ItemButt-button").addEventListener("click", () => {
    if (currentJsonPage == 1) {
      loadJson("ItemButt.json");
      updateFloatTitle("Actions");
      updateFloatSubTitle("ItemButt");
    } else if (currentJsonPage == 2) {
      loadJson("s_ItemButt.json");
    }
    setTabsColorIntiface("ItemButt-button");
  });
  document.getElementById("ItemLegs-button").addEventListener("click", () => {
    if (currentJsonPage == 1) {
      loadJson("ItemLegs.json");
      updateFloatTitle("Actions");
      updateFloatSubTitle("ItemLegs");
    } else if (currentJsonPage == 2) {
      loadJson("s_ItemLegs.json");
    }
    setTabsColorIntiface("ItemLegs-button");
  });
  document.getElementById("ItemFeet-button").addEventListener("click", () => {
    if (currentJsonPage == 1) {
      loadJson("ItemFeet.json");
      updateFloatTitle("Actions");
      updateFloatSubTitle("ItemFeet");
    } else if (currentJsonPage == 2) {
      loadJson("s_ItemFeet.json");
    }
    setTabsColorIntiface("ItemFeet-button");
  });
  document.getElementById("ItemBoots-button").addEventListener("click", () => {
    if (currentJsonPage == 1) {
      loadJson("ItemBoots.json");
      updateFloatTitle("Actions");
      updateFloatSubTitle("ItemBoots");
    } else if (currentJsonPage == 2) {
      loadJson("s_ItemBoots.json");
    }
    setTabsColorIntiface("ItemBoots-button");
  });
  document
    .getElementById("ItemDevices-button")
    .addEventListener("click", () => {
      if (currentJsonPage == 1) {
        loadJson("ItemDevices.json");
        updateFloatTitle("Actions");
        updateFloatSubTitle("ItemDevices");
      } else if (currentJsonPage == 2) {
        loadJson("s_ItemDevices.json");
      }
      setTabsColorIntiface("ItemDevices-button");
    });

  document.getElementById("ItemPelvis-button").addEventListener("click", () => {
    if (currentJsonPage == 1) {
      loadJson("ItemPelvis.json");
      updateFloatTitle("Actions");
      updateFloatSubTitle("ItemPelvis");
    } else if (currentJsonPage == 2) {
      loadJson("s_ItemPelvis.json");
    }
    setTabsColorIntiface("ItemPelvis-button");
  });

  document
    .getElementById("activityOnOther-button")
    .addEventListener("click", () => {
      if (currentJsonPage == 1) {
        loadJson("activityOnOtherEvent.json");
        updateFloatTitle("Actions");
        updateFloatSubTitle("activityOnOtherEvent");
      } else if (currentJsonPage == 2) {
        loadJson("s_activityOnOtherEvent.json");
      }
      setTabsColorIntiface("activityOnOther-button");
    });
  //#endregion
  document.getElementById("save").addEventListener("click", save);
  document.getElementById("about-button").addEventListener("click", () => {
    setNavColor("about-button");
    showAboutPage();
  });
  document.getElementById("logsBtn").addEventListener("click", () => {
    setNavColor("logsBtn");
    showLogsPage();
  });

  document
    .getElementById("IntifaceEnabled")
    .addEventListener("change", saveSettings);
  document
    .getElementById("xToyEnabled")
    .addEventListener("change", saveSettings);
  document
    .getElementById("Local2BEnabled")
    .addEventListener("change", saveSettings);
  document
    .getElementById("PiShockEnabled")
    .addEventListener("change", saveSettings);
  document
    .getElementById("plug-settings-button")
    .addEventListener("click", () => {
      setNavColor("plug-settings-button");
      showPlugSettingsPage();
    });

  document
    .getElementById("local-settings-button")
    .addEventListener("click", () => {
      setNavColor("local-settings-button");
      showLocalSettingsPage();
    });

  document
    .getElementById("mainStart")
    .addEventListener("click", startWebSocketServer);
  document
    .getElementById("mainStop")
    .addEventListener("click", closeWebSocketServer);

  document
    .getElementById("PlugConnect")
    .addEventListener("click", () => msgToMain("bpio", "bp-io-start"));

  document
    .getElementById("PlugDisconnect")
    .addEventListener("click", () => msgToMain("bpio", "bp-io-stop"));

  document.getElementById("PlugSync").addEventListener("click", SyncToys);

  document
    .getElementById("xToyConnect")
    .addEventListener("click", () => msgToMain("xtoy", "xtoy-start"));

  document
    .getElementById("xToyDisconnect")
    .addEventListener("click", () => msgToMain("xtoy", "xtoy-stop"));

  document
    .getElementById("updateserver")
    .addEventListener("click", async () => {
      await save();
      msgToMain("UpdateSettings", "Update");
    });
}

function startWebSocketServer() {
  socket.send(
    JSON.stringify({
      type: "start-ws",
      file: "Request to start WebSocket server",
    })
  );
}

function closeWebSocketServer() {
  socket.send(
    JSON.stringify({
      type: "close-ws",
      file: "Request to close WebSocket server",
    })
  );
}

function SyncToys() {
  //showPlugSettingsPage();
  //console.log("Syncing toys");
  msgToMain("bpiows", '[{"RequestDeviceList":{"Id":2}}]');
}

function populateDropdowns(deviceList) {
  const dropdownIds = [
    "ItemNeck",
    "ItemArms",
    "ItemNipplesPiercings",
    "ItemNipples",
    "ItemBreast",
    "ItemVulva",
    "ItemVulvaPiercings",
    "ItemButt",
    "ItemPelvis",
    "ItemLegs",
    "ItemFeet",
    "ItemBoots",
    "ItemDevices",
    "activityOnOther",
  ];

  for (const dropdownId of dropdownIds) {
    const dropdown = document.getElementById(dropdownId);
    // Clear the current options in the dropdown
    dropdown.innerHTML = "";

    const option = document.createElement("option");
    option.value = "none";
    option.textContent = "None";
    dropdown.appendChild(option);

    // Loop through the deviceList array
    deviceList.forEach((device) => {
      // Create an option element for each device
      const option = document.createElement("option");
      option.value = device.DeviceIndex;
      option.textContent = device.DeviceName;

      // Add the option to the dropdown
      dropdown.appendChild(option);
    });
  }
}

async function save() {
  const jsonDataPage = document.getElementById("json-data");
  if (PageName === "home") {
    addLogEntry("-- Saving Main Page --");
    saveSettings();
  } else if (PageName === "json-page") {
    if (currentJsonPage !== 3) {
      addLogEntry("-- Saving Actions Page --");
    }
    // Only consider input elements within the json-data container
    const inputs = jsonDataPage.querySelectorAll("input");
    const newData = {};
    inputs.forEach((input) => {
      const keys = input.id.split(".");
      const tree = input.id;
      let current = newData;

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key.includes("Amount") && input.value > 100) {
          showToast(tree + " is over 100", "#fff", "#7B0000");
          addLogEntry(tree + " is over 100");
        } else if (key.includes("Amount") && input.value < 0) {
          showToast(tree + " is lower than 0", "#fff", "#7B0000");
          addLogEntry(tree + " is lower than 0");
        }

        if (key.includes("Duration") && input.value > 30000) {
          showToast(tree + " is over 30 Seconds", "#fff", "#7B0000");
          addLogEntry(tree + " is over 30 Seconds");
        } else if (key.includes("Duration") && input.value < 0) {
          showToast(tree + " is lower than 0", "#fff", "#7B0000");
          addLogEntry(tree + " is lower than 0");
        }
        if (i === keys.length - 1) {
          if (input.type === "checkbox") {
            current[key] = input.checked;
          } else {
            current[key] = parseInt(input.value, 10);
          }
        } else {
          if (!current[key]) {
            current[key] = {};
          }
          current = current[key];
        }
      }
    });

    if (currentJsonPage == 3) {
      addLogEntry("-- Saving PiShock page --");
      let mainData = {
        isEnabled: document.getElementById("deviceEnable").checked,
        ShareCode: document.getElementById("ShookShareCode").value,
        VibrateMaxInput: parseInt(
          document.getElementById("VibrateMaxInput").value
        ),
        ShockMaxInput: parseInt(document.getElementById("ShockMaxInput").value),
        SEnabled: document.getElementById("ShookdeviceEnable").checked,
        VEnabled: document.getElementById("VibdeviceEnable").checked,
      };
      socket.send(
        JSON.stringify({
          type: "write-json",
          file: mainFile,
          json: mainData,
        })
      );
      const deviceEnableCheckbox = document.getElementById("deviceEnable");
      let HomePagePi = {
        [pipage]: deviceEnableCheckbox.checked,
      };
      socket.send(
        JSON.stringify({
          type: "write-json-pi",
          json: HomePagePi,
        })
      );
    }
    if (currentJsonPage == 3 && subPage == "vibe") {
      socket.send(
        JSON.stringify({
          type: "write-json",
          file: vibeFile,
          json: newData,
        })
      );
    } else if (currentJsonPage == 3 && subPage == "shock") {
      socket.send(
        JSON.stringify({
          type: "write-json",
          file: shockFile,
          json: newData,
        })
      );
    } else if (currentJsonPage == 3 && subPage == "") {
    } else {
      socket.send(
        JSON.stringify({
          type: "write-json",
          file: currentFile,
          json: newData,
        })
      );
    }
    addLogEntry("-- Saved --");
  } else if (PageName === "plug-settings") {
    addLogEntry("-- Saving Intiface Toys Page --");
    const inputs = document.querySelectorAll("#plug-settings select");
    const newData = {};

    inputs.forEach((input) => {
      const label = input.id;
      newData[label] = input.value;
    });
    socket.send(
      JSON.stringify({
        type: "write-json",
        file: "settingspage.json",
        json: newData,
      })
    );

    // alert('Plug settings saved.');
    addLogEntry("-- Saved Intiface Toys Page --");
  } else if (PageName === "local-settings") {
    const inputs = document.querySelectorAll("#local-settings select");
    const newData = {};

    inputs.forEach((input) => {
      addLogEntry("-- Saving 2B Local Page --");
      const label = input.previousElementSibling.textContent.replace(":", "");
      newData[label] = input.value;
    });
    socket.send(
      JSON.stringify({
        type: "write-json",
        file: "localsettings.json",
        json: newData,
      })
    );

    addLogEntry("-- Saved 2B Local Page --");
  }
}

function search() {
  const searchText = document.getElementById("search-input").value;
  searchResults = Array.from(
    document.querySelectorAll("#json-data input")
  ).filter((input) =>
    input.id.toLowerCase().includes(searchText.toLowerCase())
  );
  currentSearchIndex = 0;
  if (searchResults.length > 0) {
    scrollToResult(searchResults[currentSearchIndex]);
  } else {
    // alert("No results found.");
  }
}

function scrollToResult(result) {
  result.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function nextResult() {
  if (searchResults.length === 0) {
    await search();
  } else {
    currentIndex++;
    if (currentIndex >= searchResults.length) {
      currentIndex = 0;
    }
    scrollToResult(searchResults[currentIndex]);
  }
}

function backToTop() {
  const contentDiv = document.getElementById("main-content");
  contentDiv.scrollTo({
    top: 0,
    left: 0,
    behavior: "smooth",
  });
}

async function previousResult() {
  if (searchResults.length === 0) {
    await search();
    currentIndex = searchResults.length - 1;
    if (currentIndex >= 0) {
      scrollToResult(searchResults[currentIndex]);
    }
  } else {
    currentIndex--;
    if (currentIndex < 0) {
      currentIndex = searchResults.length - 1;
    }
    scrollToResult(searchResults[currentIndex]);
  }
}
async function loadJson(file) {
  currentFile = file;
  searchResults = []; // Reset search results
  currentResultIndex = -1; // Reset current result index

  mainFile = file.replace("", "main");
  vibeFile = file.replace("", "vibe");
  shockFile = file.replace("", "shock");
  const container = document.getElementById("json-data");
  container.innerHTML = "";
  alternator = 1;
  bgcolor = "bg-gray-900";

  if (currentJsonPage == 3 && subPage == "") {
    document.getElementById("ShookDevice").style = "";

    const Maindata = await requestJsonData(mainFile);
    const ShareCode = document.getElementById("ShookShareCode");
    const VibrateMaxInput = document.getElementById("VibrateMaxInput");
    const ShockMaxInput = document.getElementById("ShockMaxInput");
    const SEnabled = document.getElementById("ShookdeviceEnable");
    const VEnabled = document.getElementById("VibdeviceEnable");
    const isEnabled = document.getElementById("deviceEnable");

    ShareCode.value = Maindata.ShareCode;
    VibrateMaxInput.value = parseInt(Maindata["VibrateMaxInput"]);
    ShockMaxInput.value = parseInt(Maindata["ShockMaxInput"]);
    isEnabled.checked = Maindata.isEnabled;
    SEnabled.checked = Maindata.SEnabled;
    VEnabled.checked = Maindata.VEnabled;

    updateTitle(" ");
  } else if (currentJsonPage == 3 && subPage != "") {
    if (subPage == "vibe") {
      const data = await requestJsonData(vibeFile);
      buildInputs(data);
      updateTitle("Vibrate Data");
    }
    if (subPage == "shock") {
      const data = await requestJsonData(shockFile);
      buildInputs(data);
      updateTitle("Shock Data");
    }
  } else {
    document.getElementById("ShookDevice").style = "display: none";

    const data = await requestJsonData(file);
    buildInputs(data);
    updateTitle();
  }
}

function updateTitle(override = "") {
  const title = document.getElementById("title");
  if (override !== "") {
    title.textContent = override;
  } else {
    title.textContent = currentFile
      .replace("data", "Data ")
      .replace(".json", "")
      .replace("", "");
  }
}
function buildInputs(data, parentKey = "", parentContainer, level = 0) {
  const container = parentContainer || document.getElementById("json-data");

  for (const key in data) {
    const value = data[key];
    if (typeof value === "object") {
      if (
        parentKey === "" &&
        (typeof data.Amount == "undefined" ||
          typeof data.Duration == "undefined")
      ) {
        if (alternator == 1) {
          alternator = 2;
          bgcolor = "bg-gray-800";
        } else {
          alternator = 1;
          bgcolor = "bg-gray-900";
        }
      }
      const childContainer2 = document.createElement("div");
      childContainer2.className = "flex w-full " + bgcolor;
      const header =
        parentKey === ""
          ? document.createElement("h3")
          : document.createElement("h4");

      const arrow = document.createElement("span");
      header.textContent = key;
      header.className =
        parentKey === ""
          ? "text-xl font-bold pb-4 pl-2 pt-2 w-full " + bgcolor
          : "text-lg font-bold pb-4 pl-4 w-full " + bgcolor;
      if (parentKey === "") {
        header.classList.add("cursor-pointer");
        arrow.classList.add("arrow");
        header.insertAdjacentElement("afterbegin", arrow); // Insert the arrow before the text content
      }

      childContainer2.appendChild(header);
      container.appendChild(childContainer2);
      let childContentContainer;
      if (level === 0) {
        childContentContainer = document.createElement("div");
        childContentContainer.classList.add("hidden");
        childContentContainer.className = "input-group " + bgcolor;

        header.addEventListener("click", () => {
          childContentContainer.classList.toggle("hidden");
          arrow.classList.toggle("arrow-down");
        });
        container.appendChild(childContentContainer);
      }

      const childContainer = document.createElement("div");
      childContainer.className = "flex flex-wrap " + bgcolor;

      if (level === 0) {
        childContentContainer.appendChild(childContainer);
      } else {
        container.appendChild(childContainer);
      }

      buildInputs(
        value,
        parentKey ? `${parentKey}.${key}` : key,
        childContainer,
        level + 1
      );
    } else {
      const div = document.createElement("div");
      div.className = "input-group flex mb-4 grid-4 pl-4 pr-2" + bgcolor;
      const label = document.createElement("label");
      label.textContent = `${key}:`;
      label.className = "inline-block align-middle px-3 py-2 w-24 " + bgcolor;
      div.appendChild(label);
      if (key === "FunScript") {
        // Create elements
        //const div = document.createElement("div");
        const labelSwitch = document.createElement("label");
        const input = document.createElement("input");
        const span = document.createElement("span");

        labelSwitch.className = "switch";
        input.type = "checkbox";
        input.id = `${parentKey}.${key}`;
        input.checked = value;
        span.className = "slider round";
        labelSwitch.appendChild(input);
        labelSwitch.appendChild(span);
        div.appendChild(labelSwitch);
        if (level === 0) {
          container.lastChild.appendChild(div);
        } else {
          container.appendChild(div);
        }
      } else {
        const input = document.createElement("input");
        input.type = "number";
        input.id = `${parentKey}.${key}`;
        input.value = value;
        input.className = "bg-gray-700 rounded-l-lg px-3 py-2 custom-input";
        input.style.width = "150px";
        if (key === "Amount") {
          input.min = 0;
          input.max = 100;
        } else if (key === "Duration") {
          input.min = 0;
          input.max = 30000;
        } else if (key === "low") {
          input.min = 0;
          input.max = 100;
        } else if (key === "medium") {
          input.min = 0;
          input.max = 100;
        } else if (key === "high") {
          input.min = 0;
          input.max = 100;
        } else if (key === "max") {
          input.min = 0;
          input.max = 100;
        }
        div.appendChild(input);

        // Add the buttons container div
        const buttonsContainer = document.createElement("div");
        buttonsContainer.className = "flex flex-col";

        // Add the increment button
        const incrementButton = document.createElement("button");
        incrementButton.textContent = "+";
        incrementButton.className =
          "bg-blue-600 hover:bg-blue-700 text-white w-12 h-full rounded-tr-lg focus:outline-none";
        incrementButton.onmousedown = () => startIncrement(input);
        incrementButton.onmouseup = stopIncrement;
        incrementButton.onmouseleave = stopIncrement;
        buttonsContainer.appendChild(incrementButton);

        // Add the decrement button
        const decrementButton = document.createElement("button");
        decrementButton.textContent = "-";
        decrementButton.className =
          "bg-blue-600 hover:bg-blue-700 text-white w-12 h-full rounded-br-lg focus:outline-none";
        decrementButton.onmousedown = () => startDecrement(input);
        decrementButton.onmouseup = stopDecrement;
        decrementButton.onmouseleave = stopDecrement;
        buttonsContainer.appendChild(decrementButton);

        // Append the buttons container to the div
        div.appendChild(buttonsContainer);

        if (level === 0) {
          container.lastChild.appendChild(div);
        } else {
          container.appendChild(div);
        }
      }
    }
  }
}

function msgToMain(type, message) {
  let messagejson = {
    type: "message-from-render",
    arg: {
      type: type,
      message: message,
    },
  };
  socket.send(JSON.stringify(messagejson));
}

function setTabsColorPY(Button) {
  // Get all the buttons inside sub-nav-shook and sub-nav-shook-2
  const buttons = document.querySelectorAll(
    "#sub-nav-shook button, #sub-nav-shook-2 button"
  );

  // Change the color of all buttons to blue-600
  buttons.forEach((btn) => {
    btn.classList.remove("bg-green-600");
    btn.classList.add("bg-blue-600");
  });

  // Change the color of the clicked button to green
  const clickedButton = document.getElementById(Button);
  clickedButton.classList.remove("bg-blue-600");
  clickedButton.classList.add("bg-green-600");
}

function setTabsColorIntiface(Button) {
  // Get all the buttons inside sub-nav
  const buttons = document.querySelectorAll("#sub-nav button");

  // Change the color of all buttons to blue-600
  buttons.forEach((btn) => {
    btn.classList.remove("bg-green-600");
    btn.classList.add("bg-blue-600");
  });

  // Change the color of the clicked button to green
  const clickedButton = document.getElementById(Button);
  clickedButton.classList.remove("bg-blue-600");
  clickedButton.classList.add("bg-green-600");
}

function setNavColor(Button) {
  // Get all the buttons inside sub-nav
  const buttons = document.querySelectorAll("#nav button");

  // Change the color of all buttons to blue-600
  buttons.forEach((btn) => {
    btn.classList.remove("bg-gray-600");
    btn.classList.add("bg-gray-700");
  });

  // Change the color of the clicked button to green
  const clickedButton = document.getElementById(Button);
  clickedButton.classList.remove("bg-gray-700");
  clickedButton.classList.add("bg-gray-600");
}

function updateFloatTitle(title2 = "") {
  const title = document.getElementById("moveingheader-title");
  title.textContent = title2;
}

function updateFloatSubTitle(title2 = "") {
  const title = document.getElementById("moveingheader-subtitle");
  title.textContent = title2;
}

let interval;
function stopIncrement() {
  clearInterval(interval);
}
function stopDecrement() {
  clearInterval(interval);
}
function startIncrement(input) {
  const maxValue = parseInt(input.getAttribute("max"));
  interval = setInterval(() => {
    const currentValue = parseInt(input.value);
    if (currentValue < maxValue) {
      input.value = currentValue + 1;
    }
  }, 60);
}

function startDecrement(input) {
  const minValue = parseInt(input.getAttribute("min"));
  interval = setInterval(() => {
    const currentValue = parseInt(input.value);
    if (currentValue > minValue) {
      input.value = currentValue - 1;
    }
  }, 60);
}

init();

function showSection(sectionId) {
  PageName = sectionId;
  const sectionIds = [
    "header",
    "about",
    "home",
    "plug-settings",
    "local-settings",
    "json-page",
    "logs-page",
  ];

  sectionIds.forEach((id) => {
    const section = document.getElementById(id);
    if (section) {
      section.style.display = id === sectionId ? "block" : "none";
    }
  });

  if (sectionId === "plug-settings") {
    loadPlugSettings();
  }
  if (sectionId === "local-settings") {
    loadLocalSettings();
  }
}
function showHomePage() {
  showSection("home");
}
function showJsonPage() {
  showSection("json-page");
}
function showAboutPage() {
  showSection("about");
}
function showPlugSettingsPage() {
  showSection("plug-settings");
}
function showLocalSettingsPage() {
  showSection("local-settings");
}
function showLogsPage() {
  showSection("logs-page");
  loadLogs();
}

async function saveSettings() {
  const settings = {
    Intiface: {
      Enabled: document.getElementById("IntifaceEnabled").checked,
    },
    xToy: {
      Enabled: document.getElementById("xToyEnabled").checked,
    },
    Local2B: {
      Enabled: document.getElementById("Local2BEnabled").checked,
      Local2BIPInput: document.getElementById("Local2BIPInput").value,
      Local2BPortInput: document.getElementById("Local2BPortInput").value,
    },
    PiShock: {
      Enabled: document.getElementById("PiShockEnabled").checked,
      Username: document.getElementById("PiShockUsername").value,
      APIKey: document.getElementById("PiShockAPIKey").value,
    },
  };

  updateSwitches();

  socket.send(
    JSON.stringify({
      type: "write-json",
      file: "settings.json",
      json: settings,
    })
  );

  // alert("Settings saved.");
  addLogEntry("-- Saved Main Page --");
}

async function loadSettings() {
  const data = await requestJsonData("settings.json");
  const PIdata = await requestJsonData("allpi.json");

  console.log("Settings data:", data);
  console.log("PI data:", PIdata);
  for (const id in PIdata) {
    const value = PIdata[id];
    const div = document.getElementById(`pi-${id}`);

    if (value) {
      div.classList.remove("bg-red-700");
      div.classList.add("bg-green-700");
    } else {
      div.classList.remove("bg-green-700");
      div.classList.add("bg-red-700");
    }
  }

  // Loop through the sections and fields of the settings data
  for (const section in data) {
    for (const field in data[section]) {
      const inputId = `${section}${field.replace(/ /g, "")}`; // Remove spaces from field names
      const input = document.getElementById(inputId);
      if (input) {
        if (input.type === "checkbox") {
          input.checked = data[section][field];
        } else {
          input.value = data[section][field];
        }
      }
    }
  }
  updateSwitches();
}

function updateSwitches() {
  const label = document.querySelector('label[for="PiShockEnabled"]');
  const label2 = document.querySelector('label[for="IntifaceEnabled"]');
  if (document.getElementById("IntifaceEnabled").checked) {
    label2.textContent = "Enabled";
  } else {
    label2.textContent = "Disabled";
  }
  if (document.getElementById("PiShockEnabled").checked) {
    label.textContent = "Enabled";
  } else {
    label.textContent = "Disabled";
  }
}

async function loadPlugSettings() {
  // console.log("Loading settings");

  const settingsData = await requestJsonData("settingspage.json");

  for (const key in settingsData) {
    // console.log("Setting " + key);
    const dropdown = document.getElementById(key);
    const settingValue = settingsData[key];
    // Check if the desired option exists in the dropdown
    const optionExists = Array.from(dropdown.options).some(
      (option) => option.value === settingValue
    );

    // Set the dropdown value based on the JSON data or select "none" if the option doesn't exist
    dropdown.value = optionExists ? settingValue : "none";
  }
}

async function loadLocalSettings() {
  const data = await requestJsonData("localsettings.json");

  for (const field in data) {
    const inputId = field.replace(/ /g, "");
    const input = document.getElementById(inputId);

    if (input) {
      input.value = data[field];
    }
  }
}

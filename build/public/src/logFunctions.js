function addLogEntry(logEntry) {
  const timestamp = new Date().toLocaleTimeString();
  let currentLogs = sessionStorage.getItem("logs") || "";
  currentLogs = `${timestamp}: ${logEntry}\n${currentLogs}`;
  sessionStorage.setItem("logs", currentLogs);
}

function loadLogs() {
  const logs = sessionStorage.getItem("logs") || "";
  const logsContent = document.getElementById("logsContent");
  logsContent.innerText = logs;
  logsContent.scrollTop = 0;
}

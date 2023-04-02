const toasts = [];
const toastQueue = [];

function showToast(
  message,
  textColor = "#fff",
  bgColor = "#333",
  duration = 6000
) {
  addLogEntry(message);
  if (toasts.length >= 6) {
    toastQueue.push({ message, textColor, bgColor, duration });
    return;
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = message;
  toast.style.color = textColor;
  toast.style.textAlign = "right";
  toast.style.overflowWrap = "break-word";
  toast.style.backgroundColor = bgColor;
  toast.style.bottom = `${toasts.length * 60 + 10}px`;
  document.body.appendChild(toast);

  toast.classList.add("show");
  toasts.push(toast);

  setTimeout(() => {
    toast.classList.remove("show");
    toasts.shift();

    setTimeout(() => {
      document.body.removeChild(toast);
      updateToastPositions();
    }, 500);

    if (toastQueue.length > 0) {
      const queuedToast = toastQueue.shift();
      showToast(
        queuedToast.message,
        queuedToast.textColor,
        queuedToast.bgColor,
        queuedToast.duration
      );
    }
  }, duration);
}

function updateToastPositions() {
  for (let i = 0; i < toasts.length; i++) {
    toasts[i].style.bottom = `${i * 60 + 10}px`;
  }
}

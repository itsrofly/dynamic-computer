import { ipcRenderer } from "electron";

ipcRenderer.on('dependencies:progress', (_event, percentage, message) => {
    const progressBar = document.getElementById('progress-bar') as HTMLDivElement
    progressBar.style.width = `${percentage}%`
    progressBar.innerText = message
})
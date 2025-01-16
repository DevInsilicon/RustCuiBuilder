const { app, BrowserWindow } = require("electron");
const path = require("path");

/**
 * Description placeholder
 *
 * @class MainApplication
 * @typedef {MainApplication}
 */
class MainApplication {
	mainWindow;
	windowInstance;

	pages = {
		main: "./Pages/MainPage/index.html",
	};

	constructor() {
		this.mainWindow = () => {
			this.windowInstance = new BrowserWindow({
				width: 800,
				height: 600,
				darkTheme: true,
				webPreferences: {
					nodeIntegration: false,
					contextIsolation: true,
					enableRemoteModule: false,
					sandbox: true,
					preload: path.join(__dirname, "./Pages/Preload/preload.js"),
				},
                autoHideMenuBar: true,
			});

			this.windowInstance.loadFile(this.pages.main);
            this.windowInstance.webContents.openDevTools();
		};

		app.whenReady().then(() => {
			this.mainWindow();
		});

		app.on("window-all-closed", () => {
			if (process.platform !== "darwin") app.quit();
		});
	}
}

module.exports = MainApplication;

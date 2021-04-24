"use strict"

const path = require('path')
const os = require('os')
const {app, BrowserWindow, Menu, globalShortcut, ipcMain, shell} = require('electron')
const imagemin = require('imagemin')
const imageminMozjpeg = require('imagemin-mozjpeg')
const imageminPngquant = require('imagemin-Pngquant')
const slash = require('slash')
const log = require('electron-log')

//Set env
process.env.NODE_ENV = 'production'       //production development

const isDev = process.env.NODE_ENV !== 'production' ? true : false
const isMac = process.platform === 'darwin' ? true : false

let mainWindow
let aboutWindow

function createMainWindow () {
    mainWindow = new BrowserWindow({
        width: isDev ? 800 : 500,
        height: 600,
        title: 'ImageShrink',
        icon: `${__dirname}/assets/Icon_256x256.png`,
        resizable: isDev ? true : false,
        webPreferences: {               //https://www.electronjs.org/docs/tutorial/context-isolation
            //contextIsolation: true,
            nodeIntegration: true,
          },
        backgroundColor: 'white',           
    })

    if(isDev) {
        mainWindow.webContents.toggleDevTools()
    }

    //console.log(mainWindow.resizable)
    //mainWindow.loadURL(`file://${__dirname}/app/index.html`)      this would work too
    mainWindow.loadFile('./app/index.html')
}

function createAboutWindow () {
    aboutWindow = new BrowserWindow({
        width: 300,
        height: 300,
        title: 'About ImageShrink',
        icon: `${__dirname}/assets/Icon_256x256.png`,
        resizable: false,
        backgroundColor: 'white',          
    })
    aboutWindow.loadFile('./app/about.html')
}

app.on('ready', () => {
    createMainWindow()

    const mainMenu = Menu.buildFromTemplate(menu)
    Menu.setApplicationMenu(mainMenu)

    //-------------those are in the main menu now
    //globalShortcut.register('CmdOrCtrl+R', () => {mainWindow.reload()})
    //globalShortcut.register(isMac? 'Command+Alt+I' : 'Ctrl+Shift+I', () => {mainWindow.toggleDevTools()})

    mainWindow.on('closed', () => mainWindow = null)        //'close' the variable after quiting
})

const menu = [
    ...(isMac ? [{
        label: app.name,
        submenu: [
            {
                label: 'About',
                click: createAboutWindow,    // never ever use () here!!!
            },
        ],
     }] : []),
    {
        role: 'fileMenu',
        // this is the longer version wich would also give more control over this menu-part
        /*label: 'File',
        submenu: [
            {
                label: 'Quit',
                accelerator: 'CmdOrCtrl+W', //isMac? 'Command+W' : 'Ctrl+W',
                click: () => app.quit()
            },
        ],*/
    },
    ...(!isMac ? [
        {
            label: 'Help',
            submenu: [
                {
                    //type: 'separator',
                    label: 'About',
                    click: createAboutWindow,    // never ever use () here!!!
                }
            ]
        }
    ] : []),
    ...(isDev ? [
        {
            label: 'Developer',
            submenu: [
                {role: 'reload'},
                {role: 'forcereload'},
                {type: 'separator'},
                {role: 'toggleDevTools'},
            ]
        }
    ] : []),
]

ipcMain.on('image:minimize', (e, options) => {
    options.dest = path.join(os.homedir(), 'imageshrink')
    //console.log(options)
    shrinkImage(options)
})

async function shrinkImage({imgPath, quality, dest}) {
    try {
        const pngQuality = quality/100

        const files = await imagemin([slash(imgPath)], {
            destination: dest,
            plugins: [
                imageminMozjpeg({quality}),
                imageminPngquant({
                    quality: [pngQuality, pngQuality]
                }),
            ]
        })

        //console.log(files)
        log.info(files)

        shell.openPath(dest)

        mainWindow.webContents.send('image:done')
    } catch (err) {
        //console.log(err)        
        log.erroe(err)
    }
}

/*if (isMac) {
    menu.unshift({role: 'appMenu'})
}*/

//---------- Mac-Specific Stuff on closing
app.on('window-all-closed', () => {
    if (!isMac) {
      app.quit()
    }
  })
  
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
})
//------------------------
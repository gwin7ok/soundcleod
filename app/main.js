'use strict'

// Handle the Squirrel.Windows install madnesss
/* eslint global-require: "off" */
if (require('electron-squirrel-startup')) { return }

const {
  app, BrowserWindow, globalShortcut, Menu
} = require('electron')
const autoUpdater = require('./auto-updater')
const contextMenu = require('./context-menu')
const dockMenu = require('./dock-menu')
const errorHandlers = require('./error-handlers')
const mainMenu = require('./menu')
const options = require('./options')
const SoundCloud = require('./soundcloud')
const touchBarMenu = require('./touch-bar-menu')
const windowOpenPolicy = require('./window-open-policy')
const windowState = require('electron-window-state')


// OBS edition by gwin start
var fs = require('fs')
var http = require('http')
const path = require('path');
const url = require('url');
const request = require('request')
// OBS edition by gwin end

let mainWindow = null
let aboutWindow = null

const {
  autoUpdaterBaseUrl,
  baseUrl,
  developerTools,
  launchUrl,
  profile,
  quitAfterLastWindow,
  useAutoUpdater,
  userData
} = options(process)

if (userData) {
  app.setPath('userData', userData)
} else if (profile) {
  app.setPath('userData', app.getPath('userData') + ' ' + profile)
}

let quitting = false

app.on('before-quit', () => {
  quitting = true
})

app.requestSingleInstanceLock()
app.on('ready', (event, argv) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    mainWindow.show()
    mainWindow.focus()
    const { launchUrl: loadUrl } = options(process, argv)
    if (loadUrl) {
      mainWindow.loadURL(loadUrl)
    }
  }
})

if (useAutoUpdater) { autoUpdater(autoUpdaterBaseUrl) }

windowOpenPolicy(app)

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show()
  }
})

app.on('ready', () => {
  const menu = mainMenu({ developerTools })
  Menu.setApplicationMenu(menu)

  const mainWindowState = windowState({
    defaultWidth: 1024,
    defaultHeight: 640
  })

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 640,
    minHeight: 320,
    webPreferences: {
      nodeIntegration: false,
      preload: `${__dirname}/preload.js`
    }
  })

  const soundcloud = new SoundCloud(mainWindow)
  contextMenu(mainWindow, soundcloud)
  errorHandlers(mainWindow)
  if (process.platform == 'darwin') {
    dockMenu(soundcloud)
    touchBarMenu(mainWindow, soundcloud)
  }

  mainWindowState.manage(mainWindow)

  mainWindow.on('close', (event) => {
    // Due to (probably) a bug in Spectron this prevents quitting
    // the app in tests:
    // https://github.com/electron/spectron/issues/137
    if (!quitting && !quitAfterLastWindow) {
      // Do not quit
      event.preventDefault()
      // Hide the window instead of quitting
      if (mainWindow.isFullScreen()) {
        // Avoid blank black screen when closing a fullscreen window on macOS
        // by only hiding when the leave-fullscreen animation finished.
        // See https://github.com/electron/electron/issues/6033
        mainWindow.once('leave-full-screen', () => mainWindow.hide())
        mainWindow.setFullScreen(false)
      } else {
        mainWindow.hide()
      }
    }
  })

  // Only send commands from menu accelerators when the app is not focused.
  // This avoids double-triggering actions and triggering actions during text
  // is entered into the search input or in other places.
  function isNotFocused() {
    return !mainWindow || !mainWindow.isFocused()
  }

  mainWindow.on('closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
// OBS edition by gwin start
      fs.unlink(`${app.getPath('documents')}\\soundcleod.txt`, (err) => {
        if (err) throw err;
        console.log('soundcleod.txt is Deleted');
        });
        
        
        fs.unlink(`${app.getPath('documents')}\\artwork.jpg`, (err) => {
        if (err) throw err;
        console.log('artwork.jpg is Deleted');
        });
  // OBS edition by gwin end    
    }
    mainWindow = null
  })

  globalShortcut.register('MediaPlayPause', () => {
    soundcloud.playPause()
  })

  globalShortcut.register('MediaNextTrack', () => {
    soundcloud.nextTrack()
  })

  globalShortcut.register('MediaPreviousTrack', () => {
    soundcloud.previousTrack()
  })

// added by gwin start
globalShortcut.register('MediaStop', () => {
  soundcloud.pause()
})


globalShortcut.register('CommandOrControl+Alt+P', () => {
  soundcloud.playPause()
console.log('playPause()')

})
globalShortcut.register('CommandOrControl+Alt+O', () => {
  soundcloud.pause()
console.log('pause()')

})

globalShortcut.register('CommandOrControl+Alt+R', () => {
  soundcloud.nextTrack()
console.log('nextTrack()')
})
globalShortcut.register('CommandOrControl+Alt+B', () => {
  soundcloud.previousTrack() 
console.log('previousTrack() ')
})
globalShortcut.register('Shift+Alt+End', () => {
  soundcloud.seekForward()
 console.log('seekForward()')
})
globalShortcut.register('Shift+Alt+Home', () => {
  soundcloud.seekBackward() 
 console.log('seekBackward()')
})
globalShortcut.register('Shift+Alt+PageUp', () => {
  soundcloud.volumeUp() 
 console.log('volumeUp()')
})
globalShortcut.register('Shift+Alt+PageDown', () => {
  soundcloud.volumeDown() 
 console.log('volumeDown()')
})

// added by gwin end


  menu.events.on('playPause', () => {
    if (isNotFocused()) {
      soundcloud.playPause()
    }
  })

  menu.events.on('likeUnlike', () => {
    if (isNotFocused()) {
      soundcloud.likeUnlike()
    }
  })

  menu.events.on('repost', () => {
    if (isNotFocused()) {
      soundcloud.repost()
    }
  })

  menu.events.on('nextTrack', () => {
    if (isNotFocused()) {
      soundcloud.nextTrack()
    }
  })

  menu.events.on('previousTrack', () => {
    if (isNotFocused()) {
      soundcloud.previousTrack()
    }
  })

  // The shortcuts *not* handled by SoundCloud itself
  // don't need the isNotFocused() check to avoid double triggering

  menu.events.on('home', () => {
    soundcloud.goHome()
  })

  menu.events.on('back', () => {
    soundcloud.goBack()
  })

  menu.events.on('forward', () => {
    soundcloud.goForward()
  })

  menu.events.on('main-window', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
    }
  })

  menu.events.on('about', () => {
    showAbout()
  })

  mainWindow.on('app-command', (e, cmd) => {
    switch (cmd) {
    case 'media-play':
      soundcloud.play()
      break
    case 'media-pause':
      soundcloud.pause()
      break
    case 'media-play-pause':
      soundcloud.playPause()
      break
    case 'browser-backward':
      soundcloud.goBack()
      break
    case 'browser-forward':
      soundcloud.goForward()
      break
    case 'browser-home':
      soundcloud.goHome()
      break
    default:
    }
  })

  // "You cannot require or use this module until the `ready` event of the
  // `app` module is emitted."
  /* eslint global-require: off */
  require('electron').powerMonitor.on('suspend', () => {
    soundcloud.pause()
  })

  soundcloud.on('play-new-track', ({ title, subtitle, artworkURL }) => {
    mainWindow.webContents.send('notification', { title, body: subtitle, icon: artworkURL })

        	// OBS edition by gwin start
          fs.writeFile(`${app.getPath('documents')}\\soundcleod.txt`, `　♫Artist：${subtitle}　　♫TRACK：${title}　`, (err) => {
            if (err) throw err
            console.log('soundcleod.txt saved')
                })
              
        
      
        request(
              {method: 'GET', url: artworkURL, encoding: null},
              (e, r, b) => fs.writeFileSync(`${app.getPath('documents')}\\artwork.${artworkURL.split('.').reverse()[0]}`, b, 'binary')
        );
        if (err) throw err
        console.log('artwork saved')
      
        // OBS edition by gwin end
           })

  mainWindow.webContents.once('did-start-loading', () => {
    mainWindow.setTitle('Loading soundcloud.com...')
  })

  mainWindow.loadURL(getUrl())
})

function getUrl() {
  if (launchUrl) { return launchUrl }
  if (baseUrl) { return baseUrl }
  return 'https://soundcloud.com'
}

function showAbout() {
  if (aboutWindow) {
    aboutWindow.show()
  } else {
    aboutWindow = new BrowserWindow({
      fullscreen: false,
      fullscreenable: false,
      height: 520,
      maximizable: false,
      resizable: false,
      show: false,
      skipTaskbar: true,
      width: 385,
      modal: true,
      parent: mainWindow
    })
    aboutWindow.setMenu(null)
    aboutWindow.once('ready-to-show', () => {
      aboutWindow.show()
    })
    aboutWindow.on('close', () => {
      aboutWindow = null
    })
    aboutWindow.loadURL(`file://${__dirname}/about.html`)
  }
}

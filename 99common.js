////////////////////////////////////////////////////////////////////////////////////////////////////////
// GLOBALS
var requestCounter = 0;  // Counter for tracking requests
const LogLevel = {
    NONE: 0,
    INFO: 1,
    WARNING: 2,
    ERROR: 3,
    DEBUG: 4,
};
var clientLogLevel = LogLevel.NONE;

const Domain = {
    ALERT: 'alert'
    , ORDER: 'order'
    , IOI: 'ioi'
    , HISTORY: 'history'
    , HOLDINGS: 'Holdings'
    , GUI: 'gui'
    , SYSTEM: 'system'
};
const DomainRef = {
    WTC: 'wtc'
    , VERSION: 'version'
    , PREFERENCES: 'preferences'
};

////////////////////////////////////////////////////////////////////////////////////////////////////////
// UTILITIES
function getRequestID() {
    requestCounter++;
    return `req_${Date.now()}_${requestCounter}`;
}

function getLclToday() // Todays local date at midnight
{
    let date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
}

function getLclDateTimeStr(now = new Date()) {
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    let tm = now.toLocaleString(navigator.language, options); // 09/11/25, 14:11:25
    let [date, time] = tm.split(',');
    time = time.trimStart();
    //console.log(`DATE:${date}`);
    //console.log(`TIME:${time}`);
    const [month, day, year] = date.split('/');
    const [hours, minutes, seconds] = time.split(':');
    return year.padStart(4,'0') + '-' +month.padStart(2,'0') + '-'+day.padStart(2,'0') + ' '
        + hours.padStart(2,'0') + ':' +minutes.padStart(2,'0') + ':'+seconds.padStart(2,'0') + '.' + String(now.getMilliseconds()).padStart(3, '0');
}

function getLclTimeStr(now = new Date()) {
    return String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0') + '.' +
        String(now.getMilliseconds()).padStart(3, '0');
}

// Global fn to get FIX format timestamp
// Format 20250812-14:11:28.530
function getCurrentTimestamp() {
    const now = new Date();
    return now.getUTCFullYear().toString() +
        String(now.getUTCMonth() + 1).padStart(2, '0') +
        String(now.getUTCDate()).padStart(2, '0') + '-' +
        String(now.getUTCHours()).padStart(2, '0') + ':' +
        String(now.getUTCMinutes()).padStart(2, '0') + ':' +
        String(now.getUTCSeconds()).padStart(2, '0') + '.' +
        String(now.getUTCMilliseconds()).padStart(3, '0');
}

//ISO 8601 UTC string has month-1. This returns a human readable UTC of the specified date
function getUTCDateTimeStr(now = new Date()) {
    return now.getUTCFullYear().toString() +
        String(now.getUTCMonth() + 1).padStart(2, '0') +
        String(now.getUTCDate()).padStart(2, '0') + '-' +
        String(now.getUTCHours()).padStart(2, '0') + ':' +
        String(now.getUTCMinutes()).padStart(2, '0') + ':' +
        String(now.getUTCSeconds()).padStart(2, '0') + '.' +
        String(now.getUTCMilliseconds()).padStart(3, '0');
}

// Format 20250812-14:11:28.530
// Result Date Object
function fixDateTimeToJSDate(fixDateTimeString) {
    // Example: "20231027-14:30:45.123"
    const year = fixDateTimeString.substring(0, 4);
    let month = fixDateTimeString.substring(4, 6); // Month is 0-indexed in Date constructor
    month = month - 1;
    const day = fixDateTimeString.substring(6, 8);
    const timePart = fixDateTimeString.substring(9); // "HH:MM:SS.sss"
    const [hours, minutes, secondsAndMilliseconds] = timePart.split(':');
    const [seconds, milliseconds] = secondsAndMilliseconds.split('.');
    // Reformat to ISO 8601 compatible string (e.g., "2023-10-27T14:30:45.123Z" for UTC)
    // Assuming the FIX time is UTC, append 'Z' for Zulu time (UTC)
    //const isoString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
    return new Date(Date.UTC(year, month, day, hours, minutes, seconds, milliseconds));
}

const rgbToObj = (rgbStr) => {
    const matches = rgbStr.match(/\d+/g); // string array of matches on numbers
    const numbers = matches.map(Number); // numeric array
    return { r: numbers[0], g: numbers[1], b: numbers[2] }; // create color object
}

function areColorsEqual(color1, color2) {
    //console.log(`${color1.r} = ${color2.r}`);
    //console.log(`${color1.g} = ${color2.g}`);
    //console.log(`${color1.b} = ${color2.b}`);
    return color1.r === color2.r && color1.g === color2.g && color1.b === color2.b;
}

function AddRequiredRequestKeys(_id, _method, _params) { // Add required fields
    if (_id === undefined || _id === null) {
        _id = getRequestID();
    }
    return {
        id: _id,
        timestamp: getCurrentTimestamp(),
        method: _method,
        params: _params
    };
}

function AddRequiredResponseKeys(_id, _status, _message, _params) {
    if (_id === undefined || _id === null) {
        _id = getRequestID();
    }
    if (_message !== undefined && _message !== null) {
        return {
            id: _id,
            timestamp: getCurrentTimestamp(),
            status: _status,
            message: _message,
            params: _params
        };
    } else {
        return {
            id: _id,
            timestamp: getCurrentTimestamp(),
            status: _status,
            params: _params
        };
    };
}

function SendMessage(message) {
    console.info(`[${getLclTimeStr()}] Snd: ${JSON.stringify(message)}`);
    window.chrome.webview.postMessage(JSON.stringify(message));
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
// Replace original console logs to send JSON to the RaptorClient
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleDebug = console.debug;

console.log = function (...args) {
    const text = args.map(arg => {
        if (typeof arg === 'object') {
            return `[ERROR] ${JSON.stringify(arg, null, 2)}`;
        }
        return arg;
    });
    originalConsoleInfo.call(console, text.toString());
    if (clientLogLevel !== LogLevel.NONE && clientLogLevel <= LogLevel.INFO) {
        const _params = {
            domain: 'log',
            loglevel: 'info',
            data: text.toString()
        };
        const message = AddRequiredRequestKeys(undefined, 'POST', _params);
        window.chrome.webview.postMessage(JSON.stringify(message));
    }
};
console.info = function (...args) {
    const text = args.map(arg => {
        if (typeof arg === 'object') {
            return `[ERROR] ${JSON.stringify(arg, null, 2)}`;
        }
        return `${arg}`;
    });
    originalConsoleLog.call(console, text.toString());
    if (clientLogLevel !== LogLevel.NONE && clientLogLevel <= LogLevel.INFO) {
        const _params = {
            domain: 'log',
            loglevel: 'info',
            data: text.toString()
        };
        const message = AddRequiredRequestKeys(undefined, 'POST', _params);
        window.chrome.webview.postMessage(JSON.stringify(message));
    }
};
console.warn = function (...args) {
    const text = args.map(arg => {
        if (typeof arg === 'object') {
            return `[ERROR] ${JSON.stringify(arg, null, 2)}`;
        }
        return `${arg}`;
    });
    originalConsoleWarn.call(console, text.toString());
    if (clientLogLevel !== LogLevel.NONE && clientLogLevel <= LogLevel.WARNING) {
        const _params = {
            domain: 'log',
            loglevel: 'warning',
            data: text.toString()
        };
        const message = AddRequiredRequestKeys(undefined, 'POST', _params);
        window.chrome.webview.postMessage(JSON.stringify(message));
    }
};
console.error = function (...args) {
    const text = args.map(arg => {
        if (typeof arg === 'object') {
            return `[ERROR] ${JSON.stringify(arg, null, 2)}`;
        }
        return `${arg}`;
    });
    originalConsoleError.call(console, text.toString());
    if (clientLogLevel !== LogLevel.NONE && clientLogLevel <= LogLevel.ERROR) {
        const _params = {
            domain: 'log',
            loglevel: 'error',
            data: text.toString()
        };
        const message = AddRequiredRequestKeys(undefined, 'POST', _params);
        window.chrome.webview.postMessage(JSON.stringify(message));
    }
};
console.debug = function (...args) {
    const text = args.map(arg => {
        if (typeof arg === 'object') {
            return `[ERROR] ${JSON.stringify(arg, null, 2)}`;
        }
        return `${arg}`;
    });
    originalConsoleDebug.call(console, text.toString());
    if (clientLogLevel !== LogLevel.NONE && clientLogLevel <= LogLevel.DEBUG) {
        const _params = {
            domain: 'log',
            loglevel: 'debug',
            data: text.toString()
        };
        const message = AddRequiredRequestKeys(undefined, 'POST', _params);
        window.chrome.webview.postMessage(JSON.stringify(message));
    }
};
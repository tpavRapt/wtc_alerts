var qaLogging = false;
//// define a new console
//var console=(function(oldCons){
//    return {
//        log: function(text){
//            oldCons.log(text);
//            if (qaLogging) {
//                const _params = {
//                domain: 'log',
//                logLevel: 'info',
//                data: text
//                };
//                const message = AddRequiredRequestKeys(undefined, 'POST', _params);
//                SendMessage(message);
//            }
//        },
//        info: function (text) {
//            oldCons.info(text);
//            if (qaLogging) {
//                const _params = {
//                domain: 'log',
//                logLevel: 'info',
//                data: text
//                };
//                const message = AddRequiredRequestKeys(undefined, 'POST', _params);
//                SendMessage(message);
//            }
//        },
//        warn: function (text) {
//            oldCons.warn(text);
//            if (qaLogging) {
//                const _params = {
//                domain: 'log',
//                logLevel: 'warning',
//                data: text
//                };
//                const message = AddRequiredRequestKeys(undefined, 'POST', _params);
//                SendMessage(message);
//            }
//        },
//        error: function (text) {
//            oldCons.error(text);
//            if (qaLogging) {
//                const _params = {
//                domain: 'log',
//                logLevel: 'error',
//                data: text
//                };
//                const message = AddRequiredRequestKeys(undefined, 'POST', _params);
//                SendMessage(message);
//            }
//        },
//        debug: function (text) {
//            oldCons.debug(text);
//            if (qaLogging) {
//                const _params = {
//                domain: 'log',
//                logLevel: 'debug',
//                data: text
//                };
//                const message = AddRequiredRequestKeys(undefined, 'POST', _params);
//                SendMessage(message);
//            }
//        }
//    };
//}(window.console));
//window.console = console;

// Initialize LokiJS database and collection for messages
var db = new loki('messages.db');
var messagesCollection = db.addCollection('messages');

// IndexedDB helpers
const WTC_DB_NAME = 'WTCAlertsDB';
const WTC_STORE_NAME = 'messages';
let indexedDb;

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

function getLclTime(now = new Date()) {
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

// Format 20250812-14:11:28.530
// Result 2025-08-12T14:11:28.530Z
function fixDateTimeToJSDate(fixDateTimeString) {
    // Example: "20231027-14:30:45.123"
    const year = fixDateTimeString.substring(0, 4);
    const month = fixDateTimeString.substring(4, 6); // Month is 0-indexed in Date constructor
    const day = fixDateTimeString.substring(6, 8);
    const timePart = fixDateTimeString.substring(9); // "HH:MM:SS.sss"

    // Reformat to ISO 8601 compatible string (e.g., "2023-10-27T14:30:45.123Z" for UTC)
    // Assuming the FIX time is UTC, append 'Z' for Zulu time (UTC)
    const isoString = `${year}-${month}-${day}T${timePart}Z`;
    return isoString;
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

function SendMessage(message) {
    console.info(`[${getLclTime()}] Snd: ${JSON.stringify(message)}`);
    window.chrome.webview.postMessage(JSON.stringify(message));
}

function initializeApp() {
    console.log("Page and all resources fully loaded");
    const postObj = new PostMessage(null, null, null, null, null);
    SendMessage(postObj.initRequest());

    SendMessage(postObj.listAlerts());

    SendMessage(postObj.initAlerts());
}

// Open IndexedDB and create object store if needed
function openIndexedDb() {
    return new Promise((resolve, reject) => {
        const req = window.indexedDB.open(WTC_DB_NAME, 1);
        req.onupgradeneeded = function (event) {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(WTC_STORE_NAME)) {
                db.createObjectStore(WTC_STORE_NAME, { keyPath: 'MessageID' });
            }
        };
        req.onsuccess = function (event) {
            indexedDb = event.target.result;
            resolve(indexedDb);
        };
        req.onerror = function (event) {
            reject(event.target.error);
        };
    });
}

// Insert or update a message in IndexedDB
function upsertIndexedDbMessage(msg) {
    if (!indexedDb) return;
    const tx = indexedDb.transaction([WTC_STORE_NAME], 'readwrite');
    const store = tx.objectStore(WTC_STORE_NAME);
    store.put(msg);
}

// Get a message by MessageID from IndexedDB
function getIndexedDbMessage(messageId) {
    return new Promise((resolve, reject) => {
        if (!indexedDb) return resolve(null);
        const tx = indexedDb.transaction([WTC_STORE_NAME], 'readonly');
        const store = tx.objectStore(WTC_STORE_NAME);
        const req = store.get(messageId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

let requestCounter = 0;  // Counter for tracking requests
function getRequestID() {
    requestCounter++;
    return `req_${Date.now()}_${requestCounter}`;
}


function ValidateRequestFromRaptor(message) {
    if (message.id === undefined) {
        console.error(`Raptor Request missing id.` + message);
        return false;
    } else if (message.timestamp === undefined) {
        console.error(`Raptor Request missing timestamp.` + message);
        return false;
    } else if (message.method === undefined) {
        console.error(`Raptor Request missing method.` + message);
        return false;
    } else if (message.params === undefined) {
        console.error(`Raptor Request missing params.` + message);
        return false;
    }
    if (Array.isArray(message.params))// params is array
    {
        message.params.forEach(element => {
            if (element.domain === undefined) {
                console.error(`Raptor Request missing domain from param array.` + message);
                return false;
            }
        });
    }
    else // params is object
    {
        if (message.params.domain === undefined) {
            console.error(`Raptor Request missing params domain.` + message);
            return false;
        }
    }
    return true;
}

function ValidateResponseFromRaptor(message) {
    if (message.id === undefined) {
        console.error(`Raptor Response missing id.` + message);
        return false;
    } else if (message.timestamp === undefined) {
        console.error(`Raptor Response missing timestamp.` + message);
        return false;
    } else if (message.status === undefined) {
        console.error(`Raptor Response missing status.` + message);
        return false;
    } else if (message.params === undefined) {
        console.error(`Raptor Response missing params.` + message);
        return false;
    }
    if (Array.isArray(message.params))// params is array
    {
        message.params.forEach(element => {
            if (element.domain === undefined) {
                console.error(`Raptor Response missing domain from param array.` + message);
                return false;
            }
        });
    }
    else // params is object
    {
        if (message.params.domain === undefined) {
            console.error(`Raptor Response missing params domain.` + message);
            return false;
        }
    }
    return true;
}

$(document).ready(
    function () {
        // Access row cells using this enum
        const tableCols = {
            ARROWBTN: 0,
            ID: 1,
            CLIENT: 2,
            REASON: 3,
            STATUS: 4,
            REFTIERMESSAGEID: 5,
            REFMESSAGEID: 6,
            IOISYMBOL: 7,
            MESSAGEID: 8,
            IOISHARES: 9,
            SIDE: 10,
            WHEN: 11,
            DATETIME: 12,
            HOLDINGSID: 13,
            NEWS: 14
        };
        const debugTable = false;

        let table = $('#messagesTable').DataTable({
            responsive: true,
            columnDefs: [
                {
                    className: 'details-control',
                    orderable: false,
                    data: null,
                    defaultContent: '',
                    targets: tableCols.ARROWBTN
                },
                {
                    name: 'compositeID',
                    targets: tableCols.ID,
                    visible: debugTable
                },
                {
                    name: 'Reason',
                    targets: tableCols.REASON,
                    width: '230px'
                },
                {
                    name: 'RefTierMessageID',
                    targets: tableCols.REFTIERMESSAGEID,
                    visible: debugTable
                },
                {
                    name: 'MessageID',
                    targets: tableCols.REFMESSAGEID,
                    visible: debugTable
                },
                {
                    targets: tableCols.MESSAGEID,
                    visible: debugTable
                },
                {
                    targets: tableCols.DATETIME,
                    visible: debugTable
                }
            ],
            order: [[tableCols.DATETIME, 'desc']]
        });

        function formatPrice(price) {
            let userLocale = navigator.language || 'en-US'; // Fallback to 'en-US' if navigator.language is undefined

            return isNaN(price) ? price : new Intl.NumberFormat(userLocale, {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(price);
        }

        function formatNumber(number) {
            let userLocale = navigator.language || 'en-US'; // Fallback to 'en-US' if navigator.language is undefined
            return new Intl.NumberFormat(userLocale, {
                style: 'decimal',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(number);
        }

        function formatShares(number) {
            if (isNaN(number) === true) {
                return '1';
            } else {

                let userLocale = navigator.language || 'en-US'; // Fallback to 'en-US' if navigator.language is undefined
                return new Intl.NumberFormat(userLocale, {
                    style: 'decimal',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(number);
            }
        }

        function fullSide(string) {
            const fullstring = (string === 'B') ? '<div class="badge badge-phoenix fs-10 badge-tj-success"><span class="fw-bold">BUY</span></div>' :
                '<div class="badge badge-phoenix fs-10 badge-tj-danger"><span class="fw-bold">SELL</span></div>';
            return fullstring;
        }

        function numberToPercentage(number) {
            return (number * 1).toFixed(2) + '%';
        }

        // NOT USED
        //        function loadSalesDashboard(event){
        //            let tr = $(this).closest('tr');
        //            let row = table.row(tr);
        //            let rowClient = row.data()[2];
        //            let rowSymbol = row.data()[7];
        //
        //            
        //            console.log(`Opening Sales Dashboard for client ${rowClient} and ${rowSymbol} `);
        //            const getDashboard = new PostMessage({ type: rowClient, Symbol: rowSymbol });
        //            SendMessage(receivedMessage.openFilteredDashboard());
        //            
        //            
        //        }

        // NOT USED
        //        function loadNews(event){
        //            let tr = $(this).closest('tr');
        //            let row = table.row(tr);
        //            let rowClient = row.data()[2];
        //            let rowSymbol = row.data()[7];
        //
        //            
        //            console.log(`Opening Sales Dashboard for client ${rowClient} and ${rowSymbol} `);
        //            const getDashboard = new PostMessage({ type: rowClient, Symbol: rowSymbol });
        //            SendMessage(receivedMessage.openFilteredDashboard());
        //            
        //            
        //        }

        function sideTendency(number) {
            if (number > 0) {
                tendency = ' <div class="badge badge-phoenix fs-10 badge-tj-success"><span class="fw-bold">LIKELY BUYER</span></div>';
            } else if (number < 0) {
                tendendy = ' <div class="badge badge-phoenix fs-10 badge-tj-danger"><span class="fw-bold">LIKELY SELLER</span></div>';
            } else {
                tendency = '';
            }
            return tendency;
        }

        function formatSingleField(singleField) {

            if (singleField === '13F') {
                return '<div class="badge-link fs-10 badge-tj-primary"><span class="fw-bold">13F</span></div>';
            } else if (singleField === 'H') {
                return '<div class="badge-link fs-10 badge-tj-warning"><span class="fw-bold">O-HIST</span></div>';
            } else if (singleField === 'IH') {
                return '<div class="badge-link fs-10 badge-tj-warning"><span class="fw-bold">I-HIST</span></div>';
            } else if (singleField === 'I') {
                return '<div class="badge-link fs-10 badge-tj-secondary"><span class="fw-bold">I-CROSS</span></div>';
            } else if (singleField === 'O') {
                return '<div class="badge-link fs-10 badge-tj-secondary"><span class="fw-bold">O-CROSS</span></div>';
            } else if (singleField === 'CRM') {
                return '<div class="badge-link fs-10 badge-tj-success"><span class="fw-bold">CRM</span></div>';
            } else if (singleField === 'Dirty') {
                return '<div class="badge badge-phoenix fs-10 badge-tj-warning"><span class="fw-bold">New</span></div>';
            } else if (singleField === 'Acknowledged' || singleField === 'acknowledged') {
                return '<div class="badge badge-phoenix fs-10 badge-tj-success"><span class="fw-bold">Acknowledged</span></div>';
            } else if (singleField === 'B') {
                return 'BUY';
            } else if (singleField === 'S') {
                return 'SELL';
            }

            return singleField; // Return the original field if no transformation is needed
        }

        function WTCFormat(field) {
            if (typeof field === 'string' && field.includes(',')) {
                return field
                    .split(',')
                    .map(f => f.trim())
                    .filter(f => f !== 'IH')  // Filter out 'IH' values
                    .map(f => formatSingleField(f))
                    .join(' ');
            } else {
                return field === 'IH' ? '' : formatSingleField(field);
            }
        }

        function fistUserName(field) {
            if (typeof field === 'string' && field.includes(',')) {
                return firstValue = field.split(',')[0];
            } else {
                return field;
            }
        }

        function removeMilliseconds(field) {
            let noMili = field.split('.')[0];
            return noMili;
        }

        function addAlertMessage(message, params) {
            console.log(`Adding Alert Row:` + message.id);
            let lclCompletionTime;
            let lclCompletionDateTime;
            if (params.CompletionTime !== undefined) {
                const utcCompletionDateTime = fixDateTimeToJSDate(params.CompletionTime);
                lclCompletionDateTime = new Date(utcCompletionDateTime);
                lclCompletionTime = removeMilliseconds(getLclTime(new Date(lclCompletionDateTime)));
            }
            table.row.add([
                '',                                                                                     // 0 - <button>
                message.id,                                                                             // 1 - MessageID_RefTierMessageID
                params.CompanyAlias,                                                                    // 2 - Client
                Array.isArray(params.CompanyMatchAttrib)                                                // 3 - Reason
                    ? params.CompanyMatchAttrib.map(WTCFormat).join(' ')
                    : WTCFormat(params.CompanyMatchAttrib),
                WTCFormat(params.RecordState) || 'Missing',                                             // 4 - Alert Status
                params.RefTierMessageID || 'Missing',                                                   // 5 - RefTierMessageID
                params.MessageID || 'Missing',                                                          // 6 - RefMessageID
                params.Symbol || 'Missing',                                                             // 7 - IOISymbol
                params.MessageID || 'Missing',                                                          // 8 - MessageID
                formatShares(params.IOIShares) || 'Missing',                                            // 9 - IOIShares
                WTCFormat(params.Side) || 'Missing',                                                    // 10- Opportunity
                lclCompletionTime || 'Missing',                                                         // 11- When
                lclCompletionDateTime || 'Missing',                                                     // 12- ?
                params.HoldingsRefAccountID || 'Missing',                                               // 13- HoldingsRefAccountID
                '<div class="badge-news fs-10 badge-tj-success"><span class="fw-bold">READ</span></div>'// 14- News
            ]).node().id = 'row-' + message.id;
            table.draw();
        }

        function updateAlertMessage(message, params, row) {
            console.log(`Updating Alert Row:` + message.id);
            //console.log(row.data());
            let lclCompletionTime;
            let lclCompletionDateTime;
            if (params.completionTime !== undefined) {
                const utcCompletionDateTime = fixDateTimeToJSDate(params.completionTime);
                lclCompletionDateTime = new Date(utcCompletionDateTime);
                lclCompletionTime = removeMilliseconds(getLclTime(new Date(lclCompletionDateTime)));
            }
            let rowData = row.data();
            rowData[tableCols.STATUS] = WTCFormat(params.recordState) || 'Missing';
            rowData[tableCols.WHEN] = lclCompletionTime || 'Missing';
            row.data(rowData).draw(false);
        }

        let clientLogLevel = undefined;
        let clientVersion = undefined;
        let clientUser = undefined;

        const AlertType = {
            ALERTIOI: 'AlertIOI'
            , IIOI: 'IIOI'
            , INTRADAYORDER: 'IntradayOrder'
            , HISTORICALORDER: 'HistoricalOrder'
            , HOLDINGS: 'Holdings'
        };

        const MsgType = {
            ALERT: 'Alert'
            , IOI: 'IOI'
            , FSMDCORDER: 'FSMDCOrder'
            , FSMINORDER: 'FSMInOrder'
            , HOLDINGSDATA: 'HoldingsData'
        };

        function addResponseDetails(id, params) {
            let compositeKey = id;// || (params.MessageID + '_' + params.RefTierMessageID);
            console.log(`Updating row: ${compositeKey} MsgType: ${params.MsgType}`);
            let row = table.row('#row-' + compositeKey);
            if (row.length) {
                let tr = $(row.node());
                let holdingsDetails = '';
                let ioiDetails = '';
                let orderDetails = '';
                let histDetails = '';
                let alertIOIDetails = '';

                // Redundant? Check later
                // if (domain === 'ALERT') {
                //     alertIOIDetails = getFormattedDetails(params, 'ALERT');
                // }        

                //Detaisl for IOI that generated the Alert
                if (params.MsgType === MsgType.ALERT) {
                    alertIOIDetails = getFormattedDetails(params, AlertType.ALERTIOI);
                }
                else if (params.MsgType === MsgType.IOI) {
                    //console.log('It did find domain = IOI');
                    ioiDetails = getFormattedDetails(params, AlertType.IIOI);
                }
                // Details for INTRADAY Order & Historical Order
                else if (params.MsgType === MsgType.FSMDCORDER || params.MsgType === MsgType.FSMINORDER) {
                    if (params.domain === 'order')
                        orderDetails = getFormattedDetails(params, AlertType.INTRADAYORDER);
                    if (params.domain === 'history')
                        histDetails = getFormattedDetails(params, AlertType.HISTORICALORDER);
                }
                //Details for Holdings Data
                else if (params.MsgType === MsgType.HOLDINGSDATA) {
                    holdingsDetails = getFormattedDetails(params, AlertType.HOLDINGS);
                }
                else {
                    console.error(`Unhandled MsgType ${params.MsgType} for getFormattedDetails()`);
                }

                if (!row.child.isShown()) {
                    // Show drop down for row
                    let childContent = `
                            <tr>
                                <td style="vertical-align: top;" id="alert-${compositeKey}">${alertIOIDetails}</td>    
                                <td style="vertical-align: top;" id="orders-${compositeKey}">${orderDetails}</td>
                                <td style="vertical-align: top;" id="hist-${compositeKey}">${histDetails}</td>
                                <td style="vertical-align: top;" id="ioi-${compositeKey}">${ioiDetails}</td>
                                <td style="vertical-align: top;" id="holdings-${compositeKey}">${holdingsDetails}</td>
                            </tr>
                    `;
                    row.child(childContent).show();
                    tr.addClass('shown');

                } else {
                    if (params.MsgType === MsgType.IOI) { // IIOI
                        $(`#ioi-${compositeKey}`).html(ioiDetails);
                    }
                    else if (params.MsgType === MsgType.FSMDCORDER || params.MsgType === MsgType.FSMINORDER) {
                        // Only update the Order cell
                        if (params.domain === 'order')
                            $(`#orders-${compositeKey}`).html(orderDetails); // INTRADAYORDER
                        if (params.domain === 'history')
                            $(`#hist-${compositeKey}`).html(histDetails);  // HISTORICALORDER
                    }
                    // If the row is already shown, update its content separately
                    else if (params.MsgType === MsgType.HOLDINGSDATA) { // HOLDINGS
                        // Only update the Holdings cell
                        $(`#holdings-${compositeKey}`).html(holdingsDetails);
                    }
                    else if (params.MsgType == MsgType.ALERT) {
                        ;
                    }
                    else {
                        console.error(`Unhandled MsgType ${params.MsgType} for pageopen`);
                    }
                    // if (params.MsgType === 'IOI') {
                    //     $(`#alert-${compositeKey}`).html(alertIOIDetails);
                    // }
                }
            } else {
                console.error(`Row not found for compositeKey: ${compositeKey}`);
            }
        }

        function calcPercentage(a, b) {

            if (isNaN(b) === true) {
                const na = Number(a);
                const nb = '1';
                let result = na / nb;
                return result;
            } else {
                const na = Number(a);
                const nb = Number(b);
                let result = na / nb;
                return result * 100;
            }


        }

        function findCommonElement(arr1, arr2) {
            const txt = arr1.find(element => arr2.includes(element));
            //console.log(`DATA: ${arr1} & ${arr2} = ${txt}`);
            return txt;
        }
        function findIOIAttrib(ioiattrib, list) {
            if (ioiattrib !== undefined) {
                list.forEach(element => {
                    const idx = ioiattrib.indexof(element);
                    if (idx != -1)
                        return element;
                });
            }
            return 'Missing';
        }

        function getFormattedDetails(params, alertType) {
            let lclCompletionTime;
            if (params.CompletionTime !== undefined) {
                const utcCompletionDateTime = fixDateTimeToJSDate(params.CompletionTime);
                const lclCompletionDateTime = new Date(utcCompletionDateTime);
                lclCompletionTime = removeMilliseconds(getLclTime(new Date(lclCompletionDateTime)));
            }
            let formattedDetails = '';
            console.log(`DEBUG: MsgType ${alertType} was received.`);
            if (alertType === AlertType.ALERTIOI) {
                console.log('DISPLAY: ALERTIOI');
                const fields = ['Received IOI', 'Time', 'Symbol', 'Price', 'Side', 'IOIShares', 'User'];
                const aArgs = ['AutoGenerated', 'OwnerMine'];
                const selectedData = {
                    'Received IOI': findCommonElement(params.IOIAttrib, aArgs),
                    Time: lclCompletionTime || 'Missing',
                    Symbol: params.Symbol + ` (${params.ExDestination})` || 'Missing',
                    Price: (params.OrdType === 'Market') ? params.OrdType : formatPrice(params.RefOrderPrice) || 'Market',
                    Side: fullSide(params.Side) || 'Missing',
                    IOIShares: formatShares(params.IOIShares) || 'Missing',
                    User: fistUserName(params.SourceLogonName) || 'Missing',
                };
                // Wrap in a styled div for the child row
                formattedDetails = `
                <div style="
                    background: #181b20;
                    border: 2px solid orange;
                    border-radius: 22px;
                    padding: 18px 24px 14px 24px;
                    color: #fff;
                    font-size: 1 em;
                    min-width: 240px;
                    max-width: 320px;
                    margin: 0 auto;
                    box-shadow: 0 2px 12px #0003;
                ">
                    <ul style="list-style-type: none; padding: 0; margin: 0; border-radius: 16px;">
                        <li >
                            <span style="font-weight: bold; color: orange;">Received IOI:</span>
                            <span style="margin-left: 8px;">${selectedData['Received IOI']}</span>
                        </li>
                        <li >
                            <span style="font-weight: bold; color: #fff;">Time:</span>
                            <span style="margin-left: 8px;">${selectedData['Time']}</span>
                        </li>
                        <li >
                            <span style="font-weight: bold; color: #fff;">Symbol:</span>
                            <span style="margin-left: 8px;">${selectedData['Symbol']}</span>
                        </li>
                        <li >
                            <span style="font-weight: bold; color: #fff;">Price:</span>
                            <span style="margin-left: 8px;">${selectedData['Price']}</span>
                        </li>
                        <li >
                            <span style="font-weight: bold; color: #fff;">Side:</span>
                            <span style="margin-left: 8px;">${selectedData['Side']}</span>
                        </li>
                        <li >
                            <span style="font-weight: bold; color: #fff;">IOIShares:</span>
                            <span style="margin-left: 8px;">${selectedData['IOIShares']}</span>
                        </li>
                        <li ">
                            <span style="font-weight: bold; color: #fff;">User:</span>
                            <span style="margin-left: 8px;">${selectedData['User']}</span>
                        </li>
                    </ul>
                </div>
                `;
            } else if (alertType === AlertType.IIOI) {
                //            } else if (alertType === 'IOI' || alertType === AlertType.IIOI) {
                console.log('DISPLAY: IIOI');
                const fields = ['Type', 'Time', 'Symbol', 'Price', 'Side', 'IOIShares', 'User'];
                const selectedData = {
                    Type: 'Intraday IOI' || 'Missing',
                    Time: lclCompletionTime || 'Missing',
                    Symbol: params.Symbol + ` (${params.ExDestination})` || 'Missing',
                    Price: (params.OrdType === 'Market') ? params.OrdType : formatPrice(params.RefOrderPrice) || 'Market',
                    Side: fullSide(params.Side) || 'Missing',
                    IOIShares: formatShares(params.IOIShares) || 'Missing',
                    User: fistUserName(params.SourceLogonName) || 'Missing',
                };
                formattedDetails = `
                <div style="
                    background: #181b20;
                    border: 2px solid;
                    border-radius: 22px;
                    padding: 18px 24px 14px 24px;
                    color: #fff;
                    font-size: 1em;
                    min-width: 240px;
                    max-width: 340px;
                    margin: 0 auto;
                    box-shadow: 0 2px 12px #0003;
                ">
                    <ul style="list-style-type: none; padding: 0; margin: 0; border-radius: 16px;">
                        <li>

                            <span style="font-weight: bold;">${selectedData['Type']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Time:</span>
                            <span style="margin-left: 8px;">${selectedData['Time']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Symbol:</span>
                            <span style="margin-left: 8px;">${selectedData['Symbol']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Price:</span>
                            <span style="margin-left: 8px;">${selectedData['Price']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Side:</span>
                            <span style="margin-left: 8px;">${selectedData['Side']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">IOIShares:</span>
                            <span style="margin-left: 8px;">${selectedData['IOIShares']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">User:</span>
                            <span style="margin-left: 8px;">${selectedData['User']}</span>
                        </li>
                    </ul>
                </div>
                `;
            } else if (alertType === AlertType.INTRADAYORDER) {
                console.log('DISPLAY: INTRADAYORDER');
                const fields = ['Type', 'Time', 'Symbol', 'Qty (avai/exec)', 'Price', 'Side', 'User'];
                const selectedData = {
                    Type: 'Order',
                    Time: lclCompletionTime || 'Missing',
                    Symbol: params.Symbol + ` (${params.RAIExchangeID})` || 'Missing',
                    Price: ((params.AvgPx === '0') ? formatPrice(params.AvgPx) : 'Market') || 'Missing',
                    'Qty (avai/exec)': (formatShares(params.AvailQty) + ' / ' + formatShares(params.CumQty) + ' (' + calcPercentage(params.CumQty, params.AvailQty) + '%)') || 'Missing',
                    Side: fullSide(params.Side) || 'Missing',
                    User: fistUserName(params.SourceLogonName) || 'Missing'
                };
                formattedDetails = `
                <div style="
                    background: #181b20;
                    border: 2px solid;
                    border-radius: 22px;
                    padding: 18px 24px 14px 24px;
                    color: #fff;
                    font-size: 1 em;
                    min-width: 240px;
                    max-width: 340px;
                    margin: 0 auto;
                    box-shadow: 0 2px 12px #0003;
                ">
                    <ul style="list-style-type: none; padding: 0; margin: 0; border-radius: 16px;">
                        <li style="margin-bottom: 8px; background: #2d3035;">
                            <span style="font-weight: bold;">${selectedData['Type']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Time:</span>
                            <span style="margin-left: 8px;">${selectedData['Time']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Symbol:</span>
                            <span style="margin-left: 8px;">${selectedData['Symbol']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Qty (avai/exec):</span>
                            <span style="margin-left: 8px;">${selectedData['Qty (avai/exec)']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Price:</span>
                            <span style="margin-left: 8px;">${selectedData['Price']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Side:</span>
                            <span style="margin-left: 8px;">${selectedData['Side']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">User:</span>
                            <span style="margin-left: 8px;">${selectedData['User']}</span>
                        </li>
                    </ul>
                </div>
                `;
            } else if (alertType === AlertType.HISTORICALORDER) {
                console.log('DISPLAY: HISTORICALORDER');
                const fields = ['Type', 'Time', 'Symbol', 'Qty (avai/exec)', 'Price', 'Side', 'User'];
                const selectedData = {
                    Type: 'Historical Order' + ` (${params.MsgType})`,
                    Time: lclCompletionTime || 'Missing',
                    Symbol: params.Symbol + ` (${params.RAIExchangeID})` || 'Missing',
                    Price: ((params.AvgPx === '0') ? formatPrice(params.AvgPx) : 'Market') || 'Missing',
                    'Qty (avai/exec)': (formatShares(params.OrderQty) + ' / ' + formatShares(params.CumQty) + ' (' + calcPercentage(params.CumQty, params.OrderQty) + '%)') || 'Missing',
                    Side: fullSide(params.Side) || 'Missing',
                    User: fistUserName(params.SourceLogonName) || 'Missing'
                };
                formattedDetails = `
                <div style="
                    background: #181b20;
                    border: 2px solid ;
                    border-radius: 22px;
                    padding: 18px 24px 14px 24px;
                    color: #fff;
                    font-size: 1em;
                    min-width: 240px;
                    max-width: 340px;
                    margin: 0 auto;
                    box-shadow: 0 2px 12px #0003;
                ">
                    <ul style="list-style-type: none; padding: 0; margin: 0; border-radius: 16px;">
                        <li>

                            <span style="font-weight: bold;">${selectedData['Type']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Time:</span>
                            <span style="margin-left: 8px;">${selectedData['Time']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Symbol:</span>
                            <span style="margin-left: 8px;">${selectedData['Symbol']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Qty (avai/exec):</span>
                            <span style="margin-left: 8px;">${selectedData['Qty (avai/exec)']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Price:</span>
                            <span style="margin-left: 8px;">${selectedData['Price']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Side:</span>
                            <span style="margin-left: 8px;">${selectedData['Side']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">User:</span>
                            <span style="margin-left: 8px;">${selectedData['User']}</span>
                        </li>
                    </ul>
                </div>
                `;
            } else if (alertType === AlertType.HOLDINGS) {
                console.log('DISPLAY: HOLDINGS');
                const fields = ['Type', 'Symbol', 'Exchange', 'Account', 'Shares Held', '% held', 'Delta Shares', 'Filing Date'];
                const selectedData = {
                    Type: params.MsgType || 'Missing',
                    Symbol: params.Symbol || 'Missing',
                    Exchange: params.Exchange || 'Missing',
                    Account: params.HoldingsAccount || 'Missing',
                    'Shares Held': formatNumber(params.HoldingsSharesHeld) || 'Missing',
                    '% held': numberToPercentage(params.HoldingsPercentHeld) || 'Missing',
                    'Delta Shares': formatShares(params.HoldingsSharesDelta) + sideTendency(params.HoldingsSharesDelta) || 'Missing',
                    'Filing Date': params.HoldingsDate || 'Missing'
                };

                formattedDetails = `
                <div style="
                    background: #181b20;
                    border: 2px solid ;
                    border-radius: 22px;
                    padding: 18px 24px 14px 24px;
                    color: #fff;
                    font-size: 1 em;
                    min-width: 240px;
                    max-width: 340px;
                    margin: 0 auto;
                    box-shadow: 0 2px 12px #0003;
                ">
                    <ul style="list-style-type: none; padding: 0; margin: 0; border-radius: 16px;">
                        <li style="margin-bottom: 8px; background: #2d3035;">
                            <span style="font-weight: bold; color: orange;">Type:</span>
                            <span style="margin-left: 8px;">${selectedData['Type']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Symbol:</span>
                            <span style="margin-left: 8px;">${selectedData['Symbol']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Exchange:</span>
                            <span style="margin-left: 8px;">${selectedData['Exchange']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Account:</span>
                            <span style="margin-left: 8px;">${selectedData['Account']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Shares Held:</span>
                            <span style="margin-left: 8px;">${selectedData['Shares Held']}</span>
                        </li>
                        <li">
                            <span style="font-weight: bold; color: #fff;">% held:</span>
                            <span style="margin-left: 8px;">${selectedData['% held']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Delta Shares:</span>
                            <span style="margin-left: 8px;">${selectedData['Delta Shares']}</span>
                        </li>
                        <li>
                            <span style="font-weight: bold; color: #fff;">Filing Date:</span>
                            <span style="margin-left: 8px;">${selectedData['Filing Date']}</span>
                        </li>
                    </ul>
                </div>
                `;
            } else {
                console.log(`ERROR: ALERTTYPE ${alertType} is not recognized.`);
            }
            return formattedDetails;
        }

        function handleSingleMessage(message) {
            let compositeKey;

            if (message.method !== undefined) { // Request/Instruction from Raptor to the WebView page

                if (ValidateRequestFromRaptor(message) === false) {
                    console.error(`ERROR: Invalid message received: ${JSON.stringify(message)}`);
                    return;
                }
                console.log('Received valid instruction/request message from Raptor');
                console.error(`REQUESTS HANDLED AT LATER DATE FOR THINGS SUCH AS SERVER DISCONNECT`);
            } else { // Response from Raptor for request from WebView page            
                if (ValidateResponseFromRaptor(message) === false) {
                    console.error(`ERROR: Invalid message received: ${JSON.stringify(message)}`);
                    return;
                }
                console.log('Received valid response message from Raptor');

                if (message.status && message.status === 'error') {
                    console.error(`ERROR: Status response from Raptor: ${JSON.stringify(message)}`);
                    return;
                }
                else if (message.status && message.status === 'warning') {
                    console.error(`WARNING: Status response from Raptor: ${JSON.stringify(message)}`);
                    return;
                }

                if (Array.isArray(message.params)) {
                    console.log(`Processing param array`);
                    message.params.forEach(element => {
                        processResponseFromRaptor(message, element); // Directly access the element
                    });
                } else {
                    processResponseFromRaptor(message, message.params);
                }
            }
        }

        function processResponseFromRaptor(message, params) {
            // Removes the ALERTIOI before the row is created 
            //if (message.id && message.id.toString().includes('_')) {
            //    const parts = message.id.toString().split('_');
            //    message.id = parts[0];
            //}
            console.log(`Params Domain:${params.domain} DomainRef:${params.domainRef}`);
            if (params.domain === 'alert' && params.domainRef === 'wtc') {
                console.log(`WTC Alert`);
                //if (params.RefTierMessageID===undefined) {
                //let compositeKey = message.id;
                //} else {
                //    compositeKey = message.id + '_' + params.RefTierMessageID;
                //}
                if (message.code !== undefined && message.code === 204 && message.status === 'success') // NoContent
                {
                    console.error(`Query yields no results:${message.message}`);
                    return;
                }
                if (params.recordState !== undefined && params.recordState === 'acknowledged') {
                    let row = table.row('#row-' + message.id);
                    if (row.length) {
                        updateAlertMessage(message, params, row);
                    } else {
                        console.error(`Update for non existent row ${row}`);
                    }
                    return;
                }
                if (params.MsgType === undefined) {
                    console.error(`NO MsgType!!:${message.message}`);
                    return;
                }
                let row = table.row('#row-' + message.id);
                if (row.length) {
                    addResponseDetails(message.id, params);
                } else {
                    addAlertMessage(message, params);
                    if (params.resend !== undefined && params.resend === 'no') {
                        addResponseDetails(message.id, params);
                    }
                }
            } else if (params.domain === 'alert') { // but response to a request, not a wtc gemerated alert
                console.log(`Alert response`);
            } else if (params.domain === 'system') {
                console.log(`System response`);
                if (params.domainRef === 'version') {
                    document.title = `Quick Who-To-Call v${params.version} Usr:${params.name} | O-HIST = Historical Order | 13F = Holdings Data | I-CROSS = Intraday IOIs  | O-CROSS = Intraday Order`
                    if (params.qaLogging !== undefined && params.qaLogging === "yes")
                        qaLogging = true;
                    else
                        qaLogging = false;
                }
            } else if (params.domain === 'order') {
                console.log(`Order response`);
                if (params.MsgType === undefined) {
                    console.warn(`NO DATA:${message.message}`);
                    return;
                }
                let row = table.row('#row-' + message.id);
                if (row.length) {
                    addResponseDetails(message.id, params);
                }
            } else if (params.domain === 'history') {
                console.log(`History response`);
                if (params.MsgType === undefined) {
                    console.warn(`NO DATA:${message.message}`);
                    return;
                }
                let row = table.row('#row-' + message.id);
                if (row.length) {
                    addResponseDetails(message.id, params);
                }
            } else if (params.domain === 'ioi') {
                console.log(`IOI response`);
                if (params.MsgType === undefined) {
                    console.warn(`NO DATA:${message.message}`);
                    return;
                }
                let row = table.row('#row-' + message.id);
                if (row.length) {
                    addResponseDetails(message.id, params);
                }
            } else if (params.domain === 'gui') {
                console.log(`GUI response`);
            } else {
                console.error(`Domain not handled:` + params.domain);
            }
        }

        // Entry point for message in from Raptor
        function handleMessage(event) {
            if (event.data.length > 0) {
                let messages = JSON.parse(event.data);
                console.log(`\n[${getLclTime()}]`);

                // --- LokiJS: Save messages to DB ---
                if (Array.isArray(messages)) {
                    messages.forEach(msg => {
                        console.info(`[${getLclTime()}] Rcv: ${JSON.stringify(msg)}`);
                        messagesCollection.insert(msg);
                        upsertIndexedDbMessage(msg);
                        handleSingleMessage(msg)
                    });
                } else {
                    console.info(`[${getLclTime()}] Rcv: ${JSON.stringify(messages)}`);
                    messagesCollection.insert(messages);
                    upsertIndexedDbMessage(messages);
                    handleSingleMessage(messages)
                }
            }
        }

        // Acknowledge receipt of message from RaptorClient
        //        function ackMsg(compositeKey, params) {
        //            const _params = {
        //                domain: params.domain,
        //                domainRef: params.domainRef,
        //            };
        //            const ackMessage = AddRequiredResponseKeys(undefined, 'success', 'ack', _params);
        //            console.log(`Acknowledging compositeKey: ${compositeKey}`);
        //            SendMessage(ackMessage);
        //        }

        // User Acknowledgement of WTC alert from RaptorClient
        function userAckAlert(compositeKey, RecordState) {//, RefTierMessageID) {
            const parts = compositeKey.toString().split('_');
            const _params = {
                domain: 'alert',
                domainRef: 'wtc',
                refMessageId: parts[0],
                refTierMessageID: parts[1]
                //messageId: compositeKey.split('_')[0],
                //RefTierMessageID: RefTierMessageID
            };
            const userAckMessage = AddRequiredRequestKeys(compositeKey, 'PUT', _params);
            if (RecordState.includes('Acknowledged')) {
                console.log('Alert already Acknowledged.');
            } else {
                console.log(`User Acknowledging alert for compositeKey: ${compositeKey} with RecordState: ${RecordState}`);
                SendMessage(userAckMessage);
            }
        }

        // User clicked on blue arrow to drop down details of alert
        $('#messagesTable tbody').on('click', 'td.details-control', function () {
            let tr = $(this).closest('tr');
            let row = table.row(tr);
            let compositeKey = row.data()[tableCols.ID];
            let reason = row.data()[tableCols.REASON];
            let RecordState = row.data()[tableCols.STATUS];
            let RefTierMessageID = row.data()[tableCols.REFTIERMESSAGEID];
            let Symbol = row.data()[tableCols.IOISYMBOL];
            let side = row.data()[tableCols.SIDE];
            let holdingsID = row.data()[tableCols.HOLDINGSID];
            console.log(`ROW:${row.data()}`);
            let bRunLookups = false;
            if (row.child.isShown()) {
                //let childRowElement = row.child(); // child row's DOM element
                //if (childRowElement.length > 0) {
                //    let elementToUpdate = childRowElement.find(`#alert-${compositeKey}`)[0];
                //    if (elementToUpdate !== undefined) {
                //        //let txt = childRowElement.text();
                //        let myId = elementToUpdate.id;
                //        if (document.getElementById(myId).getElementsByTagName('div')[0] !== undefined) {
                //            const computedStyle = window.getComputedStyle(document.getElementById(myId).getElementsByTagName('div')[0], "")
                //            let clr = computedStyle.borderColor;
                //            //console.log(`MYID:${myId}`);
                //            //console.log(`DATA:${txt}`);
                //            //console.log(`COLR:${clr}`);
                //            let myOrange = { r: 255, g: 165, b: 0 };
                //            let myColor = rgbToObj(clr);
                //            //console.log(`OBJ:${JSON.stringify(myColor)}`);
                //            if (areColorsEqual(myColor, myOrange)) {
                //                //console.log(`Found ORANGE`);
                //                //User acknowledges the alert
                //                bRunLookups = true;
                //                let childContent = `
                //                <tr>
                //                    <td style="vertical-align: top;" id="alert-${compositeKey}"></td>    
                //                    <td style="vertical-align: top;" id="orders-${compositeKey}"></td>
                //                    <td style="vertical-align: top;" id="hist-${compositeKey}"></td>
                //                    <td style="vertical-align: top;" id="ioi-${compositeKey}"></td>
                //                    <td style="vertical-align: top;" id="holdings-${compositeKey}"></td>
                //                </tr>
                //                `;
                //                row.child(childContent);
                //            } else {
                //                //console.log(`NOT ORANGE`);
                //            }
                //        }
                //    }
                //} else {
                //    console.log(`No child!`);
                //}
                if (!bRunLookups) {
                    row.child.hide();
                    tr.removeClass('shown');
                }
            }
            else {
            //if (bRunLookups) {
                //User acknowledges the alert
                userAckAlert(compositeKey, RecordState);//, RefTierMessageID);

                ///Retrieves the IOI that generated the Alert
                //console.log(`Sending request for ALERTED IOI for ${compositeKey.split('_')[0]}`);
                const postObj = new PostMessage(compositeKey, 'IOI');
                SendMessage(postObj.retrieveMatchIoiById());

                // Send out a bunch or requests based on the reason
                // Options are 13F, I, H, O, IH for now
                if (reason.includes('I-CROSS')) {
                    const postObj = new PostMessage(compositeKey, 'IOI', side, Symbol);
                    SendMessage(postObj.retrieveIntradayIOIDetail());
                }
                if (reason.includes('13F')) {
                    const postObj = new PostMessage(compositeKey, 'HOLDINGS', side, Symbol, holdingsID);
                    SendMessage(postObj.retrieveHoldingsDetail());
                }
                if (reason.includes('O-CROSS')) {
                    const postObj = new PostMessage(compositeKey, 'FSMDCOrder', side, Symbol, holdingsID);
                    SendMessage(postObj.retrieveOrderDetail());
                }
                if (reason.includes('O-HIST')) {
                    const postObj = new PostMessage(compositeKey, 'HIST', side, Symbol);
                    SendMessage(postObj.retrieveHistoryORderDetail());
                }
                if (reason.includes('I-HIST')) {
                    const postObj = new PostMessage(compositeKey, 'HIST', side, Symbol);
                    SendMessage(postObj.retrieveHistoryIOIDetail());
                }
            }
        });

        // Reason column
        $('#messagesTable tbody').on('click', '.badge-link', function () {
            let tr = $(this).closest('tr');
            let row = table.row(tr);
            let rowClient = row.data()[tableCols.CLIENT];
            let rowSymbol = row.data()[tableCols.IOISYMBOL];
            let compositeKey = row.data()[tableCols.ID];

            console.log(`Opening Sales Dashboard for client ${rowClient} and ${rowSymbol} `);
            const postObj = new PostMessage(compositeKey, rowClient, null, rowSymbol, null);
            SendMessage(postObj.openFilteredDashboard());

        });

        // News column
        $('#messagesTable tbody').on('click', '.badge-news', function () {
            let tr = $(this).closest('tr');
            let row = table.row(tr);
            let rowClient = row.data()[tableCols.CLIENT];
            let rowSymbol = row.data()[tableCols.IOISYMBOL];
            let compositeKey = row.data()[tableCols.ID];

            console.info(`Opening news ${rowClient} and ${rowSymbol} `);
            const postObj = new PostMessage(compositeKey, null, null, rowSymbol, null);
            SendMessage(postObj.loadFilteredNews());

        });

        if (window.chrome && window.chrome.webview) {
            window.chrome.webview.addEventListener('message', handleMessage);
            initializeApp();
        } else {
            console.error("WebView2 environment not detected.");
        }

    } // end function() 
); // end $(document).ready
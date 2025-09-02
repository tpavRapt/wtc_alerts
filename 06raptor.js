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
    } else{
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


function ValidateRequestFromRaptor(message)
{
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

function ValidateResponseFromRaptor(message)
{
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

    $(document).ready(function() {
        var table = $('#messagesTable').DataTable({
            responsive: true,
            columnDefs: [
                {
                    className: 'details-control',
                    orderable: false,
                    data: null,
                    defaultContent: '',
                    targets: 0
                },
                {
                    name: 'compositeID',
                    targets: 1,
                    visible: false
                },
                {
                    name: 'Reason',
                    targets: 3, 
                    width: '230px'
                },
                {
                    name: 'RefTierMessageID',
                    targets: 5,
                    visible: false
                },
                {
                    name: 'MessageID',
                    targets: 6,
                    visible: false
                },
                {
                    targets: 8,
                    visible: false
                },
                {
                    targets: 12,
                    visible: false
                }
            ],
            order: [[11, 'desc']]
        });    

        function formatPrice(price) {
            var userLocale = navigator.language || 'en-US'; // Fallback to 'en-US' if navigator.language is undefined

            return isNaN(price) ? price : new Intl.NumberFormat(userLocale, {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(price);
        }

        function formatNumber(number) {
            var userLocale = navigator.language || 'en-US'; // Fallback to 'en-US' if navigator.language is undefined
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

            var userLocale = navigator.language || 'en-US'; // Fallback to 'en-US' if navigator.language is undefined
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
        function loadSalesDashboard(event){
            let tr = $(this).closest('tr');
            let row = table.row(tr);
            let rowClient = row.data()[2];
            let rowSymbol = row.data()[7];

            
            console.log(`Opening Sales Dashboard for client ${rowClient} and ${rowSymbol} `);
            const getDashboard = new PostMessage({ type: rowClient, Symbol: rowSymbol });
            SendMessage(receivedMessage.openFilteredDashboard());
            
            
        }

        // NOT USED
        function loadNews(event){
            let tr = $(this).closest('tr');
            let row = table.row(tr);
            let rowClient = row.data()[2];
            let rowSymbol = row.data()[7];

            
            console.log(`Opening Sales Dashboard for client ${rowClient} and ${rowSymbol} `);
            const getDashboard = new PostMessage({ type: rowClient, Symbol: rowSymbol });
            SendMessage(receivedMessage.openFilteredDashboard());
            
            
        }

        function sideTendency(number) {
            if (number > 0 ) {
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
            } else if (singleField === 'Acknowledged') {
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

        function fistUserName(field){
            if (typeof field === 'string' && field.includes(',')) {
                return firstValue = field.split(',')[0];
            } else {
                return field;
            }
        }

        function removeMilliseconds(field){
            let noMili = field.split('.')[0];
            return noMili;
        }

        function addAlertMessage(compositeKey, params) {
            const utcCompletionDateTime = fixDateTimeToJSDate(params.CompletionTime);
            const lclCompletionDateTime = new Date(utcCompletionDateTime);
            const lclCompletionTime = removeMilliseconds(getLclTime(new Date(lclCompletionDateTime)));
            table.row.add([
                '',                                         //<empty>
                compositeKey,                               //MessageID
                params.CompanyAlias,                        //Client
                Array.isArray(params.CompanyMatchAttrib)    // Reason
                ?  params.CompanyMatchAttrib.map(WTCFormat).join(' ') 
                : WTCFormat(params.CompanyMatchAttrib),            
                WTCFormat(params.RecordState) || 'Missing', //Alert Status
                params.RefTierMessageID || 'Missing',       //RefTierMessageID
                params.MessageID || 'Missing',              //RefMessageID
                params.Symbol || 'Missing',                 //IOISymbol
                params.MessageID || 'Missing',              //MessageID
                formatShares(params.IOIShares) || 'Missing',//IOIShares
                WTCFormat(params.Side) || 'Missing',        //Opportunity
                lclCompletionTime || 'Missing',             //When
                lclCompletionDateTime || 'Missing',         //HoldingsRefAccountID
                params.HoldingsRefAccountID || 'Missing',     //News
                '<div class="badge-news fs-10 badge-tj-success"><span class="fw-bold">READ</span></div>'
            ]).node().id = 'row-' + compositeKey;
            table.draw();
            console.log(`Adding new alert with composite key:`+compositeKey);
            //Acknowledges the alert
            ackAlert(compositeKey, params.RecordState, params.RefTierMessageID);
        }

        let clientLogLevel = undefined;
        let clientVersion = undefined;
        let clientUser = undefined;

//        function addDetails(id, params) {       
//            var compositeKey = id || (params.MessageID + '_' + params.RefTierMessageID);
//            
//            console.log(`Adding request details for compositeKey: ${compositeKey} of domain: ${params.domain}`);    
//
//            switch (params.domain) {    
//                case 'alert':
//                    var row = table.row('#row-' + compositeKey);    
//                    if (row.length) {
//                        var tr = $(row.node());
//                        let holdingsDetails = '';
//                        let ioiDetails = '';
//                        let orderDetails = '';
//                        let histDetails = '';
//                        let alertIOIDetails = '';
//
//                        // Redundant? Check later
//                        // if (domain === 'ALERT') {
//                        //     alertIOIDetails = getFormattedDetails(params, 'ALERT');
//                        // }        
//                        
//                        //Details for Holdings Data
//                        if (params.MsgType === MsgType.HOLDINGSDATA) {
//                            holdingsDetails = getFormattedDetails(params, AlertType.HOLDINGS);
//                        }
//                        // Details for INTRADAY Order
//                        else if (params.MsgType === MsgType.FSMDCORDER) {
//                            orderDetails = getFormattedDetails(params, AlertType.INTRADAYORDER);
//                            histDetails = getFormattedDetails(params, AlertType.HISTORICALORDER);
//                        }
//                        // Details for teh Historical Order
//                        else if (params.MsgType === MsgType.FSMINORDER) {
//                            histDetails = getFormattedDetails(params, AlertType.HISTORICALORDER);
//                        }            
//                        //Detaisl for IOI that generated the Alert
//                        else if (params.MsgType === MsgType.ALERT) {
//                            alertIOIDetails = getFormattedDetails(params, AlertType.ALERTIOI);
//                        }
//                        else if (params.MsgType === MsgType.IOI) {
//                            //console.log('It did find domain = IOI');
//                            ioiDetails = getFormattedDetails(params, AlertType.IIOI);
//                        }
//                        else
//                        {
//                            console.error(`Unhandled MsgType ${params.MsgType} for getFormattedDetails()`);
//                        }
//
//                        if (!row.child.isShown()) {
//                            let childContent = `
//                                    <tr>
//                                        <td style="vertical-align: top;" id="alert-${compositeKey}">${alertIOIDetails}</td>    
//                                        <td style="vertical-align: top;" id="orders-${compositeKey}">${orderDetails}</td>
//                                        <td style="vertical-align: top;" id="hist-${compositeKey}">${histDetails}</td>
//                                        <td style="vertical-align: top;" id="ioi-${compositeKey}">${ioiDetails}</td>
//                                        <td style="vertical-align: top;" id="holdings-${compositeKey}">${holdingsDetails}</td>
//                                    </tr>
//                            `;
//                            row.child(childContent).show();
//                            tr.addClass('shown');
//                
//                        } else {
//                            // If the row is already shown, update its content separately
//                            if (params.MsgType === MsgType.HOLDINGSDATA) {
//                                // Only update the Holdings cell
//                                $(`#holdings-${compositeKey}`).html(holdingsDetails);
//                            }
//                            else if (params.MsgType === MsgType.FSMDCORDER) {
//                                // Only update the Order cell
//                                $(`#orders-${compositeKey}`).html(orderDetails);
//                                $(`#hist-${compositeKey}`).html(histDetails);
//                            }
//                            else if (params.MsgType === MsgType.FSMINORDER) {
//                                // Only update the History cell
//                                $(`#hist-${compositeKey}`).html(histDetails);
//                            }                
//                            else if (params.MsgType === MsgType.IOI) {
//                                $(`#ioi-${compositeKey}`).html(ioiDetails);
//                            }
//                            else
//                            {
//                                console.error(`Unhandled MsgType ${params.MsgType} for pageopen`);
//                            }
//                            // if (params.MsgType === 'IOI') {
//                            //     $(`#alert-${compositeKey}`).html(alertIOIDetails);
//                            // }
//                        }
//                    } else {
//                        console.error(`Row not found for compositeKey: ${compositeKey}`);
//                    }
//                break;
//                case `gui`:
//                    if (params.domainRef === 'preferences') {
//                        clientLogLevel = params.logLevel;
//                        clientVersion = params.clientSWVersion;
//                        clientUser = params.name;
//                        console.info("Obtained version and log level info from Raptor")
//                    }
//                break;
//                default:
//                    console.error(`ERROR: Unhandled domain ${params.domain} for message with compositeKey: ${compositeKey}`);
//                    return;
//            }   
//        }

        const AlertType = {
             ALERTIOI: 'AlertIOI'
            ,IIOI: 'IIOI'
            ,INTRADAYORDER: 'IntradayOrder'
            ,HISTORICALORDER: 'HistoricalOrder'
            ,HOLDINGS: 'Holdings'
        };

        const MsgType = {
            ALERT: 'Alert'
            ,IOI:'IOI'
            ,FSMDCORDER:'FSMDCOrder'
            ,FSMINORDER:'FSMInOrder'
            ,HOLDINGSDATA:'HoldingsData'
        };

        function addResponseDetails(id, params) {       
            var compositeKey = id || (params.MessageID + '_' + params.RefTierMessageID);
            console.log(`Updating row: ${compositeKey} MsgType: ${params.MsgType}`);
            var row = table.row('#row-' + compositeKey);    
            if (row.length) {
                var tr = $(row.node());
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
                else
                {
                    console.error(`Unhandled MsgType ${params.MsgType} for getFormattedDetails()`);
                }

                if (!row.child.isShown()) {
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
                    else
                    {
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

        function calcPercentage(a, b){

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
        function findIOIAttrib(ioiattrib, list)
        {
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
            var lclCompletionTime;
            if (params.CompletionTime!==undefined)
            {
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
                    Symbol: params.Symbol + ` (${params.ExDestination})`|| 'Missing',
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
                    Symbol: params.Symbol + ` (${params.ExDestination})`|| 'Missing',
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
                    Symbol: params.Symbol + ` (${params.RAIExchangeID})`|| 'Missing',
                    Price:  ((params.AvgPx === '0') ?  formatPrice(params.AvgPx): 'Market')  || 'Missing',
                    'Qty (avai/exec)': (formatShares(params.AvailQty) + ' / ' + formatShares(params.CumQty)  + ' (' + calcPercentage(params.CumQty, params.AvailQty) + '%)') || 'Missing',
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
                    Price:  ((params.AvgPx === '0') ?  formatPrice(params.AvgPx): 'Market')  || 'Missing',
                    'Qty (avai/exec)': (formatShares(params.OrderQty) + ' / ' + formatShares(params.CumQty)  + ' (' + calcPercentage(params.CumQty, params.OrderQty) + '%)') || 'Missing',
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

//            } else if (alertType === 'FSMInOrder') {
//                console.log('WARNING: Starting INTRADAY ORDER Details - THIS MESSAGE SHOULD NOT BE HERE!!!');
//                const fields = ['Type', 'Time', 'Symbol', 'Qty (avai/exec)', 'Price', 'Side', 'User'];
//                const selectedData = {
//                    Type: (params.MsgType === 'FSMInOrder') ? 'Historical Order' : '?',
//                    Time: lclCompletionTime || 'Missing',
//                    Symbol: params.Symbol + ` (${params.RAIExchangeID})`|| 'Missing',
//                    Price:  ((params.AvgPx === '0') ?  formatPrice(params.AvgPx): 'Market')  || 'Missing',
//                    'Qty (avai/exec)': (formatShares(params.AvailQty) + ' / ' + formatShares(params.CumQty)  + ' (' + calcPercentage(params.CumQty, params.AvailQty) + '%)') || 'Missing',
//                    Side: fullSide(params.Side) || 'Missing',
//                    User: fistUserName(params.SourceLogonName) || 'Missing'
//                };
//                formattedDetails = `
//                <div style="
//                    background: #181b20;
//                    border: 2px solid ;
//                    border-radius: 22px;
//                    padding: 18px 24px 14px 24px;
//                    color: #fff;
//                    font-size: 1em;
//                    min-width: 240px;
//                    max-width: 340px;
//                    margin: 0 auto;
//                    box-shadow: 0 2px 12px #0003;
//                ">
//                    <ul style="list-style-type: none; padding: 0; margin: 0; border-radius: 16px;">
//                        <li>
//                            <span style="font-weight: bold;">${selectedData['Type']}</span>
//                        </li>
//                        <li>
//                            <span style="font-weight: bold; color: #fff;">Time:</span>
//                            <span style="margin-left: 8px;">${selectedData['Time']}</span>
//                        </li>
//                        <li>
//                            <span style="font-weight: bold; color: #fff;">Symbol:</span>
//                            <span style="margin-left: 8px;">${selectedData['Symbol']}</span>
//                        </li>
//                        <li>
//                            <span style="font-weight: bold; color: #fff;">Qty (avai/exec):</span>
//                            <span style="margin-left: 8px;">${selectedData['Qty (avai/exec)']}</span>
//                        </li>
//                        <li>
//                            <span style="font-weight: bold; color: #fff;">Price:</span>
//                            <span style="margin-left: 8px;">${selectedData['Price']}</span>
//                        </li>
//                        <li>
//                            <span style="font-weight: bold; color: #fff;">Side:</span>
//                            <span style="margin-left: 8px;">${selectedData['Side']}</span>
//                        </li>
//                        <li>
//                            <span style="font-weight: bold; color: #fff;">User:</span>
//                            <span style="margin-left: 8px;">${selectedData['User']}</span>
//                        </li>
//                    </ul>
//                </div>
//                `;
//
            } else {
                console.log(`ERROR: ALERTTYPE ${alertType} is not recognized.`);
            }    
            return formattedDetails;
        } 
        
        function updateAlertMessage(message, row, compositeKey) {
            const utcCompletionDateTime = fixDateTimeToJSDate(message.params.CompletionTime);
            const lclCompletionDateTime = new Date(utcCompletionDateTime);
            const lclCompletionTime = removeMilliseconds(getLclTime(new Date(lclCompletionDateTime)));
            row.data([
                '',
                compositeKey,
                message.params.CompanyAlias,
                Array.isArray(message.params.CompanyMatchAttrib) ? message.params.CompanyMatchAttrib.map(WTCFormat).join(' ') : WTCFormat(message.params.CompanyMatchAttrib),
                WTCFormat(message.params.RecordState) || 'Missing',
                message.params.RefTierMessageID || 'Missing',
                message.params.MessageID || 'Missing',
                message.params.Symbol || 'Missing',
                message.params.MessageID|| 'Missing',
                formatShares(message.params.IOIShares) || 'Missing',
                WTCFormat(message.params.Side) || 'Missing',
                lclCompletionTime || 'Missing',
                message.params.HoldingsRefAccountID,
                '<div class="badge-news fs-10 badge-tj-success"><span class="fw-bold">READ</span></div>'
            ]).draw(false);
            // table.order([10, 'desc']).draw();
        }

        function handleSingleMessage(message) {
            var compositeKey;

            if (message.method !== undefined) { // Request/Instruction from Raptor to the WebView page

                if (ValidateRequestFromRaptor(message) === false) {
                    console.error(`ERROR: Invalid message received: ${JSON.stringify(message)}`);
                    return;
                }
                console.log('Received valid instruction/request message from Raptor');
                console.error(`REQUESTS HANDLED AT LATER DATE FOR THINGS SUCH AS SERVER DISCONNECT`);
//                // Removes the ALERTIOI before the row is created 
//                if (message.id && message.id.toString().includes('_ALERTIOI')) {
//                    message.type = 'ALERTIOI';
//                    console.log(`Current rowId: ${message.id}`);
//                    message.id = message.id.replace('_ALERTIOI', '');
//                    console.log(`Alert IOI Detected, Added message type: ${message.type}`);
//                }
//                
//                if (!message.params.RefTierMessageID) {
//                    compositeKey = message.id;
//                } else {
//                    compositeKey = message.id + '_' + message.params.RefTierMessageID;
//                }
//
//                var row = table.row('#row-' + compositeKey);  
//                if (row.length) {
//                    if (message.params.domain === 'alert') {
//                        updateAlertMessage(message, row, compositeKey);
//                    } else if (message.params.domain !== undefined) {
//                        //console.log(`Adding details for ${message.params.MsgType} and ${message.paramsbase}`);
//                        addDetails(message.id, message.params);
//                    } else {
//                        console.error(`ERROR: params domain is undefined for message with compositeKey: ${compositeKey}`);
//                        AddRequiredResponseKeys(message.id, 'error', 'ERROR: params domain is undefined', message.params);
//                    }
//                } else {
//                    if (message.params.domain === 'alert') {
//                        addAlertMessage(message.id, message.params);
//                    } else if (message.params.domain !== undefined) {
//                        //console.log(`Adding details for ${message.params.MsgType} and ${message.paramsbase}`);
//                        addDetails(message.id, message.params);
//                    } else {
//                        console.error(`ERROR: params domain is undefined for message with compositeKey: ${compositeKey}`);
//                        AddRequiredResponseKeys(message.id, 'error', 'ERROR: params domain is undefined', message.params);
//                    }
//                }
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
            if (message.id && message.id.toString().includes('_')) {
                const parts = message.id.toString().split('_');
                message.id = parts[0];
            }
            console.log(`Params Domain:${params.domain} DomainRef:${params.domainRef}`);
            if (params.domain === 'alert' && params.domainRef === 'wtc') {
                console.log(`WTC Alert`);
                //if (params.RefTierMessageID===undefined) {
                //var compositeKey = message.id;
                //} else {
                //    compositeKey = message.id + '_' + params.RefTierMessageID;
                //}
                if (message.code !== undefined && message.code === 204 && message.status === 'success') // NoContent
                {
                    console.error(`Query yields no results:${message.message}`);
                    return;   
                }
                if (params.MsgType === undefined) {
                    console.error(`NO MsgType!!:${message.message}`);
                    return;   
                }
                var row = table.row('#row-' + message.id);  
                if (row.length) {
                    addResponseDetails(message.id, params);
                } else {
                    //var compositeKey = message.params.MessageID + '_' + message.params.RefTierMessageID;       
                    addAlertMessage(message.id, params);
                    //addDetails(message.id, message.params);
                }
            } else if (params.domain === 'alert') { // but response to a request, not a wtc gemerated alert
                console.log(`Alert response`);
            } else if (params.domain === 'system') {
                console.log(`System response`);
                if (params.domainRef === 'version')
                {
                    document.title = `Quick Who-To-Call v${params.version} Usr:${params.name} | O-HIST = Historical Order | 13F = Holdings Data | I-CROSS = Intraday IOIs  | O-CROSS = Intraday Order`
                }
            } else if (params.domain === 'order') {
                console.log(`Order response`);
                if (params.MsgType === undefined) {
                    console.warn(`NO DATA:${message.message}`);
                    return;   
                }
                var row = table.row('#row-' + message.id);  
                if (row.length) {
                    addResponseDetails(message.id, params);
                }
            } else if (params.domain === 'history') {
                console.log(`History response`);
                if (params.MsgType === undefined) {
                    console.warn(`NO DATA:${message.message}`);
                    return;   
                }
                var row = table.row('#row-' + message.id);  
                if (row.length) {
                    addResponseDetails(message.id, params);
                }
            } else if (params.domain === 'ioi') {
                console.log(`IOI response`);
                if (params.MsgType === undefined) {
                    console.warn(`NO DATA:${message.message}`);
                    return;   
                }
                var row = table.row('#row-' + message.id);  
                if (row.length) {
                    addResponseDetails(message.id, params);
                }
            } else if (params.domain === 'gui') {
                console.log(`GUI response`);
            } else {
                console.error(`Domain not handled:`+params.domain);
            }
        }

        // Entry point for message in from Raptor
        function handleMessage(event) {
            if (event.data.length > 0) {
                var messages = JSON.parse(event.data);
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

        function ackAlert(compositeKey, RecordState, RefTierMessageID) {
            const _params = {
                domain: 'alert',
                messageId: compositeKey.split('_')[0],
                RefTierMessageID: RefTierMessageID
            };
            const ackMessage = AddRequiredResponseKeys(undefined, 'success', 'ack', _params);
            //const ackMessage = {
            //    id: compositeKey.split('_')[0],
            //    timestamp: getCurrentTimestamp(),
            //    status: 'success',
            //    message: 'UPDATE',
            //    params: {
            //        domain: 'alert',
            //        messageId: compositeKey.split('_')[0],
            //        RefTierMessageID: RefTierMessageID
            //    }
            //};

            if (RecordState.includes('Acknowledged')) {
                console.log('Alert already Acknowledged.');
            } else {            
                console.log(`Acknowledging alert for compositeKey: ${compositeKey} with RecordState: ${RecordState}. JSON Sent: ${ackMessage}`);
                SendMessage(ackMessage);
            }
        }

        // User clicked on blue arrow to drop down details of alert
        $('#messagesTable tbody').on('click', 'td.details-control', function() {
            var tr = $(this).closest('tr');
            var row = table.row(tr);
            var compositeKey = row.data()[1];
            var reason = row.data()[3];
            var RecordState = row.data()[4];
            var RefTierMessageID = row.data()[5];
            var Symbol = row.data()[7];
            var side = row.data()[10];
            var holdingsID = row.data()[13];
            console.log(`ROW:${row.data()}`);
            if (row.child.isShown()) {
                row.child.hide();
                tr.removeClass('shown');

            } else {
                //Acknowledges the alert - Now done when alert comes in
                //ackAlert(compositeKey, RecordState, RefTierMessageID);

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
        $('#messagesTable tbody').on('click', '.badge-link', function() {
            let tr = $(this).closest('tr');
            let row = table.row(tr);
            let rowClient = row.data()[2];
            let rowSymbol = row.data()[7];        
            var compositeKey = row.data()[1];

            console.log(`Opening Sales Dashboard for client ${rowClient} and ${rowSymbol} `);
            const postObj = new PostMessage(compositeKey, rowClient, null, rowSymbol, null);
            SendMessage(postObj.openFilteredDashboard());        
            
        });

        // News column
        $('#messagesTable tbody').on('click', '.badge-news', function() {
            let tr = $(this).closest('tr');
            let row = table.row(tr);
            let rowClient = row.data()[2];
            let rowSymbol = row.data()[7];        
            var compositeKey = row.data()[1];

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

    }
);
